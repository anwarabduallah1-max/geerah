const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const txnId = url.searchParams.get('txn_id')
    if (!txnId) {
      return new Response(JSON.stringify({ error: 'missing_txn_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const apiKey = Deno.env.get('PLISIO_API_KEY')!
    const res = await fetch(`https://api.plisio.net/api/v1/operations/${txnId}?api_key=${apiKey}`)
    const data = await res.json()

    if (data?.status !== 'success') {
      return new Response(JSON.stringify({ status: 'unknown', details: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Plisio statuses: new, pending, completed, error, expired, mismatch, cancelled
    return new Response(
      JSON.stringify({ status: data.data.status, txn_id: txnId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: 'internal', details: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
