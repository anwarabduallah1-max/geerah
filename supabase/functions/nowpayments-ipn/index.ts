import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createHmac } from 'node:crypto'

// NOWPayments IPN handler. Verifies HMAC-SHA512 signature using NOWPAYMENTS_IPN_SECRET,
// updates the matching payment_invoices row and credits the wallet on success.
function mapStatus(s: string): 'pending' | 'confirming' | 'confirmed' | 'failed' | 'expired' {
  switch (s) {
    case 'finished':
    case 'confirmed':
      return 'confirmed'
    case 'confirming':
    case 'sending':
    case 'partially_paid':
      return 'confirming'
    case 'waiting':
      return 'pending'
    case 'expired':
      return 'expired'
    case 'failed':
    case 'refunded':
      return 'failed'
    default:
      return 'pending'
  }
}

function sortedStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return JSON.stringify(obj)
  const keys = Object.keys(obj).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + sortedStringify(obj[k])).join(',') + '}'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // success/cancel browser redirect: just return a tiny HTML page
  if (req.method === 'GET') {
    return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:40px">يمكنك إغلاق هذه الصفحة الآن.</body></html>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  try {
    const raw = await req.text()
    const sig = req.headers.get('x-nowpayments-sig') || ''
    const secret = Deno.env.get('NOWPAYMENTS_IPN_SECRET')!
    const parsed = JSON.parse(raw)
    const expected = createHmac('sha512', secret).update(sortedStringify(parsed)).digest('hex')
    if (sig !== expected) {
      console.warn('NOWPayments IPN signature mismatch')
      return new Response('bad signature', { status: 401, headers: corsHeaders })
    }

    const orderId = String(parsed.order_id || '')
    if (!orderId) return new Response('missing order_id', { status: 400, headers: corsHeaders })

    const newStatus = mapStatus(String(parsed.payment_status))
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { error: upErr } = await admin
      .from('payment_invoices')
      .update({
        status: newStatus,
        pay_amount: parsed.pay_amount ?? undefined,
        pay_currency: parsed.pay_currency ?? undefined,
        raw_ipn: parsed,
      })
      .eq('id', orderId)

    if (upErr) {
      console.error('NOWPayments IPN update error', upErr)
      return new Response('db error', { status: 500, headers: corsHeaders })
    }

    if (newStatus === 'confirmed') {
      const { error: rpcErr } = await admin.rpc('credit_wallet_for_invoice', { p_invoice_id: orderId })
      if (rpcErr) console.error('credit_wallet_for_invoice error', rpcErr)
    }

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('nowpayments-ipn error', e)
    return new Response('error', { status: 500, headers: corsHeaders })
  }
})
