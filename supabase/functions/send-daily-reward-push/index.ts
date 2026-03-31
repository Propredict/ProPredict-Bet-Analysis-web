import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
  const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    return new Response(JSON.stringify({ error: "OneSignal not configured" }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const today = new Date().toISOString().split("T")[0];

    // Get all users with push tokens who haven't claimed today
    const { data: tokens, error: tokensErr } = await supabase
      .from("users_push_tokens")
      .select("onesignal_player_id, user_id");

    if (tokensErr) throw tokensErr;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_tokens" }), { headers: corsHeaders });
    }

    // Get users who already claimed today
    const { data: claims } = await supabase
      .from("daily_reward_claims")
      .select("user_id")
      .eq("claim_date", today);

    const claimedUserIds = new Set((claims || []).map((c: any) => c.user_id));

    // Filter to users who haven't claimed
    const unclaimedTokens = tokens.filter((t: any) => t.user_id && !claimedUserIds.has(t.user_id));

    if (unclaimedTokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "all_claimed" }), { headers: corsHeaders });
    }

    const playerIds = unclaimedTokens.map((t: any) => t.onesignal_player_id);

    // Pick random message variant
    const messages = [
      { title: "🎁 Your Daily Reward is Ready!", body: "Collect your AI Arena points before midnight! Don't break your streak 🔥" },
      { title: "⏳ Don't Lose Your Streak!", body: "Claim today's reward and keep building towards premium unlocks 🚀" },
      { title: "🔥 Daily Points Waiting!", body: "Your AI Arena points are ready to collect. Come back and claim them! 💎" },
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    // Send via OneSignal
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds.slice(0, 2000), // OneSignal limit
        headings: { en: msg.title },
        contents: { en: msg.body },
        data: { nav_path: "/" },
        collapse_id: "daily_reward_reminder",
        android_channel_id: undefined,
      }),
    });

    const result = await res.json();

    return new Response(
      JSON.stringify({ sent: playerIds.length, onesignal_id: result.id }),
      { headers: corsHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
