import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

// Template mapping
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Configuration
const SITE_NAME = "ProPredict"
const ROOT_DOMAIN = "propredict.me"
const FROM_DOMAIN = "propredict.me" // Domain shown in From address

// Sample data for preview mode ONLY (not used in actual email sending).
// URLs are baked in at scaffold time from the project's real data.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_PROJECT_URL = "https://propredictbet.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: '123456',
  },
}

// Preview endpoint handler - returns rendered HTML without sending email
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]

  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Webhook handler - accepts Supabase Auth payload and enqueues email
async function handleWebhook(req: Request): Promise<Response> {
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const run_id = crypto.randomUUID()

  const rawEmailType = (
    payload?.data?.action_type ??
    payload?.email_action_type ??
    payload?.action_type ??
    payload?.email_data?.email_action_type ??
    payload?.type
  ) as string | undefined

  const emailTypeMap: Record<string, string> = {
    magic_link: 'magiclink',
    magiclink: 'magiclink',
    email_change: 'email_change',
    emailchange: 'email_change',
    recovery: 'recovery',
    signup: 'signup',
    invite: 'invite',
    reauthentication: 'reauthentication',
  }

  const emailType = rawEmailType
    ? emailTypeMap[rawEmailType.toLowerCase()] ?? rawEmailType.toLowerCase()
    : ''

  const recipientEmail =
    payload?.data?.email ?? payload?.user?.email ?? payload?.email ?? payload?.new_email

  const confirmationUrl =
    payload?.data?.url ??
    payload?.confirmation_url ??
    payload?.action_link ??
    payload?.redirect_to ??
    payload?.email_data?.redirect_to ??
    `https://${ROOT_DOMAIN}`

  const token = payload?.data?.token ?? payload?.token ?? payload?.email_data?.token
  const newEmail = payload?.data?.new_email ?? payload?.new_email ?? payload?.email_data?.new_email

  if (!emailType || !recipientEmail) {
    console.error('Invalid auth hook payload', {
      run_id,
      rawEmailType,
      hasRecipient: Boolean(recipientEmail),
      payloadKeys: Object.keys(payload || {}),
    })
    return new Response(JSON.stringify({ error: 'Invalid auth hook payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Received auth event', { emailType, email: recipientEmail, run_id })

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType, run_id })
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: recipientEmail,
    confirmationUrl,
    token,
    email: recipientEmail,
    newEmail,
  }

  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
    plainText: true,
  })

  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured', { run_id })
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const primaryFrom = `${SITE_NAME} <noreply@${FROM_DOMAIN}>`
  const fallbackFrom = `${SITE_NAME} <onboarding@resend.dev>`

  const sendWithFrom = async (from: string) => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [recipientEmail],
        subject: EMAIL_SUBJECTS[emailType] || 'Notification',
        html,
        text,
      }),
    })

    const bodyText = await response.text()
    return { response, bodyText }
  }

  let sendResult = await sendWithFrom(primaryFrom)
  let usedFrom = primaryFrom

  if (
    !sendResult.response.ok &&
    sendResult.response.status === 403 &&
    sendResult.bodyText.includes('domain is not verified')
  ) {
    console.warn('Primary sender domain not verified on current Resend account, using fallback sender', {
      run_id,
      primaryFrom,
      fallbackFrom,
    })

    sendResult = await sendWithFrom(fallbackFrom)
    usedFrom = fallbackFrom
  }

  if (!sendResult.response.ok) {
    console.error('Failed to send auth email via Resend', {
      run_id,
      emailType,
      recipientEmail,
      status: sendResult.response.status,
      body: sendResult.bodyText,
      usedFrom,
    })

    return new Response(
      JSON.stringify({
        error: 'Failed to send email',
        provider_status: sendResult.response.status,
        provider_error: sendResult.bodyText,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  const resendBody = JSON.parse(sendResult.bodyText)

  console.log('Auth email sent via Resend', {
    emailType,
    email: recipientEmail,
    run_id,
    resend_id: resendBody?.id,
    from: usedFrom,
  })

  return new Response(
    JSON.stringify({ success: true, sent: true, id: resendBody?.id, from: usedFrom }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Handle CORS preflight for main endpoint
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  // Main webhook handler
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
