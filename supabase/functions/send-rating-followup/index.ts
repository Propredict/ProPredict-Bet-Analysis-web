// Dispatcher: finds eligible app_ratings (>=4 stars, 6-12h old, no email sent yet)
// and triggers send-transactional-email for each. Called by pg_cron hourly.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server config error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Window: rating created between 12h and 6h ago, >=4 stars, no email yet, has email
  const now = Date.now()
  const sixHoursAgo = new Date(now - 6 * 60 * 60 * 1000).toISOString()
  const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000).toISOString()

  const { data: rows, error } = await supabase
    .from('app_ratings')
    .select('id, user_id, stars, recipient_email, created_at')
    .gte('stars', 4)
    .is('followup_email_sent_at', null)
    .not('recipient_email', 'is', null)
    .lte('created_at', sixHoursAgo)
    .gte('created_at', twelveHoursAgo)
    .limit(100)

  if (error) {
    console.error('Failed to query app_ratings', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let failed = 0
  const results: any[] = []

  for (const row of rows ?? []) {
    try {
      // Optional: fetch profile for name
      let name: string | undefined
      if (row.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('user_id', row.user_id)
          .maybeSingle()
        name = profile?.full_name || profile?.username || undefined
      }

      const idempotencyKey = `rating-followup-${row.id}`

      const { error: invokeError } = await supabase.functions.invoke(
        'send-transactional-email',
        {
          body: {
            templateName: 'rating-followup',
            recipientEmail: row.recipient_email,
            idempotencyKey,
            templateData: { name, stars: row.stars },
          },
        }
      )

      if (invokeError) throw invokeError

      // Mark as sent
      await supabase
        .from('app_ratings')
        .update({ followup_email_sent_at: new Date().toISOString() })
        .eq('id', row.id)

      sent++
      results.push({ id: row.id, status: 'sent' })
    } catch (err: any) {
      failed++
      console.error('Failed to send followup for rating', row.id, err)
      results.push({ id: row.id, status: 'failed', error: err.message })
    }
  }

  return new Response(
    JSON.stringify({ checked: rows?.length ?? 0, sent, failed, results }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
