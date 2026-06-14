/**
 * get-fixtures-by-date
 *
 * Returns all fixtures for a given date (no league filter). Used to look up
 * non-WC matches (e.g. friendlies, qualifiers) that have AI predictions in
 * our DB but are not part of league=1 (FIFA World Cup), so that "Yesterday's
 * Results" can still resolve their actual score.
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_FOOTBALL_KEY missing", fixtures: [] }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let date: string | null = null;
    const u = new URL(req.url);
    date = u.searchParams.get("date");
    if (!date && req.method === "POST") {
      try { const b = await req.json(); if (b?.date) date = b.date; } catch {/* */}
    }
    if (!date) date = new Date().toISOString().split("T")[0];

    const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
      headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "v3.football.api-sports.io" },
    });
    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "api_failed", details: data, fixtures: [] }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      leagueId: f.league?.id ?? null,
      leagueName: f.league?.name ?? null,
    }));
    return new Response(JSON.stringify({ fixtures, count: fixtures.length, date }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg, fixtures: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});