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
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
}

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

const SITE_NAME = 'ProPredict'
const SENDER_DOMAIN = 'notify.propredict.me'
const ROOT_DOMAIN = 'propredict.me'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
    if (!hookSecret) {
      console.error('SEND_EMAIL_HOOK_SECRET not configured')
      return new Response(JSON.stringify({ error: 'Missing hook secret' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'Missing Resend API key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify webhook signature using standardwebhooks
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    const wh = new Webhook(hookSecret.replace('v1,whsec_', ''))

    let data: any
    try {
      data = wh.verify(payload, headers)
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { user, email_data } = data
    const emailType = email_data.email_action_type
    console.log('Auth email hook called', { emailType, email: user.email })

    const EmailTemplate = EMAIL_TEMPLATES[emailType]
    if (!EmailTemplate) {
      console.error('Unknown email type:', emailType)
      // Return 200 so Supabase doesn't retry
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build confirmation URL from token_hash and type
    const siteUrl = `https://${ROOT_DOMAIN}`
    const confirmationUrl = email_data.redirect_to
      ? `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=${emailType}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`
      : `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=${emailType}`

    const templateProps = {
      siteName: SITE_NAME,
      siteUrl,
      recipient: user.email,
      confirmationUrl,
      token: email_data.token,
      email: user.email,
      newEmail: email_data.new_email,
    }

    const html = await renderAsync(React.createElement(EmailTemplate, templateProps))

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`,
        to: [user.email],
        subject: EMAIL_SUBJECTS[emailType] || 'Notification',
        html,
      }),
    })

    const resendResult = await resendResponse.text()

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Email sent successfully via Resend', { emailType, email: user.email })

    // Return empty 200 as expected by Supabase Auth Hook
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Auth email hook error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
