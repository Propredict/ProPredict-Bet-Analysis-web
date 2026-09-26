import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runEngine, scoreGrid, marketsFromGrid, allocate, finalConfidence, type FixtureInput, type PoolItem } from "../_shared/predictionEngineV7.ts";
import { classifyLeague, isWorldCup } from "../_shared/leaguePriorityV7.ts";

const form = (pairs: [number, number][]) => pairs.map(([f, a]) => ({ for: f, against: a }));
const base = (o: Partial<FixtureInput>): FixtureInput => ({
  tier: 1, league: { homeGoals: 1.5, awayGoals: 1.2, matches: 120 },
  homeSeasonVenue: { played: 8, goalsFor: 12, goalsAgainst: 9 }, awaySeasonVenue: { played: 8, goalsFor: 10, goalsAgainst: 11 },
  homeSeasonAll: { played: 16, goalsFor: 24, goalsAgainst: 20 }, awaySeasonAll: { played: 16, goalsFor: 20, goalsAgainst: 22 },
  homeForm: form(Array(10).fill([1, 1])), awayForm: form(Array(10).fill([1, 1])),
  h2h: [], odds: { bookmakers: 6, home: 2.6, draw: 3.3, away: 2.8, over25: 1.9, under25: 1.95, bttsYes: 1.8, bttsNo: 2.0 },
  injuries: { home: 0, away: 0 }, ...o,
});

Deno.test("grid sums to 1 and markets are consistent", () => {
  const g = scoreGrid(1.6, 1.2);
  const sum = g.flat().reduce((s, x) => s + x, 0);
  assert(Math.abs(sum - 1) < 1e-9);
  const m = marketsFromGrid(g);
  assert(m["Over 2.5"] <= m["Over 1.5"] && m["Over 3.5"] <= m["Over 2.5"]);
  assert(Math.abs(m["1"] + m["X"] + m["2"] - 1) < 1e-9);
});

Deno.test("synthetic balanced high-scoring teams → goals market, never 1X2", () => {
  const r = runEngine(base({
    homeSeasonVenue: { played: 8, goalsFor: 16, goalsAgainst: 14 }, awaySeasonVenue: { played: 8, goalsFor: 14, goalsAgainst: 16 },
    homeSeasonAll: { played: 16, goalsFor: 31, goalsAgainst: 29 }, awaySeasonAll: { played: 16, goalsFor: 29, goalsAgainst: 31 },
    homeForm: form(Array(10).fill([2, 2])), awayForm: form(Array(10).fill([2, 2])),
    odds: { bookmakers: 6, home: 2.5, draw: 4.0, away: 2.6, over25: 1.45, under25: 2.8, bttsYes: 1.5, bttsNo: 2.6 },
  }));
  // O1.5 92.6 vs O2.5 78.7: gap > margin → strongest (O1.5) stays main (spec example 3)
  assertEquals(r.main_market, "Over 1.5");
  assert(r.markets["1"] < 50 && r.markets["2"] < 50);
});

Deno.test("synthetic dominant home side → Home Win, can exceed 75%", () => {
  const r = runEngine(base({
    homeSeasonVenue: { played: 8, goalsFor: 26, goalsAgainst: 3 }, awaySeasonVenue: { played: 8, goalsFor: 4, goalsAgainst: 22 },
    homeSeasonAll: { played: 16, goalsFor: 45, goalsAgainst: 8 }, awaySeasonAll: { played: 16, goalsFor: 9, goalsAgainst: 40 },
    homeForm: form(Array(10).fill([3, 0])), awayForm: form(Array(10).fill([0, 3])),
    odds: { bookmakers: 6, home: 1.15, draw: 8, away: 17, over25: 1.5, under25: 2.6, bttsYes: 2.4, bttsNo: 1.55 },
  }));
  assert(r.markets["1"] > 75, `home ${r.markets["1"]}`);
  assert(["1", "BTTS No"].includes(r.main_market), r.main_market);
});

Deno.test("synthetic tight low-scoring teams → low-goals market", () => {
  const r = runEngine(base({
    homeSeasonVenue: { played: 8, goalsFor: 5, goalsAgainst: 4 }, awaySeasonVenue: { played: 8, goalsFor: 4, goalsAgainst: 5 },
    homeSeasonAll: { played: 16, goalsFor: 10, goalsAgainst: 9 }, awaySeasonAll: { played: 16, goalsFor: 9, goalsAgainst: 10 },
    homeForm: form(Array(10).fill([0, 0])), awayForm: form(Array(10).fill([1, 0])),
    odds: { bookmakers: 6, home: 2.7, draw: 2.9, away: 3.0, over25: 2.9, under25: 1.4, bttsYes: 2.5, bttsNo: 1.5 },
  }));
  // U3.5 98.5 vs U2.5 93.2: raw gap 5.3, but the 5pp margin applies to FINAL
  // CONFIDENCE (shrunk toward 50), so U2.5 is within the margin and wins as
  // the more informative market.
  assertEquals(r.main_market, "Under 2.5");
});

Deno.test("missing H2H / odds / injuries still produces a prediction with lower quality", () => {
  const full = runEngine(base({}));
  const thin = runEngine(base({ h2h: [], odds: null, injuries: null }));
  assert(thin.rejected !== "insufficient_data" && thin.rejected !== "no_team_data");
  assert(thin.data_quality < full.data_quality);
});

Deno.test("very thin data is rejected", () => {
  const r = runEngine(base({
    tier: 3, league: null, homeSeasonVenue: null, awaySeasonVenue: null, homeSeasonAll: null, awaySeasonAll: null,
    homeForm: form([[1, 0]]), awayForm: [], odds: null, injuries: null,
  }));
  assert(r.rejected);
});

