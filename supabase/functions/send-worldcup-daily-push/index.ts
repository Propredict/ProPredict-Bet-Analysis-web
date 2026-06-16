/**
 * send-worldcup-daily-push
 *
 * Daily push during WC 2026 (11.6 – 19.7.2026) at 10:00 UTC.
 * Fetches today's WC fixtures from API-Football (league=1, season=2026)
 * and sends a summary push to all users with a deep link to /world-cup-2026.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
    const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
    const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY || !API_FOOTBALL_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Get today's WC fixtures
    const today = new Date().toISOString().split("T")[0];
    const fxRes = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${today}`,
      {
        headers: {
          "x-rapidapi-key": API_FOOTBALL_KEY,
          "x-rapidapi-host": "v3.football.api-sports.io",
        },
      },
    );
    const fxData = await fxRes.json();
    const allFixtures = fxData?.response ?? [];

    // Only include matches that haven't started yet (exclude live & finished).
    // API-Football status shorts: NS/TBD = upcoming, 1H/2H/HT/ET/P/LIVE/BT = live,
    // FT/AET/PEN/PST/CANC/ABD/AWD/WO = finished.
    const UPCOMING_STATUSES = new Set(["NS", "TBD"]);
    const nowMs = Date.now();
    const fixtures = allFixtures.filter((f: any) => {
      const short = f?.fixture?.status?.short ?? "NS";
      if (!UPCOMING_STATUSES.has(short)) return false;
      const ko = f?.fixture?.date ? new Date(f.fixture.date).getTime() : NaN;
      // Safety: drop anything whose kickoff is already in the past.
      return Number.isFinite(ko) ? ko > nowMs : true;
    });

    if (fixtures.length === 0) {
      console.log(`[wc-daily] No upcoming WC matches today (total=${allFixtures.length}), skipping`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "no upcoming matches today", total: allFixtures.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Build message
    const count = fixtures.length;
    const sample = fixtures
      .slice(0, 2)
      .map((f: any) => `${f.teams?.home?.name} vs ${f.teams?.away?.name}`)
      .join(", ");
    const heading = `⚽ ${count} World Cup ${count === 1 ? "match" : "matches"} today!`;
    const content =
      count <= 2
        ? `${sample}. Get AI predictions & live updates. Tap to follow!`
        : `${sample} + ${count - 2} more. AI picks & live scores inside!`;

    // 3) Send via tag filter — excludes users who opted out (wc_alerts = "false").
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      filters: [
        { field: "tag", key: "wc_alerts", relation: "!=", value: "false" },
      ],
      headings: { en: heading },
      contents: { en: content },
      android_channel_id: "d6331715-138b-4ef2-b281-543bf423c381",
      android_sound: "default",
      priority: 10,
      ttl: 28800,
      collapse_id: `worldcup_daily_${today}`,
      data: { type: "worldcup", nav_path: "/world-cup-2026" },
    };

    const osRes = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const osResult = await osRes.json();
    console.log("[wc-daily] sent (tag filter):", JSON.stringify(osResult));
    const results = [osResult];

    return new Response(
      JSON.stringify({ success: true, matchesToday: count, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[wc-daily] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});