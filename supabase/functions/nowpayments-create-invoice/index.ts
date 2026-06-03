import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

// NOWPayments invoice with fiat/card support enabled.
// Uses price_currency=USD (fiat) so NOWPayments' hosted checkout shows the
// "Pay with Card (Visa/Mastercard)" option (Mercuryo/Simplex fiat-to-crypto)
// alongside direct crypto payments.

const BodySchema = z.object({
  purpose: z.enum(['topup', 'subscription', 'photo_slot']),
  amount_sar: z.number().positive().max(5000),
  payload: z.record(z.any()).optional(),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const npKey = Deno.env.get('NOWPAYMENTS_API_KEY')!

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

    const { data: inv, error: invErr } = await admin
      .from('payment_invoices')
      .insert({ user_id: userId, purpose, purpose_payload: payload ?? {}, amount_sar })
      .select()
      .single()
    if (invErr || !inv) return json({ error: invErr?.message || 'invoice_create_failed' }, 500)

    const usdAmount = Number((amount_sar * 0.2667).toFixed(2))
    const ipnUrl = `${supabaseUrl}/functions/v1/nowpayments-ipn`

    const body = {
      price_amount: usdAmount,
      price_currency: 'usd', // fiat → unlocks card payment on hosted checkout
      order_id: inv.id,
      order_description: `Jeerah ${purpose}`,
      ipn_callback_url: ipnUrl,
      success_url: `${supabaseUrl}/functions/v1/nowpayments-ipn?status=success`,
      cancel_url: `${supabaseUrl}/functions/v1/nowpayments-ipn?status=cancel`,
      is_fee_paid_by_user: true,
      // Leaving pay_currency undefined lets the buyer pick crypto OR card on the hosted page.
    }

    const npRes = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: { 'x-api-key': npKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const npData = await npRes.json()

    if (!npRes.ok || !npData?.invoice_url) {
      await admin.from('payment_invoices').update({ status: 'failed', raw_ipn: npData }).eq('id', inv.id)
      return json({ error: 'nowpayments_error', details: npData }, 502)
    }

    await admin
      .from('payment_invoices')
      .update({
        plisio_txn_id: String(npData.id ?? ''), // reuse column to store gateway txn id
        invoice_url: npData.invoice_url,
        pay_amount: usdAmount,
        pay_currency: 'USD',
      })
      .eq('id', inv.id)

    return json({
      invoice_id: inv.id,
      invoice_url: npData.invoice_url,
      txn_id: String(npData.id ?? ''),
      pay_amount: usdAmount,
      pay_currency: 'USD',
      supports_card: true,
    })
  } catch (e) {
    console.error('nowpayments-create-invoice error', e)
    return json({ error: (e as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
