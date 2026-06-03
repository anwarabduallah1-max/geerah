import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Map Plisio operation status -> our internal status
function mapStatus(s: string): 'pending' | 'confirming' | 'confirmed' | 'failed' | 'expired' {
  switch (s) {
    case 'completed':
      return 'confirmed'
    case 'pending':
    case 'pending_internal':
    case 'mismatch':
      return 'confirming'
    case 'new':
      return 'pending'
    case 'expired':
      return 'expired'
    case 'error':
    case 'cancelled':
      return 'failed'
    default:
      return 'pending'
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Plisio posts JSON when callback_url has ?json=true. It may also POST form data.
    let payload: Record<string, any> = {}
    const ct = req.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      payload = await req.json().catch(() => ({}))
    } else {
      const form = await req.formData().catch(() => null)
      if (form) form.forEach((v, k) => { payload[k] = String(v) })
    }

    const txnId = String(payload.txn_id || payload.id || '')
    const orderNumber = String(payload.order_number || '')
    if (!txnId && !orderNumber) {
      return new Response('Missing txn_id', { status: 400, headers: corsHeaders })
    }

    // Re-query Plisio for authoritative status (avoids implementing PHP-serialize verify_hash)
    const apiKey = Deno.env.get('PLISIO_API_KEY')!
    const verifyRes = await fetch(`https://api.plisio.net/api/v1/operations/${txnId}?api_key=${apiKey}`)
    const verifyData = await verifyRes.json()
    if (verifyData?.status !== 'success' || !verifyData?.data) {
      console.warn('Plisio verification failed', verifyData)
      return new Response('Verification failed', { status: 401, headers: corsHeaders })
    }

    const op = verifyData.data
    const orderId = String(op.order_number || orderNumber)
    if (!orderId) return new Response('Missing order_number', { status: 400, headers: corsHeaders })

    const newStatus = mapStatus(String(op.status))
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { error: upErr } = await admin
      .from('payment_invoices')
      .update({
        status: newStatus,
        plisio_txn_id: op.txn_id ?? txnId,
        pay_amount: op.amount ?? undefined,
        pay_currency: op.currency ?? undefined,
        raw_ipn: { callback: payload, verified: op },
      })
      .eq('id', orderId)

    if (upErr) {
      console.error('callback update error', upErr)
      return new Response('DB error', { status: 500, headers: corsHeaders })
    }

    if (newStatus === 'confirmed') {
      const { error: rpcErr } = await admin.rpc('credit_wallet_for_invoice', { p_invoice_id: orderId })
      if (rpcErr) console.error('credit_wallet_for_invoice error', rpcErr)
    }

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('plisio-callback error', e)
    return new Response('error', { status: 500, headers: corsHeaders })
  }
})
