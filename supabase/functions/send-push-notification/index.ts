/**
 * send-push-notification
 *
 * Called by a database trigger (via pg_net) whenever a tip or ticket
 * is published. Sends push notifications through OneSignal REST API
 * using direct player ID targeting.
 *
 * Headline copy varies by content tier × user subscription plan.
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

/* ── Headline matrix ── */
function getPublishHeadline(contentTier: string, userPlan: string): string {
  if (contentTier === "free" || contentTier === "daily") {
    return "⚽ Free Pick Just Dropped";
  }
  if (contentTier === "exclusive") {
    // Pro content
    if (userPlan === "pro" || userPlan === "premium") return "🔥 Pro Pick Just Dropped";
    return "🔥 Pro Pick Just Dropped — Unlock It Now";
  }
  if (contentTier === "premium") {
    if (userPlan === "premium") return "👑 Premium Pick Just Dropped";
    if (userPlan === "pro") return "👑 Premium Pick Just Dropped — Upgrade to Access";
    return "👑 Premium Pick Just Dropped — See What You're Missing";
  }
  return "⚽ New Pick Available!";
}

function getPublishBody(type: string, record: Record<string, unknown>): string {
  if (type === "tip") {
    const home = record.home_team ?? "";
    const away = record.away_team ?? "";
    return home && away
      ? `${home} vs ${away} – Check out our latest prediction!`
      : "A new high-probability AI prediction is live now!";
  }
  const title = (record.title as string) ?? "";
  return title
    ? `${title} – Tap to view the full analysis!`
    : "A new AI combo is ready — open the app now!";
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

    if (record?.status !== "published") {
      console.log("Skipping notification — content not published");
      return new Response(
        JSON.stringify({ skipped: true, reason: "not published" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (type !== "tip" && type !== "ticket") {
      return new Response(
        JSON.stringify({ skipped: true, reason: `unknown type: ${type}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentTier = record.tier ?? "free";
    const body = getPublishBody(type, record);

    /* ── Build nav_path based on tier ── */
    const tierRouteMap: Record<string, string> = {
      premium: type === "tip" ? "premium-analysis" : "premium-predictions",
      exclusive: type === "tip" ? "pro-analysis" : "pro-predictions",
      daily: type === "tip" ? "daily-analysis" : "daily-predictions",
      free: type === "tip" ? "daily-analysis" : "daily-predictions",
    };
    const route = tierRouteMap[contentTier] ?? tierRouteMap.daily;
    const navPath = `/${route}?highlight=${record.id}&plan_required=${contentTier}`;

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

    /* ── 40-minute marketing cooldown ── */
    const FORTY_MIN = 40 * 60 * 1000;
    const now = new Date();

    // Group eligible tokens by user plan
    const planGroups: Record<string, string[]> = { free: [], pro: [], premium: [] };
    const eligibleUserIds: string[] = [];

    for (const [, token] of tokensByUser) {
      let canSend = true;
      let userPlan = "free";

      if (token.userId) {
        // Fetch profile for cooldown + subscription in parallel
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
      console.log("[send-push] All users in cooldown, skipping");
      return new Response(
        JSON.stringify({ skipped: true, reason: "all users in cooldown" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[send-push] tier=${contentTier}, route=${route}, eligible=${totalEligible}/${tokensByUser.size}, free=${planGroups.free.length}, pro=${planGroups.pro.length}, premium=${planGroups.premium.length}`);

    /* ── Send one notification per plan group ── */
    const results: unknown[] = [];
    for (const plan of ["free", "pro", "premium"] as const) {
      const ids = planGroups[plan];
      if (ids.length === 0) continue;

      const headline = getPublishHeadline(contentTier, plan);

      const payload = {
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: ids,
        headings: { en: headline },
        contents: { en: body },
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

      console.log(`[send-push] Sending to ${plan} users (${ids.length}):`, headline);

      const osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Basic ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const osResult = await osResponse.json();
      console.log(`[send-push] OneSignal response (${plan}):`, JSON.stringify(osResult));
      results.push({ plan, count: ids.length, onesignal: osResult });

      if (!osResponse.ok) {
        console.error(`[send-push] OneSignal error for ${plan}:`, JSON.stringify(osResult));
      }
    }

    // Update cooldown timestamp
    if (eligibleUserIds.length > 0) {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ last_marketing_push_at: now.toISOString() })
        .in("user_id", eligibleUserIds);
      if (updateErr) console.error("[send-push] Failed to update cooldown:", updateErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, results, targets: totalEligible }),
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