Deno.test("high probability with limited data is never Premium nor published", () => {
  assert(finalConfidence(90, 40) < 85);
  const mk = (id: string, tier: 1 | 2 | 3, confidence: number, q: number): PoolItem => ({ id, tier, result: { confidence, data_quality: q } as any });
  const a = allocate([mk("lim", 3, 80, 40), mk("t1weak", 1, 70, 80), mk("t2strong", 2, 84, 80), mk("prem", 1, 88, 90)]);
  assertEquals(a.premium.map((x) => x.id), ["prem"]);
  assertEquals(a.pro[0].id, "t2strong");           // stronger Tier 2 beats weaker Tier 1
  assert(a.limitedHeld.some((x) => x.id === "lim")); // limited data held back
  assert(![...a.pro, ...a.free].some((x) => x.id === "lim"));
});

Deno.test("65–69 never published; Tier 3 never displaces Tier 1/2", () => {
  const mk = (id: string, tier: 1 | 2 | 3, confidence: number, q: number): PoolItem => ({ id, tier, result: { confidence, data_quality: q } as any });
  const pool: PoolItem[] = [mk("t1_68", 1, 68, 80), mk("t1_72", 1, 72, 65), mk("t3_84", 3, 84, 80)];
  for (let i = 0; i < 9; i++) pool.push(mk(`t2_${i}`, 2, 75, 60));
  const a = allocate(pool);
  const pub = [...a.premium, ...a.pro, ...a.free].map((x) => x.id);
  assert(!pub.includes("t1_68"));
  assert(a.analysedOnly.some((x) => x.id === "t1_68"));
  assert(a.pro.some((x) => x.id === "t1_72"));
  const placed = [...a.pro, ...a.free];
  assertEquals(placed[placed.length - 1].id, "t3_84"); // Tier 3 only after all Tier 1/2
});

Deno.test("league classification", () => {
  assertEquals(classifyLeague(39, "Premier League"), 1);
  assertEquals(classifyLeague(44, "FA WSL"), 3);
  assertEquals(classifyLeague(999, "Premier League Women"), 3);
  assertEquals(classifyLeague(98, "J1 League"), 2);
  assertEquals(classifyLeague(12345, "Westfalenliga"), 3);
  assertEquals(classifyLeague(12346, "W-League Cup").valueOf(), 3); // unknown → Tier 3 anyway
  assertEquals(classifyLeague(40, "Championship", "Wigan", "Watford"), 1); // no "W" false positive
  assert(isWorldCup(32, "World Cup - Qualification Europe"));
  assert(!isWorldCup(39, "Premier League"));
});

import { selectMain } from "../_shared/predictionEngineV7.ts";
const mk = (o: Record<string, number>) => Object.entries(o).map(([market, p]) => ({ market, p, c: p }));
Deno.test("main selection: spec example 1 → U3.5 84", () => {
  const r = selectMain(mk({ "Over 1.5": 88, "Under 3.5": 84, "BTTS Yes": 79, "1": 72 }));
  assertEquals([r.market, r.p], ["Under 3.5", 84]);
});
Deno.test("main selection: spec example 2 → U2.5 89", () => {
  const r = selectMain(mk({ "Over 2.5": 72, "Under 2.5": 89, "BTTS Yes": 76, "1": 73 }));
  assertEquals([r.market, r.p], ["Under 2.5", 89]);
});
Deno.test("main selection: spec example 3 → O1.5 91 (never a weaker market for variety)", () => {
  const r = selectMain(mk({ "Over 1.5": 91, "Under 3.5": 76, "Over 2.5": 72 }));
  assertEquals([r.market, r.p], ["Over 1.5", 91]);
});
Deno.test("main selection: O1.5 alone stays main (no rejection)", () => {
  const r = selectMain(mk({ "Over 1.5": 80 }));
  assertEquals(r.market, "Over 1.5");
});
Deno.test("MAIN selection uses final confidence, not raw probability", () => {
  // Spec example: O1.5 raw 99% but final confidence 68%, Home raw 58% but
  // final confidence 76% → MAIN must be Home Win despite the lower raw p.
  const r = selectMain([
    { market: "Over 1.5", p: 99, c: 68 },
    { market: "1", p: 58, c: 76 },
  ]);
  assertEquals([r.market, r.p, r.c], ["1", 58, 76]);
});
Deno.test("engine MAIN is the market with the highest final confidence", () => {
  const r = runEngine(base({}));
  if (!r.main_market.startsWith("Correct Score")) {
    const confs = Object.entries(r.markets).map(([k, p]) => ({ k, c: finalConfidence(p, r.data_quality) }));
    const best = confs.sort((a, b) => b.c - a.c)[0];
    // main must be within the 5pp preference margin of the best final confidence
    assert(best.c - finalConfidence(r.main_probability, r.data_quality) <= 5,
      `main ${r.main_market} conf ${finalConfidence(r.main_probability, r.data_quality)} vs best ${best.k} ${best.c}`);
    assertEquals(r.confidence, finalConfidence(r.main_probability, r.data_quality));
  }
});
Deno.test("allocate: unused Premium slots roll down to Pro", () => {
  const pool = Array.from({ length: 25 }, (_, i) => (({ id: "t" + i, tier: 1 as const, result: { confidence: 75, data_quality: 80 } as any })));
  const a = allocate(pool as PoolItem[]);
  assertEquals(a.premium.length, 0); assertEquals(a.pro.length, 20); assertEquals(a.free.length, 5);
});
