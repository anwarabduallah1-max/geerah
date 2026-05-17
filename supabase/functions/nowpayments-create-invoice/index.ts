import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const BodySchema = z.object({
  purpose: z.enum(['topup', 'subscription', 'photo_slot']),
  amount_sar: z.number().positive().max(5000),
  payload: z.record(z.any()).optional(),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const npApiKey = Deno.env.get('NOWPAYMENTS_API_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    )
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401)
    const userId = claimsData.claims.sub as string

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)
    const { purpose, amount_sar, payload } = parsed.data

    const admin = createClient(supabaseUrl, serviceKey)

    // 1. Create our invoice row first so we have a stable order_id
    const { data: inv, error: invErr } = await admin
      .from('payment_invoices')
      .insert({
        user_id: userId,
        purpose,
        purpose_payload: payload ?? {},
        amount_sar,
      })
      .select()
      .single()
    if (invErr || !inv) return json({ error: invErr?.message || 'invoice_create_failed' }, 500)

    const ipnUrl = `${supabaseUrl}/functions/v1/nowpayments-ipn`

    // 2. Ask NOWPayments to create the payment
    const npRes = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: { 'x-api-key': npApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price_amount: amount_sar,
        price_currency: 'sar',
        pay_currency: 'usdttrc20',
        order_id: inv.id,
        order_description: `Jeerah ${purpose}`,
        ipn_callback_url: ipnUrl,
      }),
    })

    const npData = await npRes.json()
    if (!npRes.ok) {
      await admin.from('payment_invoices').update({ status: 'failed', raw_ipn: npData }).eq('id', inv.id)
      return json({ error: 'nowpayments_error', details: npData }, 502)
    }

    await admin
      .from('payment_invoices')
      .update({
        np_payment_id: String(npData.payment_id),
        np_invoice_id: npData.invoice_id ? String(npData.invoice_id) : null,
        pay_address: npData.pay_address,
        pay_amount: npData.pay_amount,
        pay_currency: npData.pay_currency,
      })
      .eq('id', inv.id)

    return json({
      invoice_id: inv.id,
      pay_address: npData.pay_address,
      pay_amount: npData.pay_amount,
      pay_currency: npData.pay_currency,
      np_payment_id: npData.payment_id,
      expiration_estimate_date: npData.expiration_estimate_date ?? null,
    })
  } catch (e) {
    console.error('create-invoice error', e)
    return json({ error: (e as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
