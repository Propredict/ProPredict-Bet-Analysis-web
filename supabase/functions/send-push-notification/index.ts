/**
 * send-push-notification
 *
 * Called by a database trigger (via pg_net) whenever a tip or ticket
 * is published.  Sends an Android-only push notification through
 * the OneSignal REST API.
 *
 * Secrets required (Supabase Vault):
 *   ONESIGNAL_APP_ID
 *   ONESIGNAL_API_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const rawAppId = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
    const rawApiKey = Deno.env.get("ONESIGNAL_API_KEY") ?? "";
    
    // Strip any surrounding quotes and whitespace
    const ONESIGNAL_APP_ID = rawAppId.replace(/^["'\s]+|["'\s]+$/g, "");
    const ONESIGNAL_API_KEY = rawApiKey.replace(/^["'\s]+|["'\s]+$/g, "");
    
    console.log(`App ID debug: length=${ONESIGNAL_APP_ID.length}, first4=${ONESIGNAL_APP_ID.substring(0, 4)}, last4=${ONESIGNAL_APP_ID.substring(ONESIGNAL_APP_ID.length - 4)}, raw_length=${rawAppId.length}`);

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

    /* ── FOMO model: send to ALL users with daily_tips tag ── */
    /* App-side decides what to show based on tier in data payload */

    /* ── Send via OneSignal REST API ── */
    const payload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,

      // ALL users who opted in — no plan filtering (FOMO conversion model)
      filters: [
        { field: "tag", key: "daily_tips", relation: "=", value: "true" },
      ],

      headings: { en: headings },
      contents: { en: contents },

      // New Tips & Tickets channel (NOT goal_alerts)
      android_channel_id: "d6331715-138b-4ef2-b281-543bf423c381",

      android_sound: "default",
      priority: 10,
      ttl: 300,

      big_picture: "https://propredict.me/android-notification-banner.png",

      collapse_id: `${type}_${record.id}`,

      // nav_path for in-app WebView navigation (no Chrome)
      data: {
        type,
        id: record.id,
        tier: contentTier,
        nav_path: type === "tip"
          ? `/daily-tips?highlight=${record.id}&plan_required=${contentTier}`
          : `/daily-tickets?highlight=${record.id}&plan_required=${contentTier}`,
      },

      isAndroid: true,
      isIos: false,
      isAnyWeb: false,
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
        JSON.stringify({ 
          error: "OneSignal API error", 
          details: osResult,
          debug: {
            app_id_length: ONESIGNAL_APP_ID.length,
            app_id_preview: `${ONESIGNAL_APP_ID.substring(0, 8)}...${ONESIGNAL_APP_ID.substring(ONESIGNAL_APP_ID.length - 4)}`,
            raw_length: rawAppId.length,
          }
        }),
        { status: osResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, onesignal: osResult }),
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
