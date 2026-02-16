/**
 * check-goals
 *
 * Polls API-Football for live matches, detects new goals,
 * and sends targeted OneSignal push notifications to users
 * who favorited the match (Web + Android).
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
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY")!;
  const ONESIGNAL_APP_ID = (Deno.env.get("ONESIGNAL_APP_ID") ?? "").trim();
  const ONESIGNAL_API_KEY = (Deno.env.get("ONESIGNAL_API_KEY") ?? "").trim();

  if (!API_FOOTBALL_KEY || !ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing required secrets" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ================= FETCH LIVE MATCHES =================
    const apiRes = await fetch(
      "https://v3.football.api-sports.io/fixtures?live=all",
      { headers: { "x-apisports-key": API_FOOTBALL_KEY } }
    );

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error("API error:", errText);
      return new Response(
        JSON.stringify({ error: "API-Football failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiData = await apiRes.json();
    const fixtures = apiData?.response ?? [];
    console.log(`[check-goals] ${fixtures.length} live fixtures found`);

    if (fixtures.length === 0) {
      return new Response(
        JSON.stringify({ success: true, goals_detected: 0, message: "No live fixtures" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalGoals = 0;
    let totalNotifications = 0;

    for (const fixture of fixtures) {
      const matchId = String(fixture.fixture?.id);
      const homeTeam = fixture.teams?.home?.name ?? "Home";
      const awayTeam = fixture.teams?.away?.name ?? "Away";
      const homeScore = fixture.goals?.home ?? 0;
      const awayScore = fixture.goals?.away ?? 0;
      const elapsed = fixture.fixture?.status?.elapsed ?? 0;

      // ================= CHECK PREVIOUS SCORE =================
      const { data: cached } = await supabase
        .from("match_scores_cache")
        .select("home_score, away_score")
        .eq("match_id", matchId)
        .maybeSingle();

      const prevHome = cached?.home_score ?? 0;
      const prevAway = cached?.away_score ?? 0;

      const newHomeGoals = homeScore - prevHome;
      const newAwayGoals = awayScore - prevAway;

      if (newHomeGoals <= 0 && newAwayGoals <= 0) {
        await supabase.from("match_scores_cache").upsert({
          match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
          updated_at: new Date().toISOString(),
        });
        continue;
      }

      // ================= DEDUP CHECK =================
      const goalEvents: Array<{ team: string; type: string }> = [];
      if (newHomeGoals > 0) goalEvents.push({ team: homeTeam, type: "goal_home" });
      if (newAwayGoals > 0) goalEvents.push({ team: awayTeam, type: "goal_away" });

      const eventsToSend: typeof goalEvents = [];

      for (const ge of goalEvents) {
        const { data: existing } = await supabase
          .from("match_alert_events")
          .select("id")
          .eq("match_id", matchId)
          .eq("event_type", ge.type)
          .eq("minute", elapsed)
          .maybeSingle();

        if (!existing) {
          eventsToSend.push(ge);
          await supabase.from("match_alert_events").insert({
            match_id: matchId,
            event_type: ge.type,
            minute: elapsed,
            home_score: homeScore,
            away_score: awayScore,
          });
        }
      }

      if (eventsToSend.length === 0) {
        await supabase.from("match_scores_cache").upsert({
          match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
          updated_at: new Date().toISOString(),
        });
        continue;
      }

      totalGoals += eventsToSend.length;

      // ================= GET USERS WHO FAVORITED =================
      const { data: favUsers } = await supabase
        .from("favorites")
        .select("user_id")
        .eq("match_id", matchId);

      if (!favUsers || favUsers.length === 0) {
        console.log(`[check-goals] No users favorited match ${matchId}, skipping notification`);
        await supabase.from("match_scores_cache").upsert({
          match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
          updated_at: new Date().toISOString(),
        });
        continue;
      }

      const userIds = favUsers.map((f) => f.user_id);

      // ================= GET PLAYER IDS =================
      const { data: tokens } = await supabase
        .from("users_push_tokens")
        .select("onesignal_player_id")
        .in("user_id", userIds);

      const playerIds =
        tokens?.map((t) => t.onesignal_player_id).filter(Boolean) ?? [];

      if (playerIds.length === 0) {
        console.log(`[check-goals] No push tokens for match ${matchId} users`);
        await supabase.from("match_scores_cache").upsert({
          match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
          updated_at: new Date().toISOString(),
        });
        continue;
      }

      // ================= SEND NOTIFICATION =================
      const scorerTeams = eventsToSend.map((e) => e.team).join(", ");
      const scoreText = `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;

      const payload = {
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds,
        headings: { en: `⚽ GOAL! ${scorerTeams}` },
        contents: { en: `${scoreText} (${elapsed}')` },

        // Goal Alerts channel (separate from tips/tickets)
        android_channel_id: "64568561-d234-453b-b3da-8de49688731d",

        android_sound: "default",
        priority: 10,
        ttl: 120,

        data: {
          match_id: matchId,
          type: "goal",
          deep_link: `propredict://match/${matchId}`,
        },

        big_picture: "https://propredict.me/android-notification-banner.png",
      };

      console.log(`[check-goals] Sending to ${playerIds.length} users for match ${matchId}`);

      const osRes = await fetch(
        "https://onesignal.com/api/v1/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Basic ${ONESIGNAL_API_KEY}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const osResult = await osRes.json();

      if (osRes.ok) {
        totalNotifications += playerIds.length;
        console.log(`[check-goals] Notification sent for match ${matchId}:`, JSON.stringify(osResult));
      } else {
        console.error(`[check-goals] OneSignal error for match ${matchId}:`, JSON.stringify(osResult));
      }

      // ================= UPDATE CACHE =================
      await supabase.from("match_scores_cache").upsert({
        match_id: matchId,
        home_score: homeScore,
        away_score: awayScore,
        updated_at: new Date().toISOString(),
      });
    }

    console.log(`[check-goals] Done. Goals: ${totalGoals}, Notifications: ${totalNotifications}`);

    return new Response(
      JSON.stringify({
        success: true,
        goals_detected: totalGoals,
        notifications_sent: totalNotifications,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[check-goals] Unexpected error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
