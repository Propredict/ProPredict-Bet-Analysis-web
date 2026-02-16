/**
 * send-win-push
 *
 * Triggered when a tip or ticket result changes to 'won'.
 * Sends a FOMO-style push to all users with daily_tips=true.
 * Message varies by content tier.
 *
 * Secrets: ONESIGNAL_APP_ID, ONESIGNAL_API_KEY
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

    const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").replace(/^["'\s]+|["'\s]+$/g, "");
    const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").replace(/^["'\s]+|["'\s]+$/g, "");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      console.error("OneSignal credentials not configured");
      return new Response(JSON.stringify({ error: "OneSignal credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only fire for won results
    if (record?.result !== "won") {
      console.log("Skipping — result is not 'won'");
      return new Response(JSON.stringify({ skipped: true, reason: "not won" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentTier = record.tier ?? "free";
    let headings = "";
    let contents = "";

    if (type === "tip") {
      if (contentTier === "premium") {
        headings = "👑 Premium Tip WON!";
        contents = "Another Premium winner just closed. You're missing out — upgrade now!";
      } else if (contentTier === "exclusive" || contentTier === "pro") {
        headings = "🔥 Pro Tip WON!";
        contents = "Another Pro winner closed. Don't miss the next one — upgrade to access all picks.";
      } else {
        headings = "⚽ Tip WON!";
        const home = record.home_team ?? "";
        const away = record.away_team ?? "";
        contents = home && away
          ? `${home} vs ${away} — Our prediction was correct! 🎯`
          : "Another winning prediction confirmed! Check the results.";
      }
    } else if (type === "ticket") {
      if (contentTier === "premium") {
        headings = "👑 Premium Combo WON!";
        contents = "A Premium combo just hit. Upgrade to never miss a winner!";
      } else if (contentTier === "exclusive" || contentTier === "pro") {
        headings = "🔥 Pro Combo WON!";
        contents = "A Pro combo just landed. Upgrade to access tomorrow's picks.";
      } else {
        headings = "🎫 Combo WON!";
        const title = record.title ?? "";
        contents = title
          ? `${title} — Winner confirmed! 🎯`
          : "Another winning combo confirmed! Check the results.";
      }
    } else {
      return new Response(JSON.stringify({ skipped: true, reason: `unknown type: ${type}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      filters: [
        { field: "tag", key: "daily_tips", relation: "=", value: "true" },
      ],
      headings: { en: headings },
      contents: { en: contents },
      android_channel_id: "d6331715-138b-4ef2-b281-543bf423c381",
      android_sound: "default",
      priority: 10,
      ttl: 300,
      big_picture: "https://propredict.me/push-win.jpg",
      collapse_id: `win_${type}_${record.id}`,
      data: {
        type: `${type}_won`,
        id: record.id,
        tier: contentTier,
        deep_link: `propredict://${type}/${record.id}`,
      },
      url: `https://propredict.me/${type}/${record.id}?platform=android`,
      isAndroid: true,
      isIos: false,
      isAnyWeb: false,
    };

    console.log("Sending win push:", JSON.stringify(payload));

    const osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const osResult = await osResponse.json();
    console.log("OneSignal response:", JSON.stringify(osResult));

    if (!osResponse.ok) {
      return new Response(JSON.stringify({ error: "OneSignal API error", details: osResult }), {
        status: osResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, onesignal: osResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Win push error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
