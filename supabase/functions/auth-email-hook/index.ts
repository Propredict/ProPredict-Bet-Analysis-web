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
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

function buildVerificationUrl(params: {
  supabaseUrl: string
  tokenHash?: string
  emailType: string
  redirectTo?: string
}) {
  const { supabaseUrl, tokenHash, emailType, redirectTo } = params
  if (!tokenHash) return `https://${ROOT_DOMAIN}`

  const verifyUrl = new URL('/auth/v1/verify', supabaseUrl)
  verifyUrl.searchParams.set('token', tokenHash)
  verifyUrl.searchParams.set('type', emailType)

  if (redirectTo) {
    verifyUrl.searchParams.set('redirect_to', redirectTo)
  }

  return verifyUrl.toString()
}

function mapEmailType(rawType?: string) {
  if (!rawType) return ''
  if (rawType === 'magic_link') return 'magiclink'
  return rawType
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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!resendApiKey || !supabaseUrl) {
      console.error('Missing required environment variables', {
        hasResend: !!resendApiKey,
        hasSupabaseUrl: !!supabaseUrl,
      })
      return new Response(
        JSON.stringify({
          error: {
            http_code: 500,
            message: 'Server configuration error',
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const payload = await req.json()
    const user = payload?.user
    const emailData = payload?.email_data ?? payload?.email

    if (!user?.email || !emailData) {
      console.error('Invalid payload for auth email hook', { payload })
      return new Response(
        JSON.stringify({
          error: {
            http_code: 400,
            message: 'Invalid payload',
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const emailType = mapEmailType(emailData.email_action_type)
    const EmailTemplate = EMAIL_TEMPLATES[emailType]

    if (!EmailTemplate) {
      console.error('Unknown email action type', { emailType, rawType: emailData.email_action_type })
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const confirmationUrl = buildVerificationUrl({
      supabaseUrl,
      tokenHash: emailData.token_hash,
      emailType,
      redirectTo: emailData.redirect_to,
    })

    const templateProps = {
      siteName: SITE_NAME,
      siteUrl: `https://${ROOT_DOMAIN}`,
      recipient: user.email,
      confirmationUrl,
      token: emailData.token,
      email: user.email,
      newEmail: user.email_new ?? emailData.new_email,
    }

    const html = await renderAsync(React.createElement(EmailTemplate, templateProps))

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
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
      console.error('Resend API error', { status: resendResponse.status, body: resendResult })
      return new Response(
        JSON.stringify({
          error: {
            http_code: 500,
            message: 'Failed to send email',
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    console.log('Auth email sent', { emailType, email: user.email })

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Auth email hook error', error)

    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: 'Internal server error',
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
