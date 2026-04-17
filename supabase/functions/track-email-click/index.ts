// Click tracking redirect for A/B testing.
// GET /track-email-click?sid=<email_ab_sends.id>
// Records clicked_at (idempotent) then 302s to Play Store.
import { createClient } from 'npm:@supabase/supabase-js@2'

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.propredict.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const sid = url.searchParams.get('sid')

  // Always redirect to Play Store, even on error — never block the user.
  const redirect = () =>
    new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: PLAY_STORE_URL },
    })

  if (!sid) return redirect()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) return redirect()

    const supabase = createClient(supabaseUrl, serviceKey)

    // Only set clicked_at if not already set (idempotent — first click counts)
    await supabase
      .from('email_ab_sends')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', sid)
      .is('clicked_at', null)
  } catch (err) {
    console.error('Click tracking failed', err)
  }

  return redirect()
})
