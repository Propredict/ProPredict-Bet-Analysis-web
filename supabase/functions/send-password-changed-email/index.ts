import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { PasswordChangedEmail } from '../_shared/email-templates/password-changed.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_NAME = 'ProPredict'
const FROM_DOMAIN = 'propredict.me'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const html = await renderAsync(
      React.createElement(PasswordChangedEmail, { siteName: SITE_NAME, email })
    )
    const text = await renderAsync(
      React.createElement(PasswordChangedEmail, { siteName: SITE_NAME, email }),
      { plainText: true }
    )

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
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
          to: [email],
          subject: 'Your password has been changed',
          html,
          text,
        }),
      })
      const bodyText = await response.text()
      return { response, bodyText }
    }

    let result = await sendWithFrom(primaryFrom)

    if (!result.response.ok && result.response.status === 403 && result.bodyText.includes('domain is not verified')) {
      result = await sendWithFrom(fallbackFrom)
    }

    if (!result.response.ok) {
      console.error('Failed to send password changed email', { status: result.response.status, body: result.bodyText })
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendBody = JSON.parse(result.bodyText)
    console.log('Password changed email sent', { email, resend_id: resendBody?.id })

    return new Response(JSON.stringify({ success: true, id: resendBody?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
