import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FixtureResponse {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
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
    const teamId = url.searchParams.get("team");

    const lastN = url.searchParams.get("last");

    if (teamId && lastN) {
      // Fetch last N fixtures for a specific team
      params.append("team", teamId);
      params.append("last", lastN);
    } else if (teamId) {
      // Fetch next fixture for a specific team
      params.append("team", teamId);
      params.append("next", "1");
    // ---------------------------------------------------------------
    // Date selection
    // "today" mode now includes ALL matches that play today AND through
    // the night into early morning local time (Europe/Belgrade), so users
    // see and can comment on overnight games (e.g. WC kickoffs at 03:00).
    // We achieve this by fetching BOTH UTC "today" and UTC "tomorrow" and
    // filtering by a Belgrade-local window: [00:00 today, 06:00 tomorrow].
    // ---------------------------------------------------------------

    const headers = {
      "x-rapidapi-host": "v3.football.api-sports.io",
      "x-rapidapi-key": apiKey,
    };

    const fetchOne = async (qs: URLSearchParams) => {
      const u = `${apiUrl}?${qs.toString()}`;
      console.log("Fetching from API-Football:", u);
      const r = await fetch(u, { headers });
      if (!r.ok) throw new Error(`API-Football responded with status ${r.status}`);
      const j = await r.json();
      if (j.errors && Object.keys(j.errors).length > 0 && !Array.isArray(j.errors)) {
        console.error("API-Football errors:", j.errors);
      }
      return j.response || [];
    };

    let rawItems: any[] = [];
    let belgradeWindow: { startMs: number; endMs: number } | null = null;

    if (mode === "live") {
      params.append("live", "all");
      rawItems = await fetchOne(params);
    } else if (date) {
      params.append("date", date);
      rawItems = await fetchOne(params);
    } else if (mode === "today") {
      // Belgrade local window
      const nowBelgradeParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Belgrade",
        year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(new Date());
      const get = (t: string) => nowBelgradeParts.find(p => p.type === t)?.value ?? "";
      const todayLocal = `${get("year")}-${get("month")}-${get("day")}`;
      // Belgrade is UTC+1 (winter) / UTC+2 (summer). Compute offset by diffing
      // a midnight-local interpretation against UTC midnight.
      const localMidnightAsUtc = new Date(`${todayLocal}T00:00:00Z`).getTime();
      // Get what UTC time corresponds to Belgrade 00:00 today via Intl trick:
      // Format the same instant in Belgrade to know its local hour offset.
      const probe = new Date(localMidnightAsUtc);
      const belgradeHourStr = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Belgrade", hour: "2-digit", hour12: false,
      }).format(probe);
      const belgradeHour = parseInt(belgradeHourStr, 10) || 0;
      // belgradeHour = how many hours ahead Belgrade is (1 or 2). Subtract to get true UTC start.
      const startMs = localMidnightAsUtc - belgradeHour * 3600 * 1000;
      const endMs = startMs + (24 + 6) * 3600 * 1000; // through 06:00 next-day local
      belgradeWindow = { startMs, endMs };

      // Fetch UTC today + UTC tomorrow so overnight matches are included.
      const todayUtc = new Date().toISOString().split("T")[0];
      const tomorrowUtc = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0];
      const yesterdayUtc = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split("T")[0];

      const [a, b, c] = await Promise.all([
        fetchOne(new URLSearchParams({ date: yesterdayUtc })),
        fetchOne(new URLSearchParams({ date: todayUtc })),
        fetchOne(new URLSearchParams({ date: tomorrowUtc })),
      ]);
      const seen = new Set<number>();
      for (const item of [...a, ...b, ...c]) {
        const id = item?.fixture?.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          rawItems.push(item);
        }
      }
    } else {
      const today = new Date();
      let targetDate = new Date(today);
      if (mode === "yesterday") targetDate.setDate(today.getDate() - 1);
      else if (mode === "tomorrow") targetDate.setDate(today.getDate() + 1);
      const dateStr = targetDate.toISOString().split("T")[0];
      params.append("date", dateStr);
      rawItems = await fetchOne(params);
    }

    // Apply Belgrade window filter for "today" mode
    if (belgradeWindow) {
      rawItems = rawItems.filter((item: any) => {
        const ko = item?.fixture?.date ? new Date(item.fixture.date).getTime() : NaN;
        if (!Number.isFinite(ko)) return false;
        return ko >= belgradeWindow!.startMs && ko < belgradeWindow!.endMs;
      });
    }

    // Transform the response to our format
    const fixtures: FixtureResponse[] = rawItems.map((item: any) => {
      const fixture = item.fixture;
      const teams = item.teams;
      const goals = item.goals;
      const league = item.league;
      const status = fixture.status;

      return {
        id: String(fixture.id),
        homeTeam: teams.home.name,
        awayTeam: teams.away.name,
        homeTeamId: teams.home.id,
        awayTeamId: teams.away.id,
        homeScore: goals.home,
        awayScore: goals.away,
        status: mapStatus(status.short),
        minute: status.elapsed,
        // Send the raw ISO timestamp so the client renders kickoff time
        // in the user's local timezone (e.g., CET/CEST = UTC+1/+2).
        startTime: fixture.date,
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
