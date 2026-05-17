import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createHmac } from 'node:crypto'

// Sort keys deeply, as NOWPayments spec requires
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortDeep((value as Record<string, unknown>)[k])
        return acc
      }, {})
  }
  return value
}

function mapStatus(s: string): 'pending' | 'confirming' | 'confirmed' | 'failed' | 'expired' {
  switch (s) {
    case 'finished':
      return 'confirmed'
    case 'confirming':
    case 'confirmed': // partial confirmations
    case 'sending':
      return 'confirming'
    case 'waiting':
      return 'pending'
    case 'failed':
    case 'refunded':
      return 'failed'
    case 'expired':
      return 'expired'
    default:
      return 'pending'
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  const raw = await req.text()
  const sig = req.headers.get('x-nowpayments-sig') || ''
  const secret = Deno.env.get('NOWPAYMENTS_IPN_SECRET')!

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(raw)
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
  }

  const sorted = JSON.stringify(sortDeep(payload))
  const expected = createHmac('sha512', secret).update(sorted).digest('hex')

  if (!sig || expected !== sig) {
    console.warn('IPN signature mismatch')
    return new Response('Invalid signature', { status: 401, headers: corsHeaders })
  }

  const orderId = String(payload.order_id || '')
  const npStatus = String(payload.payment_status || '')
  if (!orderId) return new Response('Missing order_id', { status: 400, headers: corsHeaders })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const newStatus = mapStatus(npStatus)
  const { error: upErr } = await admin
    .from('payment_invoices')
    .update({
      status: newStatus,
      np_payment_id: payload.payment_id ? String(payload.payment_id) : undefined,
      pay_amount: payload.pay_amount ?? undefined,
      raw_ipn: payload,
    })
    .eq('id', orderId)

  if (upErr) {
    console.error('IPN update error', upErr)
    return new Response('DB error', { status: 500, headers: corsHeaders })
  }

  if (newStatus === 'confirmed') {
    const { error: rpcErr } = await admin.rpc('credit_wallet_for_invoice', { p_invoice_id: orderId })
    if (rpcErr) console.error('credit_wallet_for_invoice error', rpcErr)
  }

  return new Response('ok', { status: 200, headers: corsHeaders })
})
