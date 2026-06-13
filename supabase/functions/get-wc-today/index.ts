/**
 * get-wc-today
 *
 * Returns today's World Cup 2026 fixtures (league=1, season=2026)
 * with live status. Used by the Live Now section on /world-cup-2026.
 * Cached 30s.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function mapStatus(short: string): "live" | "upcoming" | "finished" | "halftime" {
  if (["1H", "2H", "ET", "P", "LIVE"].includes(short)) return "live";
  if (["HT", "BT"].includes(short)) return "halftime";
  if (["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"].includes(short)) return "finished";
  return "upcoming";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_FOOTBALL_KEY missing", fixtures: [] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allow ?date=YYYY-MM-DD override (used by the "Finished — yesterday's results" section).
    const reqUrl = new URL(req.url);
    const dateParam = reqUrl.searchParams.get("date");
    const today = dateParam || new Date().toISOString().split("T")[0];
    const url = `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${today}`;

    const res = await fetch(url, {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "api_failed", details: data, fixtures: [] }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fixtures = (data?.response ?? []).map((f: any) => ({
      id: String(f.fixture?.id),
      homeTeam: f.teams?.home?.name ?? "",
      awayTeam: f.teams?.away?.name ?? "",
      homeLogo: f.teams?.home?.logo ?? null,
      awayLogo: f.teams?.away?.logo ?? null,
      homeScore: f.goals?.home ?? null,
      awayScore: f.goals?.away ?? null,
      status: mapStatus(f.fixture?.status?.short ?? "NS"),
      statusShort: f.fixture?.status?.short ?? "NS",
      minute: f.fixture?.status?.elapsed ?? null,
      startTime: f.fixture?.date ?? null,
      venue: f.fixture?.venue?.name ?? null,
      round: f.league?.round ?? null,
    }));

    // Sort: live first, then upcoming by kickoff, then finished
    const order = { live: 0, halftime: 0, upcoming: 1, finished: 2 } as const;
    fixtures.sort((a: any, b: any) => {
      const oa = order[a.status as keyof typeof order];
      const ob = order[b.status as keyof typeof order];
      if (oa !== ob) return oa - ob;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });

    return new Response(
      JSON.stringify({ fixtures, count: fixtures.length, date: today, generated_at: new Date().toISOString() }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=30",
        },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[get-wc-today]", msg);
    return new Response(JSON.stringify({ error: msg, fixtures: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});