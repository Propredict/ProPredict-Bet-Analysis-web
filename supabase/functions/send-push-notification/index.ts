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

    /* ── Build notification content ── */
    let headings = "";
    let contents = "";

    if (type === "tip") {
      headings = "⚽ New Tip Available!";
      const home = record.home_team ?? "";
      const away = record.away_team ?? "";
      contents = home && away
        ? `${home} vs ${away} – Check out our latest prediction!`
        : "A new betting tip is ready — open the app now!";
    } else if (type === "ticket") {
      headings = "🎫 New Ticket Available!";
      const title = record.title ?? "";
      contents = title
        ? `${title} – Open the app to view the full analysis!`
        : "A new betting ticket is ready — open the app now!";
    } else {
      return new Response(
        JSON.stringify({ skipped: true, reason: `unknown type: ${type}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ── Send via OneSignal REST API ── */
    const payload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      headings: { en: headings },
      contents: { en: contents },
      // Android-only push
      isAndroid: true,
      isIos: false,
      isAnyWeb: false,
      isChromeWeb: false,
      isFirefox: false,
      isSafari: false,
      isWP_WNS: false,
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
