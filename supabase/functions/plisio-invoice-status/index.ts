import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Returns the invoice status from our DB (authoritative; updated by plisio-callback).
// Also actively re-syncs with Plisio so the user doesn't have to wait for the IPN.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const plisioKey = Deno.env.get('PLISIO_API_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  // Note: We rely on RLS (via the forwarded JWT) to enforce per-user access on
  // payment_invoices. Calling getClaims here is redundant and was failing with
  // transient JWKS fetch errors ("Connection reset by peer"), which surfaced
  // as a spurious 401 to the client.

  let id: string | null = null
  try {
    const body = await req.json()
    id = body?.id ?? null
  } catch {
    id = new URL(req.url).searchParams.get('id')
  }
  if (!id) return json({ error: 'Missing id' }, 400)

  const { data: inv, error: qErr } = await userClient
    .from('payment_invoices')
    .select('id, status, invoice_url, plisio_txn_id, pay_amount, pay_currency, applied_at, amount_sar, purpose')
    .eq('id', id)
    .single()
  if (qErr) return json({ error: qErr.message }, 404)

  // If still pending/confirming, try a live Plisio sync
  if (inv.plisio_txn_id && (inv.status === 'pending' || inv.status === 'confirming')) {
    try {
      const r = await fetch(`https://api.plisio.net/api/v1/operations/${inv.plisio_txn_id}?api_key=${plisioKey}`)
      const d = await r.json()
      if (d?.status === 'success' && d?.data?.status) {
        const map: Record<string, string> = {
          completed: 'confirmed', pending: 'confirming', pending_internal: 'confirming',
          mismatch: 'confirming', new: 'pending', expired: 'expired', error: 'failed', cancelled: 'failed',
        }
        const next = map[d.data.status] || inv.status
        if (next !== inv.status) {
          const admin = createClient(supabaseUrl, serviceKey)
          await admin.from('payment_invoices').update({ status: next, raw_ipn: { polled: d.data } }).eq('id', inv.id)
          if (next === 'confirmed') {
            await admin.rpc('credit_wallet_for_invoice', { p_invoice_id: inv.id })
          }
          inv.status = next
        }
      }
    } catch (e) {
      console.warn('plisio poll failed', e)
    }
  }

  return json(inv)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
