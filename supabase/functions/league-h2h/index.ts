import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface H2HFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string };
  };
  league: {
    id: number;
    name: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    fulltime: { home: number | null; away: number | null };
    halftime: { home: number | null; away: number | null };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const team1Id = url.searchParams.get("team1");
    const team2Id = url.searchParams.get("team2");
    const last = url.searchParams.get("last") || "20"; // Default to last 20 matches

    if (!team1Id || !team2Id) {
      return new Response(
        JSON.stringify({ error: "team1 and team2 parameters are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      console.error("API_FOOTBALL_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch H2H data from API-Football
    const h2hUrl = `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${team1Id}-${team2Id}&last=${last}`;
    console.log(`Fetching H2H: ${h2hUrl}`);

    const response = await fetch(h2hUrl, {
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    if (!response.ok) {
      console.error(`API-Football error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch H2H data" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const fixtures: H2HFixture[] = data.response || [];

    // Calculate summary stats
    let team1Wins = 0;
    let team2Wins = 0;
    let draws = 0;
    let team1Name = "";
    let team2Name = "";

    fixtures.forEach((match) => {
      const homeId = match.teams.home.id;
      const awayId = match.teams.away.id;
      const homeGoals = match.goals.home ?? 0;
      const awayGoals = match.goals.away ?? 0;

      // Set team names from first match
      if (!team1Name) {
        if (homeId === parseInt(team1Id)) {
          team1Name = match.teams.home.name;
          team2Name = match.teams.away.name;
        } else {
          team1Name = match.teams.away.name;
          team2Name = match.teams.home.name;
        }
      }

      // Only count finished matches
      if (match.fixture.status.short === "FT" || match.fixture.status.short === "AET" || match.fixture.status.short === "PEN") {
        if (homeGoals === awayGoals) {
          draws++;
        } else if (homeGoals > awayGoals) {
          // Home team won
          if (homeId === parseInt(team1Id)) {
            team1Wins++;
          } else {
            team2Wins++;
          }
        } else {
          // Away team won
          if (awayId === parseInt(team1Id)) {
            team1Wins++;
          } else {
            team2Wins++;
          }
        }
      }
    });

    // Group fixtures by season
    const groupedBySeasons: Record<number, H2HFixture[]> = {};
    fixtures.forEach((match) => {
      const season = match.league.season;
      if (!groupedBySeasons[season]) {
        groupedBySeasons[season] = [];
      }
      groupedBySeasons[season].push(match);
    });

    // Sort seasons descending (newest first)
    const sortedSeasons = Object.keys(groupedBySeasons)
      .map(Number)
      .sort((a, b) => b - a);

    const seasonedFixtures = sortedSeasons.map((season) => ({
      season,
      matches: groupedBySeasons[season].sort(
        (a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
      ),
    }));

    return new Response(
      JSON.stringify({
        team1: { id: parseInt(team1Id), name: team1Name },
        team2: { id: parseInt(team2Id), name: team2Name },
        summary: {
          team1Wins,
          draws,
          team2Wins,
          totalMatches: team1Wins + draws + team2Wins,
        },
        seasons: seasonedFixtures,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in league-h2h function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
