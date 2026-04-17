// Dispatcher: finds eligible app_ratings (>=4 stars, 6-12h old) and sends
// follow-up emails directly via Resend (bypasses send-transactional-email
// queue infrastructure which is not yet provisioned). Uses email_ab_sends
// for idempotency + A/B variant tracking.
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { template as ratingFollowupTemplate } from '../_shared/transactional-email-templates/rating-followup.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TEMPLATE_NAME = 'rating-followup'
const FROM_ADDRESS = 'ProPredict <noreply@notify.propredict.me>'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!supabaseUrl || !serviceKey || !resendKey) {
    return new Response(JSON.stringify({ error: 'Server config error (missing SUPABASE_URL / SERVICE_ROLE_KEY / RESEND_API_KEY)' }), {
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
      // Idempotency: skip if we already have an email_ab_sends row for this rating
      if (!force) {
        const { data: existing } = await supabase
          .from('email_ab_sends')
          .select('id')
          .eq('rating_id', row.id)
          .limit(1)

        if (existing && existing.length > 0) {
          skipped++
          results.push({ id: row.id, status: 'skipped_already_sent' })
          continue
        }
      }

      if (!row.user_id && !force) {
        skipped++
        results.push({ id: row.id, status: 'skipped_no_user' })
        continue
      }

      let recipientEmail: string | undefined
      let name: string | undefined

      if (force && forceEmail) recipientEmail = forceEmail

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

      // ── A/B variant selection (random pick) ──
      let variantId: string | null = null
      let subjectOverride: string | null = null
      let trackingUrl: string | undefined

      if (activeVariants.length > 0) {
        const picked = activeVariants[Math.floor(Math.random() * activeVariants.length)]
        variantId = picked.id
        subjectOverride = picked.subject

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

      // Render React Email template to HTML
      const html = await renderAsync(
        React.createElement(ratingFollowupTemplate.component, {
          name,
          stars: row.stars,
          trackingUrl,
        }),
      )

      const subject =
        subjectOverride ||
        (typeof ratingFollowupTemplate.subject === 'function'
          ? ratingFollowupTemplate.subject({ name, stars: row.stars })
          : ratingFollowupTemplate.subject)

      // Send via Resend directly
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [recipientEmail],
          subject,
          html,
        }),
      })

      if (!sendRes.ok) {
        const errText = await sendRes.text()
        throw new Error(`Resend ${sendRes.status}: ${errText}`)
      }

      const resendData = await sendRes.json()
      sent++
      results.push({
        id: row.id,
        status: 'sent',
        variant: variantId,
        recipient: recipientEmail,
        resend_id: resendData?.id ?? null,
      })
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
    },
  )
})
