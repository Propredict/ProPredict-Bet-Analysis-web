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
    const body = await req.json();
    const { type, record } = body;

    if (!type || !record) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").replace(/^["'\s]+|["'\s]+$/g, "");
    const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").replace(/^["'\s]+|["'\s]+$/g, "");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      console.error("OneSignal credentials not configured");
      return new Response(JSON.stringify({ error: "Missing OneSignal credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let headings: Record<string, string> = {};
    let contents: Record<string, string> = {};
    const bigPicture = "https://propredict.me/push-win.jpg";

    if (type === "tip") {
      const home = record.home_team ?? "";
      const away = record.away_team ?? "";
      const matchLabel = home && away ? `${home} vs ${away}` : "Today's pick";

      if (record.tier === "premium") {
        headings = { en: "💎 Premium Tip WON!" };
        contents = { en: `${matchLabel} cashed in. Upgrade for the next one.` };
      } else if (record.tier === "exclusive" || record.tier === "pro") {
        headings = { en: "🔥 Pro Tip WON!" };
        contents = { en: `${matchLabel} was a winner. Don't miss tomorrow.` };
      } else {
        headings = { en: "⚽ Free Tip WON!" };
        contents = { en: `${matchLabel} delivered. More coming soon.` };
      }
    } else if (type === "ticket") {
      const tier = record.tier ?? "daily";
      const tierLabel = tier === "premium" ? "Premium" : tier === "exclusive" ? "Pro" : "Daily";
      headings = { en: "🎫 Winning Ticket!" };
      contents = { en: `Today's ${tierLabel} ticket hit. Ready for the next one?` };
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
      headings,
      contents,
      big_picture: bigPicture,
      android_channel_id: "d6331715-138b-4ef2-b281-543bf423c381",
      android_sound: "default",
      priority: 10,
      ttl: 300,
      collapse_id: `win_${type}_${record.id}`,
      data: {
        type: `${type}_won`,
        id: record.id,
        tier: record.tier,
        result: record.result,
        nav_path: type === "tip"
          ? `/${(record.tier === "premium" ? "premium-tips" : record.tier === "exclusive" ? "exclusive-tips" : "daily-tips")}?highlight=${record.id}&result=won`
          : `/${(record.tier === "premium" ? "premium-tickets" : record.tier === "exclusive" ? "exclusive-tickets" : "daily-tickets")}?highlight=${record.id}&result=won`,
      },
      isAndroid: true,
      isIos: false,
      isAnyWeb: false,
    };

    console.log("Sending win push:", JSON.stringify(payload));

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("OneSignal response:", JSON.stringify(result));

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "OneSignal API error", details: result }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, onesignal: result }), {
      status: 200,
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
