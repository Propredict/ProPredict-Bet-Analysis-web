import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").trim();
  const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").trim();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { user_id } = await req.json();

  // Get push token for this user
  const { data: tokens } = await supabase
    .from("users_push_tokens")
    .select("onesignal_player_id, platform")
    .eq("user_id", user_id);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ error: "No push tokens found for user" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Prefer android token
  const androidToken = tokens.find(t => t.platform === "android");
  const token = androidToken || tokens[0];

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: [token.onesignal_player_id],
    headings: { en: "🧪 Test Notification" },
    contents: { en: "Ovo je test push notifikacija! Ako ovo vidis, push radi. ✅" },
    android_channel_id: "d6331715-138b-4ef2-b281-543bf423c381",
    android_sound: "default",
    priority: 10,
    ttl: 300,
    data: { type: "test", nav_path: "/" },
  };

  console.log(`[test-push] Sending to ${token.platform} token: ${token.onesignal_player_id}`);

  const osRes = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const osResult = await osRes.json();
  console.log("[test-push] OneSignal response:", JSON.stringify(osResult));

  return new Response(JSON.stringify({ success: osRes.ok, token_platform: token.platform, onesignal: osResult }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
