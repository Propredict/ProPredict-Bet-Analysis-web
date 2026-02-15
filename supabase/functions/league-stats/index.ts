import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type StatsType = "standings" | "scorers" | "assists" | "fixtures" | "rounds";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const league = url.searchParams.get("league");
    // Use current year for season - API-Football uses the starting year of the season
    // e.g., 2024 = 2024-25 season, 2025 = 2025-26 season
    const currentYear = new Date().getFullYear();
    const season = url.searchParams.get("season") || String(currentYear);
    const type = url.searchParams.get("type") as StatsType;

    if (!league) {
      return new Response(
        JSON.stringify({ error: "Missing league parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!type || !["standings", "scorers", "assists", "fixtures", "rounds"].includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid type parameter. Use: standings, scorers, assists, fixtures, or rounds" }),
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

    const headers = {
      "x-apisports-key": apiKey,
    };

    let responseData: any;

    // Helper: fetch with fallback season (try requested season, then previous)
    async function fetchWithFallback(endpoint: string, seasonParam: string): Promise<any> {
      const primaryUrl = `${API_FOOTBALL_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}season=${seasonParam}`;
      const res = await fetch(primaryUrl, { headers });
      if (!res.ok) {
        // Try previous season as fallback
        const fallbackSeason = String(Number(seasonParam) - 1);
        console.log(`Primary season ${seasonParam} failed (${res.status}), trying fallback ${fallbackSeason}`);
        const fallbackUrl = `${API_FOOTBALL_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}season=${fallbackSeason}`;
        const fallbackRes = await fetch(fallbackUrl, { headers });
        if (!fallbackRes.ok) throw new Error(`API returned ${fallbackRes.status}`);
        return fallbackRes.json();
      }
      const json = await res.json();
      // If response is empty, try previous season
      if (!json.response || json.response.length === 0) {
        const fallbackSeason = String(Number(seasonParam) - 1);
        console.log(`Season ${seasonParam} returned empty, trying fallback ${fallbackSeason}`);
        const fallbackUrl = `${API_FOOTBALL_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}season=${fallbackSeason}`;
        const fallbackRes = await fetch(fallbackUrl, { headers });
        if (!fallbackRes.ok) return json; // return original empty
        return fallbackRes.json();
      }
      return json;
    }

    switch (type) {
      case "standings":
        const standingsJson = await fetchWithFallback(`standings?league=${league}`, season);
        
        // Normalize standings response
        const standings = standingsJson.response?.[0]?.league?.standings?.[0] || [];
        responseData = {
          type: "standings",
          league: standingsJson.response?.[0]?.league || {},
          standings: standings.map((team: any) => ({
            rank: team.rank,
            team: {
              id: team.team?.id,
              name: team.team?.name,
              logo: team.team?.logo,
            },
            points: team.points,
            goalsDiff: team.goalsDiff,
            form: team.form?.split("") || [],
            all: {
              played: team.all?.played || 0,
              win: team.all?.win || 0,
              draw: team.all?.draw || 0,
              lose: team.all?.lose || 0,
              goals: {
                for: team.all?.goals?.for || 0,
                against: team.all?.goals?.against || 0,
              },
            },
            home: team.home,
            away: team.away,
            description: team.description,
          })),
        };
        break;

      case "scorers":
        const scorersJson = await fetchWithFallback(`players/topscorers?league=${league}`, season);
        
        responseData = {
          type: "scorers",
          players: (scorersJson.response || []).map((item: any) => ({
            player: {
              id: item.player?.id,
              name: item.player?.name,
              firstname: item.player?.firstname,
              lastname: item.player?.lastname,
              photo: item.player?.photo,
              nationality: item.player?.nationality,
            },
            team: {
              id: item.statistics?.[0]?.team?.id,
              name: item.statistics?.[0]?.team?.name,
              logo: item.statistics?.[0]?.team?.logo,
            },
            games: {
              appearances: item.statistics?.[0]?.games?.appearences || 0,
              minutes: item.statistics?.[0]?.games?.minutes || 0,
            },
            goals: item.statistics?.[0]?.goals?.total || 0,
            assists: item.statistics?.[0]?.goals?.assists || 0,
            penalties: item.statistics?.[0]?.penalty?.scored || 0,
          })),
        };
        break;

      case "assists":
        const assistsJson = await fetchWithFallback(`players/topassists?league=${league}`, season);
        
        responseData = {
          type: "assists",
          players: (assistsJson.response || []).map((item: any) => ({
            player: {
              id: item.player?.id,
              name: item.player?.name,
              firstname: item.player?.firstname,
              lastname: item.player?.lastname,
              photo: item.player?.photo,
              nationality: item.player?.nationality,
            },
            team: {
              id: item.statistics?.[0]?.team?.id,
              name: item.statistics?.[0]?.team?.name,
              logo: item.statistics?.[0]?.team?.logo,
            },
            games: {
              appearances: item.statistics?.[0]?.games?.appearences || 0,
              minutes: item.statistics?.[0]?.games?.minutes || 0,
            },
            goals: item.statistics?.[0]?.goals?.total || 0,
            assists: item.statistics?.[0]?.goals?.assists || 0,
          })),
        };
        break;

      case "fixtures":
        const fixturesJson = await fetchWithFallback(`fixtures?league=${league}`, season);
        
        responseData = {
          type: "fixtures",
          fixtures: (fixturesJson.response || []).map((item: any) => ({
            id: item.fixture?.id,
            date: item.fixture?.date,
            timestamp: item.fixture?.timestamp,
            status: {
              short: item.fixture?.status?.short,
              long: item.fixture?.status?.long,
              elapsed: item.fixture?.status?.elapsed,
            },
            round: item.league?.round,
            home: {
              id: item.teams?.home?.id,
              name: item.teams?.home?.name,
              logo: item.teams?.home?.logo,
              goals: item.goals?.home,
            },
            away: {
              id: item.teams?.away?.id,
              name: item.teams?.away?.name,
              logo: item.teams?.away?.logo,
              goals: item.goals?.away,
            },
          })),
        };
        break;

      case "rounds":
        const roundsJson = await fetchWithFallback(`fixtures/rounds?league=${league}`, season);
        
        responseData = {
          type: "rounds",
          rounds: roundsJson.response || [],
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error fetching league stats:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
