/**
 * send-worldcup-kickoff-push
 *
 * Sends a one-time push notification to ALL users when the
 * FIFA World Cup 2026 kicks off (June 11, 2026).
 * Triggered by pg_cron.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // Auth guard: internal callers only (INTERNAL_PUSH_SECRET or service role key)
  const __authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const __token = __authHeader.toLowerCase().startsWith("bearer ") ? __authHeader.slice(7).trim() : "";
  const __internalSecret = (Deno.env.get("INTERNAL_PUSH_SECRET") ?? "").trim();
  const __serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const __ok = (__internalSecret && __token === __internalSecret) || (__serviceKey && __token === __serviceKey);
  if (!__ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }

  try {
    const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
    const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OneSignal credentials missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Target via tag filter — excludes users who opted out (wc_alerts = "false").
    // Users without the tag still receive (opt-out model).
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      filters: [
        { field: "tag", key: "wc_alerts", relation: "!=", value: "false" },
      ],
      headings: { en: "🏆 The World Cup Has Begun! ⚽🔥" },
      contents: {
        en: "FIFA World Cup 2026 kicks off NOW! Get live scores, AI predictions & real-time updates. Tap to follow every match!",
      },
      android_channel_id: "d6331715-138b-4ef2-b281-543bf423c381",
      android_sound: "default",
      priority: 10,
      ttl: 3600,
      big_picture: "https://propredict.me/push-feature.jpg",
      collapse_id: "worldcup_2026_kickoff",
      data: { type: "worldcup", nav_path: "/world-cup-2026" },
    };

    const osRes = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const osResult = await osRes.json();
    console.log("[wc-kickoff] sent (tag filter):", JSON.stringify(osResult));

    return new Response(
      JSON.stringify({ success: true, result: osResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[wc-kickoff] Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
