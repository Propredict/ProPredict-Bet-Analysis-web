import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
}

const SITE_NAME = 'ProPredict'
const ROOT_DOMAIN = 'propredict.me'
const SENDER_DOMAIN = 'notify.propredict.me'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://tczettddxmlcmhdhgebw.supabase.co'

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

type EmailActionType = keyof typeof EMAIL_TEMPLATES

interface SendEmailPayload {
  user?: {
    email?: string
  }
  email_data?: {
    token?: string
    token_hash?: string
    token_new?: string
    token_hash_new?: string
    redirect_to?: string
    site_url?: string
    email_action_type?: EmailActionType
    new_email?: string
  }
}

function getWebhookVerifier() {
  const rawSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
  if (!rawSecret) throw new Error('SEND_EMAIL_HOOK_SECRET is not configured')
  const secret = rawSecret.replace(/^v1,whsec_/, '')
  return new Webhook(secret)
}

async function sendViaResend(params: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) throw new Error('RESEND_API_KEY is not configured')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(`Resend failed: ${JSON.stringify(result)}`)
  }

  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const payloadText = await req.text()
    const headers = Object.fromEntries(req.headers.entries())
    const webhook = getWebhookVerifier()

    const payload = webhook.verify(payloadText, headers) as SendEmailPayload
    const emailType = payload.email_data?.email_action_type
    const userEmail = payload.user?.email

    if (!emailType || !userEmail) {
      throw new Error('Invalid payload: missing email_action_type or user email')
    }

    const EmailTemplate = EMAIL_TEMPLATES[emailType]
    if (!EmailTemplate) {
      throw new Error(`Unsupported email_action_type: ${emailType}`)
    }

    const redirectTo = payload.email_data?.redirect_to ?? `https://${ROOT_DOMAIN}/reset-password`
    const siteUrl = payload.email_data?.site_url ?? `https://${ROOT_DOMAIN}`

    const tokenHash =
      emailType === 'email_change'
        ? payload.email_data?.token_hash_new ?? payload.email_data?.token_hash
        : payload.email_data?.token_hash

    const confirmationUrl = tokenHash
      ? `${SUPABASE_URL}/auth/v1/verify?token=${tokenHash}&type=${emailType}&redirect_to=${encodeURIComponent(redirectTo)}`
      : redirectTo

    const templateProps = {
      siteName: SITE_NAME,
      siteUrl,
      recipient: userEmail,
      confirmationUrl,
      token: payload.email_data?.token,
      email: userEmail,
      newEmail: payload.email_data?.new_email,
    }

    const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
    const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
      plainText: true,
    })

    const resendResult = await sendViaResend({
      to: userEmail,
      subject: EMAIL_SUBJECTS[emailType] ?? 'Notification',
      html,
      text,
    })

    console.log('Auth email sent', { emailType, userEmail, resendId: resendResult?.id })

    // Supabase Send Email hook expects a 200 with empty JSON body on success.
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Auth email hook failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    return new Response(JSON.stringify({ error: 'Failed to process send email hook' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
