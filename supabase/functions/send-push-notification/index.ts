/**
 * send-push-notification
 *
 * Called by a database trigger (via pg_net) whenever a tip or ticket
 * is published. Sends push notifications through OneSignal REST API
 * using direct player ID targeting (same approach as check-goals).
 *
 * Secrets required (Supabase Vault):
 *   ONESIGNAL_APP_ID
 *   ONESIGNAL_API_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, record } = await req.json();

    const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
    const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      console.error("OneSignal credentials not configured");
      return new Response(
        JSON.stringify({ error: "OneSignal credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Only notify for published content
    if (record?.status !== "published") {
      console.log("Skipping notification — content not published");
      return new Response(
        JSON.stringify({ skipped: true, reason: "not published" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ── Build notification content (tier-aware headings) ── */
    const contentTier = record.tier ?? "free";
    let headings = "";
    let contents = "";

    if (type === "tip") {
      const tierLabel = contentTier === "premium" ? "👑 Premium" : contentTier === "exclusive" ? "🔥 Pro" : "⚽";
      headings = `${tierLabel} New AI Pick Available!`;
      const home = record.home_team ?? "";
      const away = record.away_team ?? "";
      contents = home && away
        ? `${home} vs ${away} – Check out our latest prediction!`
        : "A new high-probability AI prediction is live now!";
    } else if (type === "ticket") {
      const tierLabel = contentTier === "premium" ? "👑 Premium" : contentTier === "exclusive" ? "🔥 Pro" : "🎫";
      headings = `${tierLabel} New AI Combo Available!`;
      const title = record.title ?? "";
      contents = title
        ? `${title} – Tap to view the full analysis!`
        : "A new AI combo is ready — open the app now!";
    } else {
      return new Response(
        JSON.stringify({ skipped: true, reason: `unknown type: ${type}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ── Build nav_path based on tier ── */
    const tierRouteMap: Record<string, string> = {
      premium: type === "tip" ? "premium-tips" : "premium-tickets",
      exclusive: type === "tip" ? "exclusive-tips" : "exclusive-tickets",
      daily: type === "tip" ? "daily-tips" : "daily-tickets",
      free: type === "tip" ? "daily-tips" : "daily-tickets",
    };
    const route = tierRouteMap[contentTier] ?? tierRouteMap.daily;
    const navPath = `/${route}?highlight=${record.id}&plan_required=${contentTier}`;

    /* ── Get ALL player IDs from users_push_tokens (same as check-goals) ── */
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: tokens, error: tokensError } = await supabase
      .from("users_push_tokens")
      .select("onesignal_player_id, user_id, platform");

    if (tokensError) {
      console.error("Failed to fetch push tokens:", tokensError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch push tokens", details: tokensError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Prefer Android token over Web token per user.
    // If a user has both, only send to Android to avoid duplicates.
    const tokensByUser = new Map<string, { id: string; platform: string }>();
    for (const t of tokens ?? []) {
      if (!t.onesignal_player_id) continue;
      const uid = t.user_id ?? t.onesignal_player_id; // fallback for anonymous tokens
      const existing = tokensByUser.get(uid);
      if (!existing || (t.platform === "android" && existing.platform !== "android")) {
        tokensByUser.set(uid, { id: t.onesignal_player_id, platform: t.platform ?? "android" });
      }
    }
    const playerIds = Array.from(tokensByUser.values()).map((v) => v.id);

    if (playerIds.length === 0) {
      console.log("[send-push] No push tokens found in database");
      return new Response(
        JSON.stringify({ skipped: true, reason: "no push tokens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[send-push] tier=${contentTier}, route=${route}, targets=${playerIds.length}`);

    /* ── Send via OneSignal REST API using include_player_ids ── */
    const payload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,

      headings: { en: headings },
      contents: { en: contents },

      // New Tips & Tickets channel
      android_channel_id: "d6331715-138b-4ef2-b281-543bf423c381",

      android_sound: "default",
      priority: 10,
      ttl: 300,

      big_picture: "https://propredict.me/push-feature.jpg",
      collapse_id: `${type}_${record.id}`,

      data: {
        type,
        id: record.id,
        tier: contentTier,
        nav_path: navPath,
      },
    };

    console.log("Sending OneSignal notification:", JSON.stringify(payload));

    const osResponse = await fetch(
      "https://onesignal.com/api/v1/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Basic ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const osResult = await osResponse.json();
    console.log("OneSignal response:", JSON.stringify(osResult));

    if (!osResponse.ok) {
      return new Response(
        JSON.stringify({ error: "OneSignal API error", details: osResult }),
        { status: osResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, onesignal: osResult, targets: playerIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Push notification error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
