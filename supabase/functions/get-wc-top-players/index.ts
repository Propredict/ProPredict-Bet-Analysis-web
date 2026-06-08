/**
 * get-wc-top-players
 *
 * Returns Top Scorers / Top Assists / Top Yellow Cards / Top Red Cards
 * for World Cup 2026 (league=1, season=2026) with fallback to 2022 if
 * the 2026 dataset is empty (pre-tournament).
 *
 * Query: ?type=scorers|assists|yellow|red   (default: scorers)
 * Cached 10 min.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ENDPOINTS: Record<string, string> = {
  scorers: "players/topscorers",
  assists: "players/topassists",
  yellow: "players/topyellowcards",
  red: "players/topredcards",
};

async function fetchSeason(apiKey: string, path: string, season: number) {
  const url = `https://v3.football.api-sports.io/${path}?league=1&season=${season}`;
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_FOOTBALL_KEY missing", players: [] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const type = (url.searchParams.get("type") ?? "scorers").toLowerCase();
    const path = ENDPOINTS[type] ?? ENDPOINTS.scorers;

    // Try 2026 first, fallback to 2022 if empty
    let season = 2026;
    let r = await fetchSeason(apiKey, path, season);
    let response: any[] = r.ok ? r.data?.response ?? [] : [];
    let fallback = false;
    if (!response.length) {
      season = 2022;
      r = await fetchSeason(apiKey, path, season);
      response = r.ok ? r.data?.response ?? [] : [];
      fallback = true;
    }

    const players = response.slice(0, 25).map((p: any) => {
      const stats = p.statistics?.[0] ?? {};
      return {
        id: p.player?.id,
        name: p.player?.name ?? "",
        photo: p.player?.photo ?? null,
        nationality: p.player?.nationality ?? null,
        age: p.player?.age ?? null,
        team: stats.team?.name ?? null,
        teamLogo: stats.team?.logo ?? null,
        goals: stats.goals?.total ?? 0,
        assists: stats.goals?.assists ?? 0,
        appearances: stats.games?.appearences ?? 0,
        minutes: stats.games?.minutes ?? 0,
        yellow: stats.cards?.yellow ?? 0,
        red: stats.cards?.red ?? 0,
      };
    });

    return new Response(
      JSON.stringify({
        players,
        type,
        season,
        fallback,
        count: players.length,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=600",
        },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[get-wc-top-players]", msg);
    return new Response(JSON.stringify({ error: msg, players: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});