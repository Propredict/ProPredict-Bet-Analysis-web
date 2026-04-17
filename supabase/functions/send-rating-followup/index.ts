// Dispatcher: finds eligible app_ratings (>=4 stars, 6-12h old) and triggers
// send-transactional-email for each. Uses email_send_log + idempotencyKey to
// avoid duplicate sends. Includes A/B testing on subject line + click tracking.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TEMPLATE_NAME = 'rating-followup'

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
  const trackBaseUrl = `${supabaseUrl}/functions/v1/track-email-click`

  // ── Force/test mode: ?force=true&email=foo@bar.com ──
  const url = new URL(req.url)
  const force = url.searchParams.get('force') === 'true'
  const forceEmail = url.searchParams.get('email')
  const forceStars = parseInt(url.searchParams.get('stars') || '5', 10)

  let ratings: Array<{ id: string; user_id: string | null; stars: number; created_at: string }> | null = null
  let error: any = null

  if (force && forceEmail) {
    // Look up user by email; fall back to a synthetic row if not found
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', forceEmail)
      .maybeSingle()

    ratings = [
      {
        id: crypto.randomUUID(),
        user_id: profile?.user_id ?? null,
        stars: forceStars,
        created_at: new Date().toISOString(),
      },
    ]
  } else {
    // Window: rating created between 12h and 6h ago, >=4 stars
    const now = Date.now()
    const sixHoursAgo = new Date(now - 6 * 60 * 60 * 1000).toISOString()
    const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000).toISOString()

    const res = await supabase
      .from('app_ratings')
      .select('id, user_id, stars, created_at')
      .gte('stars', 4)
      .lte('created_at', sixHoursAgo)
      .gte('created_at', twelveHoursAgo)
      .limit(100)
    ratings = res.data
    error = res.error
  }

  if (error) {
    console.error('Failed to query app_ratings', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Load active variants for this template (A/B testing)
  const { data: variants } = await supabase
    .from('email_ab_variants')
    .select('id, variant_label, subject')
    .eq('template_name', TEMPLATE_NAME)
    .eq('is_active', true)

  const activeVariants = variants ?? []

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
        .select('id')
        .eq('message_id', idempotencyKey)
        .limit(1)

      if (existing && existing.length > 0) {
        skipped++
        results.push({ id: row.id, status: 'skipped_already_sent' })
        continue
      }

      if (!row.user_id && !force) {
        skipped++
        results.push({ id: row.id, status: 'skipped_no_user' })
        continue
      }

      let recipientEmail: string | undefined
      let name: string | undefined

      if (force && forceEmail) {
        recipientEmail = forceEmail
      }

      if (row.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name, username')
          .eq('user_id', row.user_id)
          .maybeSingle()

        recipientEmail = recipientEmail || profile?.email || undefined
        name = profile?.full_name || profile?.username || undefined
      }

      if (!recipientEmail) {
        skipped++
        results.push({ id: row.id, status: 'skipped_no_email' })
        continue
      }

      // ── A/B variant selection (50/50 random per user) ──
      let variantId: string | null = null
      let subjectOverride: string | null = null
      let trackingUrl: string | undefined

      if (activeVariants.length > 0) {
        const picked =
          activeVariants[Math.floor(Math.random() * activeVariants.length)]
        variantId = picked.id
        subjectOverride = picked.subject

        // Pre-create the send row so we have an id for the tracking link
        const { data: sendRow, error: sendInsertErr } = await supabase
          .from('email_ab_sends')
          .insert({
            variant_id: variantId,
            recipient_email: recipientEmail,
            user_id: row.user_id,
            rating_id: row.id,
          })
          .select('id')
          .single()

        if (sendInsertErr) {
          console.error('Failed to insert email_ab_sends row', sendInsertErr)
        } else if (sendRow?.id) {
          trackingUrl = `${trackBaseUrl}?sid=${sendRow.id}`
        }
      }

      const templateData: Record<string, any> = { name, stars: row.stars }
      if (subjectOverride) templateData.subject = subjectOverride
      if (trackingUrl) templateData.trackingUrl = trackingUrl

      const anonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      const sendRes = await fetch(
        `${supabaseUrl}/functions/v1/send-transactional-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
          body: JSON.stringify({
            templateName: TEMPLATE_NAME,
            recipientEmail,
            idempotencyKey,
            templateData,
          }),
        }
      )

      if (!sendRes.ok) {
        const errText = await sendRes.text()
        throw new Error(`send-transactional-email ${sendRes.status}: ${errText}`)
      }

      sent++
      results.push({ id: row.id, status: 'sent', variant: variantId })
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
