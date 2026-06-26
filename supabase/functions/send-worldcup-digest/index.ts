/**
 * send-worldcup-digest
 *
 * Personalized Champion Pick digest at 09:00 Europe/Belgrade (07:00 UTC).
 * Sends ONLY to users who have a champion pick — one push per team bucket.
 * The general "all WC matches today" push is handled separately by
 * send-worldcup-daily-push.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const ONESIGNAL_URL = "https://onesignal.com/api/v1/notifications";

function ymd(d: Date): string {
  return d.toISOString().split("T")[0];
}

function teamSummary(fixtures: any[], team: string): any[] {
  const t = team.toLowerCase();
  return fixtures.filter((f) => {
    const h = (f.teams?.home?.name ?? "").toLowerCase();
    const a = (f.teams?.away?.name ?? "").toLowerCase();
    return h === t || a === t || h.includes(t) || a.includes(t);
  });
}

async function fetchFixtures(apiKey: string, date: string): Promise<any[]> {
  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${date}`,
    {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    },
  );
  const data = await res.json();
  return data?.response ?? [];
}

async function sendPush(
  appId: string,
  apiKey: string,
  playerIds: string[],
  heading: string,
  content: string,
  collapseId: string,
): Promise<any> {
  if (playerIds.length === 0) return { skipped: true };
  const res = await fetch(ONESIGNAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Basic ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      include_player_ids: playerIds.slice(0, 2000),
      headings: { en: heading },
      contents: { en: content },
      android_channel_id: "d6331715-138b-4ef2-b281-543bf423c381",
      android_sound: "default",
      priority: 10,
      ttl: 28800,
      collapse_id: collapseId,
      data: { type: "worldcup_digest", nav_path: "/world-cup-2026" },
    }),
  });
  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // Auth guard: internal callers only (INTERNAL_PUSH_SECRET or service role key)
  const __authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const __token = __authHeader.toLowerCase().startsWith("bearer ") ? __authHeader.slice(7).trim() : "";
  const __internalSecret = (Deno.env.get("INTERNAL_PUSH_SECRET") ?? "").trim();
  const __serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const __ok = (__internalSecret && __token === __internalSecret) || (__serviceKey && __token === __serviceKey);
  if (!__ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }

  try {
    const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").trim();
    const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").trim();
    const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY || !API_FOOTBALL_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing credentials" }),
        { status: 500, headers: corsHeaders },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const todayStr = ymd(today);
    const yesterdayStr = ymd(yesterday);

    // 1) Fetch fixtures
    const [todayFx, yesterdayFx] = await Promise.all([
      fetchFixtures(API_FOOTBALL_KEY, todayStr),
      fetchFixtures(API_FOOTBALL_KEY, yesterdayStr),
    ]);

    if (todayFx.length === 0 && yesterdayFx.length === 0) {
      console.log("[wc-digest] no WC activity, skip");
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_activity" }),
        { headers: corsHeaders },
      );
    }

    // 2) Load all push tokens (Android + Web) joined with optional champion pick
    const { data: tokens, error: tokErr } = await supabase
      .from("users_push_tokens")
      .select("onesignal_player_id, user_id");
    if (tokErr) throw tokErr;

    const { data: picks } = await supabase
      .from("wc_champion_predictions")
      .select("user_id, team_name, team_flag");

    const pickByUser = new Map<string, { team_name: string; team_flag: string | null }>();
    (picks ?? []).forEach((p: any) =>
      pickByUser.set(p.user_id, { team_name: p.team_name, team_flag: p.team_flag }),
    );

    // 3) Bucket players by team (or "none")
    const buckets = new Map<string, { flag: string | null; playerIds: string[] }>();
    for (const t of tokens ?? []) {
      if (!t.onesignal_player_id) continue;
      const pick = t.user_id ? pickByUser.get(t.user_id) : null;
      if (!pick) continue; // skip users without a champion pick
      const key = pick.team_name;
      const bucket = buckets.get(key) ?? { flag: pick.team_flag ?? null, playerIds: [] };
      bucket.playerIds.push(t.onesignal_player_id);
      buckets.set(key, bucket);
    }

    // 4) Build base summary
    const todayCount = todayFx.length;
    const yCount = yesterdayFx.length;
    const yResults = yesterdayFx
      .slice(0, 2)
      .map((f: any) => {
        const h = f.teams?.home?.name ?? "?";
        const a = f.teams?.away?.name ?? "?";
        const hs = f.goals?.home ?? "-";
        const as_ = f.goals?.away ?? "-";
        return `${h} ${hs}-${as_} ${a}`;
      })
      .join(" • ");

    const todaySample = todayFx
      .slice(0, 2)
      .map((f: any) => `${f.teams?.home?.name} vs ${f.teams?.away?.name}`)
      .join(" • ");

    const results: any[] = [];
    let totalSent = 0;

    // 5) Per-team personalized push
    for (const [team, bucket] of buckets) {
      if (bucket.playerIds.length === 0) continue;

      let heading: string;
      let content: string;
      const flag = bucket.flag ?? "";

      {
        const playedYesterday = teamSummary(yesterdayFx, team);
        const playsToday = teamSummary(todayFx, team);

        const parts: string[] = [];
        if (playedYesterday.length > 0) {
          const f = playedYesterday[0];
          const h = f.teams?.home?.name ?? "?";
          const a = f.teams?.away?.name ?? "?";
          const hs = f.goals?.home ?? "-";
          const as_ = f.goals?.away ?? "-";
          parts.push(`Yesterday: ${h} ${hs}-${as_} ${a}`);
        }
        if (playsToday.length > 0) {
          const f = playsToday[0];
          const opp = f.teams?.home?.name?.toLowerCase() === team.toLowerCase()
            ? f.teams?.away?.name
            : f.teams?.home?.name;
          const kickoff = f.fixture?.date
            ? new Date(f.fixture.date).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Belgrade",
              })
            : "";
          parts.push(`Today ${kickoff}: vs ${opp}`);
        }
        if (parts.length === 0) {
          parts.push(
            todayCount > 0
              ? `${todayCount} other WC ${todayCount === 1 ? "match" : "matches"} today`
              : `No WC matches today`,
          );
        }

        heading = `${flag} ${team} — your daily WC digest`.trim();
        content = parts.join(" • ") + ". Tap for live updates.";
      }

      const collapseId = `wc_digest_${todayStr}_${team}`;
      const r = await sendPush(
        ONESIGNAL_APP_ID,
        ONESIGNAL_API_KEY,
        bucket.playerIds,
        heading,
        content,
        collapseId,
      );
      totalSent += bucket.playerIds.length;
      results.push({ team, sent: bucket.playerIds.length, onesignal: r });
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: todayStr,
        buckets: results.length,
        sent: totalSent,
        results,
      }),
      { headers: corsHeaders },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[wc-digest] error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: corsHeaders },
    );
  }
});
