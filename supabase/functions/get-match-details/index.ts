import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};


async function fetchJsonSafe(url: string, headers: HeadersInit, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      console.warn(`[get-match-details] Upstream request failed: ${url} (${response.status})`);
      return null;
    }

    return await response.json().catch(() => null);
  } catch (error) {
    console.warn(`[get-match-details] Upstream request error: ${url}`, error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface H2HMatchNormalized {
  fixture: {
    id: number;
    date: string;
    venue: { name: string; city: string } | null;
  };
  league: { name: string; country: string; logo: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const fixtureId = url.searchParams.get("fixtureId");

    if (!fixtureId) {
      return new Response(
        JSON.stringify({ error: "Missing fixtureId parameter" }),
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

    // Fetch fixture details first to get team IDs
    const fixtureRes = await fetch(`${API_FOOTBALL_URL}/fixtures?id=${fixtureId}`, { headers });
    const fixtureData = await fixtureRes.json();

    if (!fixtureData.response || fixtureData.response.length === 0) {
      return new Response(
        JSON.stringify({ error: "Fixture not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fixture = fixtureData.response[0];
    const homeTeamId = fixture.teams?.home?.id;
    const awayTeamId = fixture.teams?.away?.id;

    // Parallel fetch for statistics, lineups, events, players stats, injuries, and H2H
    // NOTE: Odds are NOT fetched here to avoid timeouts on large leagues.
    // Odds are fetched lazily by the client when the Odds tab is opened.
    const fetchPromises: Promise<any>[] = [
      fetchJsonSafe(`${API_FOOTBALL_URL}/fixtures/statistics?fixture=${fixtureId}`, headers),
      fetchJsonSafe(`${API_FOOTBALL_URL}/fixtures/lineups?fixture=${fixtureId}`, headers),
      fetchJsonSafe(`${API_FOOTBALL_URL}/fixtures/events?fixture=${fixtureId}`, headers),
      fetchJsonSafe(`${API_FOOTBALL_URL}/fixtures/players?fixture=${fixtureId}`, headers),
      fetchJsonSafe(`${API_FOOTBALL_URL}/injuries?fixture=${fixtureId}`, headers),
    ];

    // Only fetch H2H if we have both team IDs - CORRECT FORMAT: h2h=homeId-awayId
    if (homeTeamId && awayTeamId) {
      fetchPromises.push(
        fetchJsonSafe(`${API_FOOTBALL_URL}/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=10`, headers, 9000)
      );
    }

    const [statsData, lineupsData, eventsData, playersData, injuriesData, h2hJson] = await Promise.all(fetchPromises);

    // Parse H2H data if available
    let h2hData: H2HMatchNormalized[] = [];
    if (h2hRes) {
      const h2hJson = await h2hRes.json();
      if (h2hJson.response && Array.isArray(h2hJson.response)) {
        h2hData = h2hJson.response.map((match: any) => ({
          fixture: {
            id: match.fixture?.id || 0,
            date: match.fixture?.date || "",
            venue: match.fixture?.venue || null,
          },
          league: {
            name: match.league?.name || "",
            country: match.league?.country || "",
            logo: match.league?.logo || "",
          },
          teams: {
            home: {
              id: match.teams?.home?.id || 0,
              name: match.teams?.home?.name || "",
              logo: match.teams?.home?.logo || "",
              winner: match.teams?.home?.winner ?? null,
            },
            away: {
              id: match.teams?.away?.id || 0,
              name: match.teams?.away?.name || "",
              logo: match.teams?.away?.logo || "",
              winner: match.teams?.away?.winner ?? null,
            },
          },
          goals: {
            home: match.goals?.home ?? null,
            away: match.goals?.away ?? null,
          },
        }));
      }
    }

    // Build response
    const response = {
      fixture: {
        id: fixture.fixture?.id,
        date: fixture.fixture?.date,
        timestamp: fixture.fixture?.timestamp,
        venue: fixture.fixture?.venue,
        status: fixture.fixture?.status,
      },
      league: fixture.league,
      teams: fixture.teams,
      goals: fixture.goals,
      score: fixture.score,
      statistics: statsData.response || [],
      lineups: lineupsData.response || [],
      events: eventsData.response || [],
      odds: [], // Odds fetched lazily by client
      players: playersData.response || [],
      injuries: (injuriesData.response || []).map((inj: any) => ({
        player: {
          id: inj.player?.id || 0,
          name: inj.player?.name || "Unknown",
          photo: inj.player?.photo || "",
          type: inj.player?.type || "Missing",
          reason: inj.player?.reason || "Unknown",
        },
        team: {
          id: inj.team?.id || 0,
          name: inj.team?.name || "",
          logo: inj.team?.logo || "",
        },
      })),
      h2h: h2hData,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error fetching match details:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
