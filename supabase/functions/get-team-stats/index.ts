import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const homeTeamId = url.searchParams.get("homeTeam");
    const awayTeamId = url.searchParams.get("awayTeam");
    const leagueId = url.searchParams.get("league");
    const season = url.searchParams.get("season") || String(new Date().getFullYear());

    if (!homeTeamId || !awayTeamId || !leagueId) {
      return new Response(
        JSON.stringify({ error: "Missing homeTeam, awayTeam, or league parameter" }),
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

    // Fetch both teams stats + coaches in parallel
    const [homeRes, awayRes, homeCoachRes, awayCoachRes] = await Promise.all([
      fetch(`${API_FOOTBALL_URL}/teams/statistics?team=${homeTeamId}&league=${leagueId}&season=${season}`, { headers }),
      fetch(`${API_FOOTBALL_URL}/teams/statistics?team=${awayTeamId}&league=${leagueId}&season=${season}`, { headers }),
      fetch(`${API_FOOTBALL_URL}/coachs?team=${homeTeamId}`, { headers }),
      fetch(`${API_FOOTBALL_URL}/coachs?team=${awayTeamId}`, { headers }),
    ]);

    // If primary season returns empty, try previous season
    async function parseWithFallback(res: Response, teamId: string): Promise<any> {
      if (!res.ok) {
        const fallbackRes = await fetch(
          `${API_FOOTBALL_URL}/teams/statistics?team=${teamId}&league=${leagueId}&season=${Number(season) - 1}`,
          { headers }
        );
        if (!fallbackRes.ok) return null;
        const json = await fallbackRes.json();
        return json?.response || null;
      }
      const json = await res.json();
      if (!json?.response || json.response?.fixtures?.played?.total === 0) {
        const fallbackRes = await fetch(
          `${API_FOOTBALL_URL}/teams/statistics?team=${teamId}&league=${leagueId}&season=${Number(season) - 1}`,
          { headers }
        );
        if (!fallbackRes.ok) return json?.response || null;
        const fallbackJson = await fallbackRes.json();
        return fallbackJson?.response || json?.response || null;
      }
      return json.response;
    }

    function parseCoach(res: Response): Promise<any> {
      return res.json().then(json => {
        const coaches = json?.response || [];
        // Get the most recent (first) coach — API returns current coach first
        if (coaches.length === 0) return null;
        const c = coaches[0];
        return {
          id: c.id || 0,
          name: c.name || "Unknown",
          photo: c.photo || "",
          nationality: c.nationality || "",
          age: c.age || null,
        };
      }).catch(() => null);
    }

    const [homeStats, awayStats, homeCoach, awayCoach] = await Promise.all([
      parseWithFallback(homeRes, homeTeamId),
      parseWithFallback(awayRes, awayTeamId),
      parseCoach(homeCoachRes),
      parseCoach(awayCoachRes),
    ]);

    function normalizeTeamStats(stats: any, coach: any) {
      if (!stats) return null;
      return {
        team: {
          id: stats.team?.id,
          name: stats.team?.name,
          logo: stats.team?.logo,
        },
        coach: coach || null,
        form: stats.form ?? "",
        fixtures: {
          played: { home: stats.fixtures?.played?.home ?? 0, away: stats.fixtures?.played?.away ?? 0, total: stats.fixtures?.played?.total ?? 0 },
          wins: { home: stats.fixtures?.wins?.home ?? 0, away: stats.fixtures?.wins?.away ?? 0, total: stats.fixtures?.wins?.total ?? 0 },
          draws: { home: stats.fixtures?.draws?.home ?? 0, away: stats.fixtures?.draws?.away ?? 0, total: stats.fixtures?.draws?.total ?? 0 },
          losses: { home: stats.fixtures?.loses?.home ?? 0, away: stats.fixtures?.loses?.away ?? 0, total: stats.fixtures?.loses?.total ?? 0 },
        },
        goals: {
          for: {
            total: { home: stats.goals?.for?.total?.home ?? 0, away: stats.goals?.for?.total?.away ?? 0, total: stats.goals?.for?.total?.total ?? 0 },
            average: { home: stats.goals?.for?.average?.home ?? "0", away: stats.goals?.for?.average?.away ?? "0", total: stats.goals?.for?.average?.total ?? "0" },
          },
          against: {
            total: { home: stats.goals?.against?.total?.home ?? 0, away: stats.goals?.against?.total?.away ?? 0, total: stats.goals?.against?.total?.total ?? 0 },
            average: { home: stats.goals?.against?.average?.home ?? "0", away: stats.goals?.against?.average?.away ?? "0", total: stats.goals?.against?.average?.total ?? "0" },
          },
        },
        cleanSheet: { home: stats.clean_sheet?.home ?? 0, away: stats.clean_sheet?.away ?? 0, total: stats.clean_sheet?.total ?? 0 },
        failedToScore: { home: stats.failed_to_score?.home ?? 0, away: stats.failed_to_score?.away ?? 0, total: stats.failed_to_score?.total ?? 0 },
        penalty: {
          scored: { total: stats.penalty?.scored?.total ?? 0, percentage: stats.penalty?.scored?.percentage ?? "0%" },
          missed: { total: stats.penalty?.missed?.total ?? 0 },
        },
        biggestStreak: { wins: stats.biggest?.streak?.wins ?? 0, draws: stats.biggest?.streak?.draws ?? 0, losses: stats.biggest?.streak?.loses ?? 0 },
        biggestWins: { home: stats.biggest?.wins?.home ?? null, away: stats.biggest?.wins?.away ?? null },
        biggestLosses: { home: stats.biggest?.loses?.home ?? null, away: stats.biggest?.loses?.away ?? null },
      };
    }

    return new Response(
      JSON.stringify({
        home: normalizeTeamStats(homeStats, homeCoach),
        away: normalizeTeamStats(awayStats, awayCoach),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching team stats:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
