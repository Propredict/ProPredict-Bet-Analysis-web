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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all push tokens
    const { data: tokens, error: tokensErr } = await supabase
      .from("users_push_tokens")
      .select("onesignal_player_id");

    if (tokensErr || !tokens?.length) {
      console.error("[wc-kickoff] No tokens found:", tokensErr?.message);
      return new Response(
        JSON.stringify({ error: "No push tokens", details: tokensErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const playerIds = tokens
      .map(t => t.onesignal_player_id)
      .filter(Boolean);

    if (playerIds.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no valid player IDs" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Send in batches of 2000 (OneSignal limit)
    const BATCH_SIZE = 2000;
    const results: unknown[] = [];

    for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
      const batch = playerIds.slice(i, i + BATCH_SIZE);

      const payload = {
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: batch,
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
        data: {
          type: "worldcup",
          nav_path: "/world-cup-2026",
        },
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
      console.log(`[wc-kickoff] Batch ${i / BATCH_SIZE + 1}: sent to ${batch.length} users`, JSON.stringify(osResult));
      results.push({ batch: i / BATCH_SIZE + 1, count: batch.length, result: osResult });
    }

    return new Response(
      JSON.stringify({ success: true, totalSent: playerIds.length, results }),
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
