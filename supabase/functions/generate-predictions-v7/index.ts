// Engine v7 — PRODUCTION generator.
// Phases (self-chaining, each call stays well under the edge time limit):
//   start   → list the date's upcoming non-World-Cup fixtures into the staging table
//   analyse → run the v7 engine on the next batch of staged fixtures
//   publish → allocate Premium/Pro/Free with the tested rules and write ai_predictions
// Only allocated (published) picks are written to ai_predictions. 65–69% and
// limited-quality results stay in the staging table (analysed/stored only).
// A date that is already published is never regenerated unless force=true,
// so users see a stable pick all day.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { classifyLeague, isWorldCup } from "../_shared/leaguePriorityV7.ts";
import { api, analyseFixture } from "../_shared/v7Fixture.ts";
import { allocate, finalConfidence, ENGINE_VERSION, type PoolItem } from "../_shared/predictionEngineV7.ts";

// The run token lives only in Supabase Vault (name 'v7_cron_token').
// It is verified server-side via the service-role-only RPC v7_verify_token.
let RUN_TOKEN = "";
const BATCH = 32;
const CONC = 4;

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function isoDate(offsetDays: number) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

function chain(body: Record<string, unknown>) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-predictions-v7`;
  const p = fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
    body: JSON.stringify({ ...body, token: RUN_TOKEN }),
  }).catch((e) => console.error("[v7] chain failed", e));
  // @ts-ignore EdgeRuntime is provided by Supabase
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(p);
}

function analysisText(r: any): string {
  const others = Object.entries(r.markets as Record<string, number>)
    .filter(([k]) => k !== r.main_market)
    .map(([k, p]) => [k, finalConfidence(p as number, r.data_quality)] as [string, number])
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, c]) => `${k} ${c}%`).join(", ");
  return `Main pick: ${r.main_market} with ${r.confidence}% confidence. ` +
    `Expected goals ${r.xg_home} – ${r.xg_away}. ` +
    `Data quality ${r.data_quality_label} (${r.data_quality}/100) from ${(r.sources_used ?? []).join(", ") || "available data"}. ` +
    (others ? `Other markets: ${others}.` : "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const token = String(req.headers.get("x-v7-token") ?? body?.token ?? "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date ?? ""))
    ? String(body.date) : isoDate(body.day === "today" ? 0 : 1);
  const phase = String(body.phase ?? "start");
  const force = body.force === true;
  // refresh=true (the 05:00 safety run): re-analyse the date with the latest
  // data and UPDATE existing picks in place. Never deletes the day's picks,
  // never touches matches v7 does not regenerate, never creates duplicates.
  const refresh = body.refresh === true;
  // Tomorrow-only: today or past dates are never (re)generated unless
  // explicitly forced or this is a refresh run.
  if (phase === "start" && date <= isoDate(0) && !force && !refresh) {
    return json({ skipped: true, reason: "v7 generates tomorrow only", date });
  }

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (!token) return json({ error: "forbidden" }, 403);
  const { data: ok, error: tokErr } = await sb.rpc("v7_verify_token", { p_token: token });
  if (tokErr || ok !== true) return json({ error: "forbidden" }, 403);
  RUN_TOKEN = token;
  const key = Deno.env.get("API_FOOTBALL_KEY");
  if (!key) return json({ error: "API key missing" }, 500);

  if (phase === "start") {
    // Refresh runs always proceed — their whole point is to re-analyse a date
    // that already has picks.
    if (!refresh) {
      const { data: published } = await sb.from("ai_predictions").select("id").eq("match_date", date).eq("engine_version", ENGINE_VERSION).limit(1);
      if (published?.length && !force) return json({ skipped: true, reason: "already published", date });
      // Never replace a day that already has old-engine picks unless explicitly forced.
      const { data: legacy } = await sb.from("ai_predictions").select("id").eq("match_date", date).is("engine_version", null).limit(1);
      if (legacy?.length && !force) return json({ skipped: true, reason: "old-engine picks exist for this date", date });
    }

    const all = await api(`/fixtures?date=${date}&timezone=UTC`, key);
    if (!all) return json({ error: "fixtures fetch failed" }, 502);
    const now = Date.now() / 1000;
    const rows = all
      .filter((f: any) => ["NS", "TBD"].includes(f.fixture?.status?.short) && f.fixture.timestamp > now && !isWorldCup(f.league?.id, f.league?.name))
      .map((f: any) => ({
        match_id: String(f.fixture.id), match_date: date,
        league_tier: classifyLeague(f.league.id, f.league.name, f.teams.home.name, f.teams.away.name),
        fixture: f,
      }));
    await sb.from("ai_engine_v7_analysis").delete().eq("match_date", date);
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from("ai_engine_v7_analysis").insert(rows.slice(i, i + 200));
      if (error) return json({ error: "staging insert failed", details: error.message }, 500);
    }
    const worldCup = all.filter((f: any) => isWorldCup(f.league?.id, f.league?.name)).length;
    console.log(`[v7] start ${date}: fixtures=${all.length} staged=${rows.length} worldCupExcluded=${worldCup}`);
    chain({ date, phase: "analyse", force, refresh });
    return json({ started: true, date, staged: rows.length, worldCupExcluded: worldCup, refresh });
  }

  if (phase === "analyse") {
    const { data: batch, error } = await sb.from("ai_engine_v7_analysis")
      .select("id, fixture").eq("match_date", date).is("result", null).is("error", null)
      .order("league_tier").order("match_id").limit(BATCH);
    if (error) return json({ error: error.message }, 500);
    if (!batch?.length) { chain({ date, phase: "publish", force, refresh }); return json({ analysed: 0, next: "publish" }); }
    for (let i = 0; i < batch.length; i += CONC) {
      await Promise.all(batch.slice(i, i + CONC).map(async (row: any) => {
        try {
          const out = await analyseFixture(row.fixture, key);
          await sb.from("ai_engine_v7_analysis").update({ result: out.result }).eq("id", row.id);
        } catch (e) {
          await sb.from("ai_engine_v7_analysis").update({ error: String(e).slice(0, 500) }).eq("id", row.id);
        }
      }));
    }
    chain({ date, phase: "analyse", force, refresh });
    return json({ analysed: batch.length });
  }

  if (phase === "publish") {
    const rows: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await sb.from("ai_engine_v7_analysis").select("match_id, league_tier, fixture, result")
        .eq("match_date", date).not("result", "is", null).range(from, from + 999);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    const byId = new Map(rows.map((r) => [r.match_id, r]));
    const pool: PoolItem[] = rows.map((r) => ({ id: r.match_id, tier: r.league_tier, result: r.result }));
    const a = allocate(pool);
    const tierOf = new Map<string, string>();
    a.premium.forEach((i) => tierOf.set(i.id, "premium"));
    a.pro.forEach((i) => tierOf.set(i.id, "pro"));
    a.free.forEach((i) => tierOf.set(i.id, "free"));

    const matchDay = date === isoDate(0) ? "today" : "tomorrow";
    const inserts = [...a.premium, ...a.pro, ...a.free].map((i) => {
      const src = byId.get(i.id)!;
      const f = src.fixture, r = src.result;
      const conf: Record<string, number> = {};
      for (const [k, p] of Object.entries(r.markets as Record<string, number>)) conf[k] = finalConfidence(p, r.data_quality);
      const tier = tierOf.get(i.id)!;
      return {
        match_id: i.id,
        home_team: f.teams.home.name, away_team: f.teams.away.name, league: f.league.name,
        match_date: date, match_day: matchDay,
        match_time: String(f.fixture.date).split("T")[1]?.slice(0, 5) ?? null,
        match_timestamp: f.fixture.date,
        prediction: r.main_market, confidence: r.confidence, predicted_score: r.predicted_score,
        home_win: Math.round(r.markets["1"]), draw: Math.round(r.markets["X"]), away_win: Math.round(r.markets["2"]),
        risk_level: r.confidence >= 85 ? "low" : r.confidence >= 75 ? "medium" : "high",
        analysis: analysisText(r), key_factors: r.sources_used ?? null,
        xg_home: r.xg_home, xg_away: r.xg_away,
        xg_total: Math.round((r.xg_home + r.xg_away) * 100) / 100,
        xg_diff: Math.round((r.xg_home - r.xg_away) * 100) / 100,
        xg_source: "engine_v7",
        is_premium: tier === "premium", is_locked: false, is_safe_pick: tier === "premium", is_diamond: false,
        is_live: false, result_status: "pending",
        engine_version: ENGINE_VERSION,
        market_probs: { raw: r.markets, confidence: conf, combos: r.combos, correct_scores: r.correct_scores },
        main_market: r.main_market, main_probability: r.main_probability,
        data_quality: r.data_quality, data_quality_label: r.data_quality_label,
        league_tier: i.tier, publish_tier: tier,
      };
    });

    // Replace only rows this run actually regenerates. Existing picks for the
    // date that v7 does not cover (e.g. today's already-published picks) stay
    // untouched; overlapping ones are updated to the v7 result.
    const newMatchIds = inserts.map((r) => r.match_id);
    if (newMatchIds.length) {
      const { error: delErr } = await sb.from("ai_predictions").delete()
        .eq("match_date", date).in("match_id", newMatchIds);
      if (delErr) return json({ error: "delete failed", details: delErr.message }, 500);
    }
    if (inserts.length) {
      const { error: insErr } = await sb.from("ai_predictions").insert(inserts);
      if (insErr) return json({ error: "insert failed", details: insErr.message }, 500);
    }
    const summary = {
      date, engine: ENGINE_VERSION, analysed: rows.length, published: inserts.length,
      premium: a.premium.length, pro: a.pro.length, free: a.free.length,
      storedOnly6569: a.analysedOnly.length, limitedHeld: a.limitedHeld.length, unplaced: a.unplaced.length,
    };
    console.log("[v7] publish", JSON.stringify(summary));
    return json(summary);
  }

  return json({ error: "unknown phase" }, 400);
});
