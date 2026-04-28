const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ROUNDS = [
  "Round of 32",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "3rd Place Final",
  "Final",
] as const;

type RoundName = typeof ROUNDS[number];

interface BracketMatch {
  fixture_id: number | null;
  round: RoundName;
  date: string | null;
  status: string;
  home: { id: number | null; name: string | null; logo: string | null; flag: string | null };
  away: { id: number | null; name: string | null; logo: string | null; flag: string | null };
  home_score: number | null;
  away_score: number | null;
  winner: "home" | "away" | null;
  venue: string | null;
}

function buildMatch(fixture: any, roundName: RoundName): BracketMatch {
  const homeTeam = fixture.teams?.home;
  const awayTeam = fixture.teams?.away;
  return {
    fixture_id: fixture.fixture?.id ?? null,
    round: roundName,
    date: fixture.fixture?.date ?? null,
    status: fixture.fixture?.status?.short ?? "NS",
    home: {
      id: homeTeam?.id ?? null,
      name: homeTeam?.name ?? null,
      logo: homeTeam?.logo ?? null,
      flag: null,
    },
    away: {
      id: awayTeam?.id ?? null,
      name: awayTeam?.name ?? null,
      logo: awayTeam?.logo ?? null,
      flag: null,
    },
    home_score: fixture.goals?.home ?? null,
    away_score: fixture.goals?.away ?? null,
    winner: homeTeam?.winner === true ? "home" : awayTeam?.winner === true ? "away" : null,
    venue: fixture.fixture?.venue?.name ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_FOOTBALL_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "v3.football.api-sports.io",
    };

    // Fetch all knockout rounds in parallel
    const results = await Promise.all(
      ROUNDS.map(async (round) => {
        const url = `https://v3.football.api-sports.io/fixtures?league=1&season=2026&round=${encodeURIComponent(round)}`;
        try {
          const r = await fetch(url, { headers });
          if (!r.ok) return { round, matches: [] as BracketMatch[] };
          const data = await r.json();
          const matches = (data?.response ?? []).map((f: any) => buildMatch(f, round));
          return { round, matches };
        } catch (e) {
          console.error(`Failed to fetch round ${round}:`, e);
          return { round, matches: [] as BracketMatch[] };
        }
      })
    );

    const bracket: Record<string, BracketMatch[]> = {};
    let totalMatches = 0;
    for (const { round, matches } of results) {
      bracket[round] = matches;
      totalMatches += matches.length;
    }

    return new Response(
      JSON.stringify({
        bracket,
        hasData: totalMatches > 0,
        totalMatches,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
      }
    );
  } catch (error) {
    console.error("get-wc-knockout error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});