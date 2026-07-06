const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROUPS: Record<string, string[]> = {
  A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  B: ["Canada", "Bosnia & Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

const ALIASES: Record<string, string> = {
  czechia: "czech", "czech republic": "czech",
  turkiye: "turkey", türkiye: "turkey",
  "korea republic": "korea", "south korea": "korea", "republic of korea": "korea",
  usa: "unitedstates", us: "unitedstates", "united states": "unitedstates",
  "bosnia and herzegovina": "bosnia", "bosnia & herzegovina": "bosnia",
  "ivory coast": "ivorycoast", "cote d ivoire": "ivorycoast", "côte d ivoire": "ivorycoast",
  "dr congo": "drcongo", "congo dr": "drcongo",
};

function norm(s: string): string {
  const base = (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (ALIASES[base]) return ALIASES[base];
  const first = base.split(" ")[0] ?? "";
  return ALIASES[first] ?? first;
}

function groupFor(team: string): string | null {
  const key = norm(team);
  for (const [group, teams] of Object.entries(GROUPS)) {
    if (teams.some((t) => norm(t) === key)) return group;
  }
  return null;
}

function emptyFallbackStandings() {
  return Object.fromEntries(
    Object.entries(GROUPS).map(([group, teams]) => [
      group,
      teams.map((team, idx) => ({
        team,
        logo: "",
        rank: idx + 1,
        points: 0,
        played: 0,
        win: 0,
        draw: 0,
        loss: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalsDiff: 0,
      })),
    ]),
  );
}

async function buildCachedStandings() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return { standings: emptyFallbackStandings(), hasData: false, source: "empty" };

  const supabase = createClient(url, serviceKey);
  const { data: preds, error: predError } = await supabase
    .from("ai_predictions")
    .select("match_id, home_team, away_team, match_date")
    .ilike("league", "%world cup%")
    .limit(160);

  if (predError || !preds?.length) return { standings: emptyFallbackStandings(), hasData: false, source: "empty" };

  const { data: scores } = await supabase
    .from("match_scores_cache")
    .select("match_id, home_score, away_score")
    .in("match_id", preds.map((p: any) => p.match_id));

  const groups = emptyFallbackStandings();
  const rowFor = (team: string) => {
    const group = groupFor(team);
    if (!group) return null;
    return (groups[group] as any[]).find((r) => norm(r.team) === norm(team)) ?? null;
  };

  let played = 0;
  for (const p of preds as any[]) {
    const group = groupFor(p.home_team);
    if (!group || groupFor(p.away_team) !== group) continue;
    const score = (scores ?? []).find((s: any) => s.match_id === p.match_id);
    if (score?.home_score == null || score.away_score == null) continue;

    const home = rowFor(p.home_team);
    const away = rowFor(p.away_team);
    if (!home || !away) continue;
    played += 1;

    home.played += 1;
    away.played += 1;
    home.goalsFor += score.home_score;
    home.goalsAgainst += score.away_score;
    away.goalsFor += score.away_score;
    away.goalsAgainst += score.home_score;

    if (score.home_score > score.away_score) {
      home.win += 1;
      home.points += 3;
      away.loss += 1;
    } else if (score.home_score < score.away_score) {
      away.win += 1;
      away.points += 3;
      home.loss += 1;
    } else {
      home.draw += 1;
      away.draw += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const rows of Object.values(groups) as any[][]) {
    rows.forEach((r) => { r.goalsDiff = r.goalsFor - r.goalsAgainst; });
    rows.sort((a, b) =>
      b.points - a.points || b.goalsDiff - a.goalsDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team),
    );
    rows.forEach((r, idx) => { r.rank = idx + 1; });
  }

  return { standings: groups, hasData: played > 0, source: played > 0 ? "cache" : "empty" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      const fallback = await buildCachedStandings();
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // World Cup 2026 = league 1, season 2026
    const url = "https://v3.football.api-sports.io/standings?league=1&season=2026";

    const response = await fetch(url, {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("API-Football error:", JSON.stringify(data));
      const fallback = await buildCachedStandings();
      return new Response(JSON.stringify({ ...fallback, api_error: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract standings from response
    const standings = data?.response?.[0]?.league?.standings || [];

    // Flatten groups into a map: { "A": [...teams], "B": [...teams] }
    const groups: Record<string, Array<{
      team: string;
      logo: string;
      rank: number;
      points: number;
      played: number;
      win: number;
      draw: number;
      loss: number;
      goalsFor: number;
      goalsAgainst: number;
      goalsDiff: number;
    }>> = {};

    for (const group of standings) {
      if (!Array.isArray(group)) continue;
      for (const entry of group) {
        const rawGroup = entry.group || "";
        // API returns e.g. "Group Stage - Group A" — extract just "A"
        const match = rawGroup.match(/Group\s+([A-Z0-9]+)\s*$/i);
        const groupName = match ? match[1].toUpperCase() : rawGroup.replace(/^Group\s+/i, "");
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push({
          team: entry.team?.name || "",
          logo: entry.team?.logo || "",
          rank: entry.rank || 0,
          points: entry.points || 0,
          played: entry.all?.played || 0,
          win: entry.all?.win || 0,
          draw: entry.all?.draw || 0,
          loss: entry.all?.lose || 0,
          goalsFor: entry.all?.goals?.for || 0,
          goalsAgainst: entry.all?.goals?.against || 0,
          goalsDiff: entry.goalsDiff || 0,
        });
      }
    }

    if (Object.keys(groups).length === 0) {
      const fallback = await buildCachedStandings();
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ standings: groups, hasData: true, source: "api" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching WC standings:", error);
    const fallback = await buildCachedStandings();
    return new Response(JSON.stringify({ ...fallback, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
