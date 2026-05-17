import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: claims, error } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
  if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401)

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return json({ error: 'Missing id' }, 400)

  const { data, error: qErr } = await userClient
    .from('payment_invoices')
    .select('id, status, pay_address, pay_amount, pay_currency, applied_at, amount_sar, purpose')
    .eq('id', id)
    .single()
  if (qErr) return json({ error: qErr.message }, 404)
  return json(data)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
