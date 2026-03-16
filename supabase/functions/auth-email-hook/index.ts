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
    'authorization, x-client-info, apikey, content-type',
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

const SITE_NAME = "ProPredict"
const SUPABASE_URL = "https://tczettddxmlcmhdhgebw.supabase.co"
const ROOT_DOMAIN = "propredict.me"
const SENDER_DOMAIN = "notify.propredict.me"

// --- JWT Verification Utilities ---

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function verifySupabaseWebhook(body: string): Promise<any> {
  const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
  if (!secret) throw new Error('SEND_EMAIL_HOOK_SECRET not configured')

  // Parse JWT
  const parts = body.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT format')

  const [headerB64, payloadB64, signatureB64] = parts

  // Extract key from "v1,whsec_<base64>" format
  const whsecMatch = secret.match(/whsec_(.+)/)
  if (!whsecMatch) throw new Error('Invalid webhook secret format')
  const keyBytes = base64UrlDecode(whsecMatch[1])

  // Verify HMAC-SHA256 signature
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const signature = base64UrlDecode(signatureB64)

  const valid = await crypto.subtle.verify('HMAC', cryptoKey, signature, data)
  if (!valid) throw new Error('Invalid webhook signature')

  // Decode payload
  const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64))
  return JSON.parse(payloadJson)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const payload = await verifySupabaseWebhook(body)

    console.log('Auth hook payload keys:', Object.keys(payload))

    // Supabase Auth Hook payload structure
    const emailType = payload.email_data?.email_action_type
    const userEmail = payload.user?.email
    const token = payload.email_data?.token
    const tokenHash = payload.email_data?.token_hash
    const redirectTo = payload.email_data?.redirect_to || `https://${ROOT_DOMAIN}`
    const siteUrl = payload.email_data?.site_url || `https://${ROOT_DOMAIN}`

    if (!emailType || !userEmail) {
      console.error('Missing email_action_type or user email', { emailType, userEmail })
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Processing auth email', { emailType, userEmail })

    const EmailTemplate = EMAIL_TEMPLATES[emailType]
    if (!EmailTemplate) {
      console.error('Unknown email type:', emailType)
      return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build confirmation URL
    const confirmationUrl = emailType === 'reauthentication'
      ? '' // Reauthentication uses OTP token, no URL
      : `${SUPABASE_URL}/auth/v1/verify?token=${tokenHash}&type=${emailType}&redirect_to=${encodeURIComponent(redirectTo)}`

    const templateProps = {
      siteName: SITE_NAME,
      siteUrl,
      recipient: userEmail,
      confirmationUrl,
      token, // OTP for reauthentication
      email: userEmail,
      newEmail: payload.email_data?.new_email,
    }

    // Render email HTML
    const html = await renderAsync(React.createElement(EmailTemplate, templateProps))

    // Send via Resend API
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`,
        to: [userEmail],
        subject: EMAIL_SUBJECTS[emailType] || 'Notification',
        html,
      }),
    })

    const resendResult = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend API error:', resendResult)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Auth email sent successfully', { emailType, userEmail, resendId: resendResult.id })

    // Supabase Auth Hook expects empty object response on success
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Auth email hook error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
