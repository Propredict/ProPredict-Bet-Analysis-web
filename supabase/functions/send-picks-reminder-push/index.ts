/**
 * send-picks-reminder-push
 *
 * Scheduled engagement push (3x daily: 12:00 / 15:00 / 17:00 Belgrade).
 * Sends a "check today's picks" reminder to ALL subscribed users
 * (same message for Free / Pro / Premium), deep-linking to AI predictions.
 *
 * Spam protection: content is fully server-defined (slot whitelist only),
 * and each slot can fire at most once per 20 hours (push_reminder_log).
 * No marketing cooldown interaction — reminders are independent of
 * tip/ticket publish pushes.
 *
 * Body: { "slot": "midday" | "afternoon" | "evening" }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SLOTS: Record<string, { navPath: string; messages: { title: string; body: string }[] }> = {
  midday: {
    navPath: "/ai-predictions",
    messages: [
      { title: "🎯 Today's Best Picks Are Live!", body: "Our AI analyzed today's matches — check the top predictions before kickoff." },
      { title: "🤖 AI Picks Are Ready!", body: "Today's smartest predictions just dropped. Tap to see them now!" },
      { title: "⚽ Don't Miss Today's Picks!", body: "Fresh AI analysis is live — see the best picks before the matches start." },
    ],
  },
  afternoon: {
    navPath: "/ai-predictions",
    messages: [
      { title: "🔥 Updated AI Picks Just Dropped", body: "Fresh analysis is in — see today's smartest predictions now." },
      { title: "📊 New Predictions Available!", body: "Our AI just updated today's picks. Check what's changed!" },
      { title: "🎯 Top Picks Refreshed!", body: "The latest AI analysis is live — tap to view today's best predictions." },
    ],
  },
  evening: {
    navPath: "/ai-predictions",
    messages: [
      { title: "⚽ Tonight's Matches Await!", body: "Evening predictions are ready — don't miss tonight's top picks." },
      { title: "🌙 Evening Picks Are Live!", body: "Tonight's best predictions are ready. Tap to check them out!" },
      { title: "🔥 Last Call for Tonight's Picks!", body: "The evening matches are coming — see the AI's top picks now." },
    ],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slot } = await req.json();
    const slotConfig = SLOTS[slot as string];
    if (!slotConfig) {
      return new Response(
        JSON.stringify({ error: "Invalid slot. Use: midday | afternoon | evening" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
    const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OneSignal credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    /* ── Dedup guard: each slot fires at most once per 20 hours ── */
    const { data: recent } = await supabase
      .from("push_reminder_log")
      .select("id, sent_at")
      .eq("slot", slot)
      .gte("sent_at", new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (recent && recent.length > 0) {
      console.log(`[reminder-push] Slot '${slot}' already sent within 20h, skipping`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "slot_already_sent", slot }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ── Fetch tokens, dedupe per user (prefer Android) ── */
    const { data: tokens, error: tokensError } = await supabase
      .from("users_push_tokens")
      .select("onesignal_player_id, user_id, platform");

    if (tokensError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch push tokens", details: tokensError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tokensByUser = new Map<string, { id: string; platform: string }>();
    for (const t of tokens ?? []) {
      if (!t.onesignal_player_id) continue;
      const uid = t.user_id ?? t.onesignal_player_id;
      const existing = tokensByUser.get(uid);
      if (!existing || (t.platform === "android" && existing.platform !== "android")) {
        tokensByUser.set(uid, { id: t.onesignal_player_id, platform: t.platform ?? "android" });
      }
    }

    const playerIds = [...tokensByUser.values()].map((t) => t.id);
    if (playerIds.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_tokens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ── Pick a random message variant ── */
    const variants = slotConfig.messages;
    const msg = variants[Math.floor(Math.random() * variants.length)];

    /* ── Send in batches of 2000 (OneSignal limit) ── */
    const results: unknown[] = [];
    for (let i = 0; i < playerIds.length; i += 2000) {
      const batch = playerIds.slice(i, i + 2000);
      const payload = {
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: batch,
        headings: { en: msg.title },
        contents: { en: msg.body },
        android_channel_id: "d6331715-138b-4ef2-b281-543bf423c381",
        android_sound: "default",
        priority: 10,
        ttl: 7200,
        collapse_id: `picks_reminder_${slot}`,
        data: { type: "picks_reminder", slot, nav_path: slotConfig.navPath },
      };

      const osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Basic ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      const osResult = await osResponse.json();

      const invalidPlayerIds = Array.isArray((osResult as any)?.errors?.invalid_player_ids)
        ? ((osResult as any).errors.invalid_player_ids as string[])
        : [];
      if (invalidPlayerIds.length > 0) {
        const { error: purgeErr } = await supabase
          .from("users_push_tokens")
          .delete()
          .in("onesignal_player_id", invalidPlayerIds);
        if (purgeErr) console.error("[reminder-push] Failed to purge invalid IDs:", purgeErr.message);
        else console.log(`[reminder-push] Purged ${invalidPlayerIds.length} invalid player IDs`);
      }

      console.log(`[reminder-push] Batch ${i / 2000 + 1} sent to ${batch.length}:`, JSON.stringify(osResult));
      results.push({ count: batch.length, onesignal: osResult });
    }

    /* ── Log the send ── */
    const { error: logErr } = await supabase
      .from("push_reminder_log")
      .insert({ slot, recipients: playerIds.length, message_title: msg.title });
    if (logErr) console.error("[reminder-push] Failed to log send:", logErr.message);

    return new Response(
      JSON.stringify({ success: true, slot, targets: playerIds.length, message: msg.title, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[reminder-push] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
