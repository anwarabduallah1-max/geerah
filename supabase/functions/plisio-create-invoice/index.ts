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
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const plisioKey = Deno.env.get('PLISIO_API_KEY')!

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

    // Insert pending invoice row first so we have a stable order id
    const { data: inv, error: invErr } = await admin
      .from('payment_invoices')
      .insert({ user_id: userId, purpose, purpose_payload: payload ?? {}, amount_sar })
      .select()
      .single()
    if (invErr || !inv) return json({ error: invErr?.message || 'invoice_create_failed' }, 500)

    // Plisio expects fiat amount in supported fiat (USD). SAR ≈ 0.2667 USD.
    const usdAmount = Number((amount_sar * 0.2667).toFixed(2))
    const callbackUrl = `${supabaseUrl}/functions/v1/plisio-callback`

    // NOTE: we intentionally omit `currency` so Plisio's hosted invoice page renders
    // the full payment selector — including the "Pay with Card (Visa/Mastercard)"
    // option powered by Mercuryo's fiat-to-crypto gateway — alongside crypto methods.
    const params = new URLSearchParams({
      api_key: plisioKey,
      order_number: inv.id,
      order_name: `Jeerah ${purpose}`,
      source_currency: 'USD',
      source_amount: String(usdAmount),
      allow_psys_cids: 'BTC,ETH,USDT,USDT_TRX,TRX,LTC,BCH,BNB',
      allowed_payment_methods: 'crypto,card', // explicitly enable card (fiat) checkout
      fiat_gateway: 'mercuryo', // route card payments through Mercuryo
      callback_url: `${callbackUrl}?json=true`,
      email: '',
      plugin: 'jeerah',
      version: '1.0',
    })

    const npRes = await fetch(`https://api.plisio.net/api/v1/invoices/new?${params.toString()}`)
    const npData = await npRes.json()

    if (!npRes.ok || npData?.status !== 'success' || !npData?.data) {
      await admin.from('payment_invoices').update({ status: 'failed', raw_ipn: npData }).eq('id', inv.id)
      return json({ error: 'plisio_error', details: npData }, 502)
    }

    const d = npData.data
    await admin
      .from('payment_invoices')
      .update({
        plisio_txn_id: d.txn_id,
        invoice_url: d.invoice_url,
        pay_address: d.wallet_hash ?? null,
        pay_amount: d.invoice_total_sum ?? null,
        pay_currency: d.currency ?? null,
      })
      .eq('id', inv.id)

    return json({
      invoice_id: inv.id,
      invoice_url: d.invoice_url,
      txn_id: d.txn_id,
      pay_amount: d.invoice_total_sum,
      pay_currency: d.currency,
      supports_card: true,
    })
  } catch (e) {
    console.error('plisio-create-invoice error', e)
    return json({ error: (e as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
