import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// SAR -> USD (Plisio supports USD as source currency, not SAR)
const SAR_TO_USD = 1 / 3.75

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token)
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userId = claims.claims.sub
    const email = claims.claims.email as string | undefined

    const body = await req.json().catch(() => ({}))
    const amountSar = Number(body.amount_sar)
    const orderName = String(body.order_name || 'Jeerah Payment').slice(0, 120)
    const paymentType = String(body.payment_type || 'generic')

    if (!amountSar || amountSar <= 0) {
      return new Response(JSON.stringify({ error: 'invalid_amount' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const apiKey = Deno.env.get('PLISIO_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'missing_api_key' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const amountUsd = (amountSar * SAR_TO_USD).toFixed(2)
    const orderNumber = `${userId.slice(0, 8)}-${Date.now()}`

    const params = new URLSearchParams({
      source_currency: 'USD',
      source_amount: amountUsd,
      order_number: orderNumber,
      order_name: orderName,
      api_key: apiKey,
      json: 'true',
    })
    if (email) params.set('email', email)

    // Metadata for webhook
    const meta = { user_id: userId, payment_type: paymentType, amount_sar: amountSar }
    params.set('description', JSON.stringify(meta))

    const url = `https://api.plisio.net/api/v1/invoices/new?${params.toString()}`
    const res = await fetch(url)
    const data = await res.json()

    if (data?.status !== 'success') {
      return new Response(JSON.stringify({ error: 'plisio_error', details: data }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(
      JSON.stringify({
        invoice_url: data.data.invoice_url,
        txn_id: data.data.txn_id,
        order_number: orderNumber,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: 'internal', details: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
