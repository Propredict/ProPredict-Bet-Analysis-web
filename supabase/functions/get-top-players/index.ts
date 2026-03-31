import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Top 5 leagues by default
const DEFAULT_LEAGUES = [
  { id: 39, name: "Premier League" },
  { id: 140, name: "La Liga" },
  { id: 135, name: "Serie A" },
  { id: 78, name: "Bundesliga" },
  { id: 61, name: "Ligue 1" },
  { id: 88, name: "Eredivisie" },
  { id: 94, name: "Primeira Liga" },
  { id: 203, name: "Super Lig" },
  { id: 144, name: "Pro League" },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "topscorers"; // topscorers | topassists | topyellowcards | topredcards
    const leagueId = url.searchParams.get("league"); // optional specific league
    const currentYear = new Date().getFullYear();
    const season = url.searchParams.get("season") || String(currentYear);

    const validTypes = ["topscorers", "topassists", "topyellowcards", "topredcards"];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid type. Use: topscorers, topassists, topyellowcards, topredcards" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = { "x-apisports-key": apiKey };

    // If specific league requested, fetch just that one
    const leagues = leagueId
      ? [{ id: Number(leagueId), name: "" }]
      : DEFAULT_LEAGUES;

    // Fetch top players from each league in parallel
    const results = await Promise.all(
      leagues.map(async (league) => {
        try {
          // Try current season first
          let res = await fetch(
            `${API_FOOTBALL_URL}/players/${type}?league=${league.id}&season=${season}`,
            { headers }
          );
          let json = await res.json();
          
          // Fallback to previous season
          if (!json.response?.length) {
            res = await fetch(
              `${API_FOOTBALL_URL}/players/${type}?league=${league.id}&season=${Number(season) - 1}`,
              { headers }
            );
            json = await res.json();
          }

          const players = (json.response || []).slice(0, 5).map((entry: any) => {
            const p = entry.player;
            const stat = entry.statistics?.[0];
            return {
              id: p.id,
              name: p.name,
              firstname: p.firstname,
              lastname: p.lastname,
              photo: p.photo,
              nationality: p.nationality,
              age: p.age,
              team: {
                id: stat?.team?.id,
                name: stat?.team?.name,
                logo: stat?.team?.logo,
              },
              league: {
                id: stat?.league?.id,
                name: stat?.league?.name,
                logo: stat?.league?.logo,
                country: stat?.league?.country,
              },
              stats: {
                appearances: stat?.games?.appearences || 0,
                goals: stat?.goals?.total || 0,
                assists: stat?.goals?.assists || 0,
                yellowCards: stat?.cards?.yellow || 0,
                redCards: stat?.cards?.red || 0,
                rating: stat?.games?.rating || null,
                position: stat?.games?.position || "",
              },
            };
          });

          return {
            league: {
              id: league.id,
              name: players[0]?.league?.name || league.name,
              logo: players[0]?.league?.logo || "",
              country: players[0]?.league?.country || "",
            },
            players,
          };
        } catch (e) {
          console.error(`Error fetching ${type} for league ${league.id}:`, e);
          return { league: { id: league.id, name: league.name, logo: "", country: "" }, players: [] };
        }
      })
    );

    // Filter out leagues with no data
    const filteredResults = results.filter(r => r.players.length > 0);

    return new Response(
      JSON.stringify({ type, season, results: filteredResults }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching top players:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
