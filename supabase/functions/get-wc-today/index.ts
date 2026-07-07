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
    let dateParam = reqUrl.searchParams.get("date");
    if (!dateParam && req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.date && typeof body.date === "string") dateParam = body.date;
      } catch {/* ignore */}
    }
    const headers = {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "v3.football.api-sports.io",
    };
    const fetchDate = async (d: string) => {
      const r = await fetch(
        `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${d}`,
        { headers },
      );
      const j = await r.json();
      if (!r.ok) throw new Error(`api_failed:${r.status}:${JSON.stringify(j)}`);
      return j?.response ?? [];
    };

    let rawItems: any[] = [];
    let windowMs: { startMs: number; endMs: number } | null = null;
    const today = dateParam || new Date().toISOString().split("T")[0];

    if (dateParam) {
      rawItems = await fetchDate(dateParam);
    } else {
      // "Today" mode: fetch only today's UTC date. Previously we fetched
      // yesterday + today + tomorrow (3 API calls) to catch overnight/late
      // matches, but that tripled our API-Football quota usage. A single
      // fetch of the current UTC date covers 99% of cases; edge overnight
      // kickoffs are picked up on the next poll after 00:00 UTC.
      const todayUtc = new Date().toISOString().split("T")[0];
      rawItems = await fetchDate(todayUtc);
    }

    if (windowMs) {
      rawItems = rawItems.filter((f: any) => {
        const ko = f?.fixture?.date ? new Date(f.fixture.date).getTime() : NaN;
        if (!Number.isFinite(ko)) return false;
        return ko >= windowMs!.startMs && ko < windowMs!.endMs;
      });
    }

    const fixtures = rawItems.map((f: any) => ({
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