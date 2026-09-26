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

Deno.test("synthetic balanced high-scoring teams → Over 2.5 (not 1X2, not Over 1.5)", () => {
  const r = runEngine(base({
    homeSeasonVenue: { played: 8, goalsFor: 22, goalsAgainst: 18 }, awaySeasonVenue: { played: 8, goalsFor: 20, goalsAgainst: 20 },
    homeSeasonAll: { played: 16, goalsFor: 42, goalsAgainst: 36 }, awaySeasonAll: { played: 16, goalsFor: 40, goalsAgainst: 38 },
    homeForm: form(Array(10).fill([3, 2])), awayForm: form(Array(10).fill([2, 3])),
    odds: { bookmakers: 6, home: 2.5, draw: 4.0, away: 2.6, over25: 1.35, under25: 3.2, bttsYes: 1.4, bttsNo: 2.9 },
  }));
  console.log(JSON.stringify(r.markets), JSON.stringify(r.market_scores), r.xg_home, r.xg_away);
  assertEquals(r.main_market, "Over 2.5");
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

Deno.test("synthetic tight low-scoring teams → Under 2.5", () => {
  const r = runEngine(base({
    homeSeasonVenue: { played: 8, goalsFor: 5, goalsAgainst: 4 }, awaySeasonVenue: { played: 8, goalsFor: 4, goalsAgainst: 5 },
    homeSeasonAll: { played: 16, goalsFor: 10, goalsAgainst: 9 }, awaySeasonAll: { played: 16, goalsFor: 9, goalsAgainst: 10 },
    homeForm: form(Array(10).fill([0, 0])), awayForm: form(Array(10).fill([1, 0])),
    odds: { bookmakers: 6, home: 2.7, draw: 2.9, away: 3.0, over25: 2.9, under25: 1.4, bttsYes: 2.5, bttsNo: 1.5 },
  }));
  console.log(JSON.stringify(r.markets), JSON.stringify(r.market_scores));
  assert(["Under 2.5", "Under 1.5", "BTTS No"].includes(r.main_market), r.main_market);
});

Deno.test("missing H2H / odds / injuries still produces a prediction with lower quality", () => {
  const full = runEngine(base({}));
  const thin = runEngine(base({ h2h: [], odds: null, injuries: null }));
  assert(!thin.rejected);
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
