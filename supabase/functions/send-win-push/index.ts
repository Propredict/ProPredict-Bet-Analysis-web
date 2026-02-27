/**
 * send-win-push
 *
 * Called by a database trigger when a tip/ticket result is set to 'won'.
 * Sends win notifications with headlines that vary by content tier × user plan.
 *
 * Secrets required: ONESIGNAL_APP_ID, ONESIGNAL_API_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Headline matrix ── */
function getWinHeadline(contentTier: string, userPlan: string): string {
  if (contentTier === "free" || contentTier === "daily") {
    return "⚽ Free Pick WON!";
  }
  if (contentTier === "exclusive") {
    if (userPlan === "pro" || userPlan === "premium") return "🔥 Pro Pick WON!";
    return "🔥 Pro Pick WON — You're Missing Out";
  }
  if (contentTier === "premium") {
    if (userPlan === "premium") return "👑 Premium Pick WON!";
    if (userPlan === "pro") return "👑 Premium Pick WON — Upgrade to See It";
    return "👑 Premium Pick WON — You're Missing Out";
  }
  return "⚽ Pick WON!";
}

function getWinBody(type: string, record: Record<string, unknown>): string {
  if (type === "tip") {
    const home = record.home_team ?? "";
    const away = record.away_team ?? "";
    const matchLabel = home && away ? `${home} vs ${away}` : "Today's pick";
    return `${matchLabel} cashed in. Don't miss the next one.`;
  }
  const tier = (record.tier as string) ?? "daily";
  const tierLabel = tier === "premium" ? "Premium" : tier === "exclusive" ? "Pro" : "Daily";
  return `Today's ${tierLabel} ticket hit. Ready for the next one?`;
}

/** Map DB plan value to logical plan */
function mapPlan(dbPlan: string | null): string {
  if (dbPlan === "premium") return "premium";
  if (dbPlan === "basic") return "pro";
  return "free";
}

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

    if (type !== "tip" && type !== "ticket") {
      return new Response(JSON.stringify({ skipped: true, reason: `unknown type: ${type}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentTier = record.tier ?? "free";
    const winBody = getWinBody(type, record);
    const bigPicture = "https://propredict.me/push-win.jpg";

    /* ── Build nav_path based on tier ── */
    const tierRouteMap: Record<string, string> = {
      premium: type === "tip" ? "premium-analysis" : "premium-predictions",
      exclusive: type === "tip" ? "pro-analysis" : "pro-predictions",
      daily: type === "tip" ? "daily-analysis" : "daily-predictions",
      free: type === "tip" ? "daily-analysis" : "daily-predictions",
    };
    const route = tierRouteMap[contentTier] ?? tierRouteMap.daily;
    const navPath = `/${route}?highlight=${record.id}&result=won`;

    /* ── Fetch tokens ── */
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

    // Deduplicate: prefer Android token per user
    const tokensByUser = new Map<string, { id: string; platform: string; userId: string | null }>();
    for (const t of tokens ?? []) {
      if (!t.onesignal_player_id) continue;
      const uid = t.user_id ?? t.onesignal_player_id;
      const existing = tokensByUser.get(uid);
      if (!existing || (t.platform === "android" && existing.platform !== "android")) {
        tokensByUser.set(uid, { id: t.onesignal_player_id, platform: t.platform ?? "android", userId: t.user_id });
      }
    }

    /* ── 40-minute marketing cooldown + plan grouping ── */
    const FORTY_MIN = 40 * 60 * 1000;
    const now = new Date();

    const planGroups: Record<string, string[]> = { free: [], pro: [], premium: [] };
    const eligibleUserIds: string[] = [];

    for (const [, token] of tokensByUser) {
      let canSend = true;
      let userPlan = "free";

      if (token.userId) {
        const [profileRes, subRes] = await Promise.all([
          supabase.from("profiles").select("last_marketing_push_at").eq("user_id", token.userId).maybeSingle(),
          supabase.from("user_subscriptions").select("plan, status, expires_at").eq("user_id", token.userId).eq("status", "active").maybeSingle(),
        ]);

        if (profileRes.data?.last_marketing_push_at) {
          const diff = now.getTime() - new Date(profileRes.data.last_marketing_push_at).getTime();
          if (diff < FORTY_MIN) canSend = false;
        }

        if (subRes.data && subRes.data.expires_at && new Date(subRes.data.expires_at) > now) {
          userPlan = mapPlan(subRes.data.plan);
        }
      }

      if (canSend) {
        planGroups[userPlan].push(token.id);
        if (token.userId) eligibleUserIds.push(token.userId);
      }
    }

    const totalEligible = planGroups.free.length + planGroups.pro.length + planGroups.premium.length;
    if (totalEligible === 0) {
      console.log("[send-win-push] All users in cooldown, skipping");
      return new Response(
        JSON.stringify({ skipped: true, reason: "all users in cooldown" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[send-win-push] tier=${contentTier}, route=${route}, eligible=${totalEligible}/${tokensByUser.size}, free=${planGroups.free.length}, pro=${planGroups.pro.length}, premium=${planGroups.premium.length}`);

    /* ── Send one notification per plan group ── */
    const results: unknown[] = [];
    for (const plan of ["free", "pro", "premium"] as const) {
      const ids = planGroups[plan];
      if (ids.length === 0) continue;

      const headline = getWinHeadline(contentTier, plan);

      const payload = {
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: ids,
        headings: { en: headline },
        contents: { en: winBody },
        big_picture: bigPicture,
        android_channel_id: "d6331715-138b-4ef2-b281-543bf423c381",
        android_sound: "default",
        priority: 10,
        ttl: 300,
        collapse_id: `win_${type}_${record.id}`,
        data: {
          type: `${type}_won`,
          id: record.id,
          tier: contentTier,
          result: record.result,
          nav_path: navPath,
        },
      };

      console.log(`[send-win-push] Sending to ${plan} users (${ids.length}):`, headline);

      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Basic ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log(`[send-win-push] OneSignal response (${plan}):`, JSON.stringify(result));
      results.push({ plan, count: ids.length, onesignal: result });

      if (!response.ok) {
        console.error(`[send-win-push] OneSignal error for ${plan}:`, JSON.stringify(result));
      }
    }

    // Update cooldown timestamp
    if (eligibleUserIds.length > 0) {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ last_marketing_push_at: now.toISOString() })
        .in("user_id", eligibleUserIds);
      if (updateErr) console.error("[send-win-push] Failed to update cooldown:", updateErr.message);
    }

    return new Response(JSON.stringify({ success: true, results, targets: totalEligible }), {
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
