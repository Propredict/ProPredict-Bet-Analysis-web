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
    const body = await req.json();
    const { type, record } = body;

    if (!type || !record) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
    const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    /* ── Build nav_path based on tier ── */
    const tierRouteMap: Record<string, string> = {
      premium: type === "tip" ? "premium-tips" : "premium-tickets",
      exclusive: type === "tip" ? "exclusive-tips" : "exclusive-tickets",
      daily: type === "tip" ? "daily-tips" : "daily-tickets",
      free: type === "tip" ? "daily-tips" : "daily-tickets",
    };
    const route = tierRouteMap[record.tier] ?? tierRouteMap.daily;
    const navPath = `/${route}?highlight=${record.id}&result=won`;

    /* ── Get ALL player IDs from users_push_tokens (same as check-goals) ── */
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: tokens, error: tokensError } = await supabase
      .from("users_push_tokens")
      .select("onesignal_player_id");

    if (tokensError) {
      console.error("Failed to fetch push tokens:", tokensError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch push tokens", details: tokensError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const playerIds = tokens?.map((t) => t.onesignal_player_id).filter(Boolean) ?? [];

    if (playerIds.length === 0) {
      console.log("[send-win-push] No push tokens found in database");
      return new Response(
        JSON.stringify({ skipped: true, reason: "no push tokens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[send-win-push] tier=${record.tier}, route=${route}, targets=${playerIds.length}`);

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
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
        nav_path: navPath,
      },
      url: `https://propredictbet.lovable.app${navPath}`,
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

    return new Response(JSON.stringify({ success: true, onesignal: result, targets: playerIds.length }), {
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
