// Engine v7 — DRY RUN ONLY. Reads API-Football, runs the engine, returns
// results. It never writes to the database.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { classifyLeague, isWorldCup } from "../_shared/leaguePriorityV7.ts";
import { api, analyseFixture } from "../_shared/v7Fixture.ts";

const DRYRUN_TOKEN = "v7-dryrun-8f3c2a91d7";

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body?.token !== DRYRUN_TOKEN || body?.dryRun !== true) return json({ error: "dry run only" }, 403);
  const date = String(body.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "date YYYY-MM-DD required" }, 400);
  const tier = Number(body.tier ?? 1);
  const offset = Math.max(0, Number(body.offset ?? 0));
  const limit = Math.min(40, Math.max(1, Number(body.limit ?? 15)));
  const key = Deno.env.get("API_FOOTBALL_KEY");
  if (!key) return json({ error: "API key missing" }, 500);

  const all = await api(`/fixtures?date=${date}&timezone=UTC`, key);
  if (!all) return json({ error: "fixtures fetch failed" }, 502);
  const now = Date.now() / 1000;
  const worldCup = all.filter((f: any) => isWorldCup(f.league?.id, f.league?.name)).length;
  const upcoming = all.filter((f: any) => ["NS", "TBD"].includes(f.fixture?.status?.short) && f.fixture.timestamp > now && !isWorldCup(f.league?.id, f.league?.name));
  const withTier = upcoming.map((f: any) => ({ f, t: classifyLeague(f.league.id, f.league.name, f.teams.home.name, f.teams.away.name) }))
    .sort((a: any, b: any) => a.t - b.t || a.f.fixture.timestamp - b.f.fixture.timestamp);
  const counts = { total: all.length, upcoming: upcoming.length, worldCupSeen: worldCup,
    tier1: withTier.filter((x: any) => x.t === 1).length, tier2: withTier.filter((x: any) => x.t === 2).length, tier3: withTier.filter((x: any) => x.t === 3).length };
  const slice = withTier.filter((x: any) => x.t === tier).slice(offset, offset + limit);

  const results: any[] = [];
  const errors: any[] = [];
  const CONC = 4;
  for (let i = 0; i < slice.length; i += CONC) {
    const part = await Promise.all(slice.slice(i, i + CONC).map((x: any) => analyseFixture(x.f, key).catch((e) => ({ error: String(e), id: x.f.fixture.id }))));
    for (const p of part) ("error" in p ? errors : results).push(p);
  }
  return json({ dryRun: true, date, tier, offset, counts, processed: slice.length, results, errors });
});
