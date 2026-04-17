// Dispatcher: finds eligible app_ratings (>=4 stars, 6-12h old) and triggers
// send-transactional-email for each. Uses email_send_log + idempotencyKey to
// avoid duplicate sends — no schema migration needed.
// Called by pg_cron every hour.
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

  // Window: rating created between 12h and 6h ago, >=4 stars
  const now = Date.now()
  const sixHoursAgo = new Date(now - 6 * 60 * 60 * 1000).toISOString()
  const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000).toISOString()

  const { data: ratings, error } = await supabase
    .from('app_ratings')
    .select('id, user_id, stars, created_at')
    .gte('stars', 4)
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
  let skipped = 0
  let failed = 0
  const results: any[] = []

  for (const row of ratings ?? []) {
    try {
      const idempotencyKey = `rating-followup-${row.id}`

      // Skip if already sent (check email_send_log)
      const { data: existing } = await supabase
        .from('email_send_log')
        .select('id, status')
        .eq('message_id', idempotencyKey)
        .limit(1)

      if (existing && existing.length > 0) {
        skipped++
        results.push({ id: row.id, status: 'skipped_already_sent' })
        continue
      }

      // Fetch profile for email + name
      if (!row.user_id) {
        skipped++
        results.push({ id: row.id, status: 'skipped_no_user' })
        continue
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name, username')
        .eq('user_id', row.user_id)
        .maybeSingle()

      const recipientEmail = profile?.email
      if (!recipientEmail) {
        skipped++
        results.push({ id: row.id, status: 'skipped_no_email' })
        continue
      }

      const name = profile?.full_name || profile?.username || undefined

      const { error: invokeError } = await supabase.functions.invoke(
        'send-transactional-email',
        {
          body: {
            templateName: 'rating-followup',
            recipientEmail,
            idempotencyKey,
            templateData: { name, stars: row.stars },
          },
        }
      )

      if (invokeError) throw invokeError

      sent++
      results.push({ id: row.id, status: 'sent' })
    } catch (err: any) {
      failed++
      console.error('Failed to send followup for rating', row.id, err)
      results.push({ id: row.id, status: 'failed', error: err.message })
    }
  }

  return new Response(
    JSON.stringify({ checked: ratings?.length ?? 0, sent, skipped, failed, results }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
