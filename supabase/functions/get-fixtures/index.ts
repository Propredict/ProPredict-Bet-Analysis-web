import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FixtureResponse {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "live" | "upcoming" | "finished" | "halftime";
  minute: number | null;
  startTime: string;
  league: string;
  leagueCountry: string;
  leagueLogo: string | null;
  homeLogo: string | null;
  awayLogo: string | null;
}

function mapStatus(shortStatus: string): "live" | "upcoming" | "finished" | "halftime" {
  const liveStatuses = ["1H", "2H", "ET", "P", "LIVE"];
  const halftimeStatuses = ["HT", "BT"];
  const finishedStatuses = ["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"];
  const upcomingStatuses = ["TBD", "NS", "SUSP", "INT"];

  if (liveStatuses.includes(shortStatus)) return "live";
  if (halftimeStatuses.includes(shortStatus)) return "halftime";
  if (finishedStatuses.includes(shortStatus)) return "finished";
  if (upcomingStatuses.includes(shortStatus)) return "upcoming";
  
  return "upcoming";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "today"; // live, today, yesterday, tomorrow
    const date = url.searchParams.get("date"); // Optional specific date YYYY-MM-DD

    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      throw new Error("API_FOOTBALL_KEY not configured");
    }

    let apiUrl = "https://v3.football.api-sports.io/fixtures";
    const params = new URLSearchParams();

    if (mode === "live") {
      params.append("live", "all");
    } else if (date) {
      params.append("date", date);
    } else {
      // Calculate date based on mode
      const today = new Date();
      let targetDate = new Date(today);

      if (mode === "yesterday") {
        targetDate.setDate(today.getDate() - 1);
      } else if (mode === "tomorrow") {
        targetDate.setDate(today.getDate() + 1);
      }
      // For "today", use current date

      const dateStr = targetDate.toISOString().split("T")[0];
      params.append("date", dateStr);
    }

    const fullUrl = `${apiUrl}?${params.toString()}`;
    console.log("Fetching from API-Football:", fullUrl);

    const response = await fetch(fullUrl, {
      headers: {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`API-Football responded with status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error("API-Football errors:", data.errors);
      throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`);
    }

    // Transform the response to our format
    const fixtures: FixtureResponse[] = (data.response || []).map((item: any) => {
      const fixture = item.fixture;
      const teams = item.teams;
      const goals = item.goals;
      const league = item.league;
      const status = fixture.status;

      return {
        id: String(fixture.id),
        homeTeam: teams.home.name,
        awayTeam: teams.away.name,
        homeScore: goals.home,
        awayScore: goals.away,
        status: mapStatus(status.short),
        minute: status.elapsed,
        startTime: new Date(fixture.date).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        league: league.name,
        leagueCountry: league.country,
        leagueLogo: league.logo,
        homeLogo: teams.home.logo,
        awayLogo: teams.away.logo,
      };
    });

    console.log(`Returning ${fixtures.length} fixtures for mode: ${mode}`);

    return new Response(JSON.stringify({ fixtures, count: fixtures.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching fixtures:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, fixtures: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
