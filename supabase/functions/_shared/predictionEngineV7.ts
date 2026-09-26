// Engine v7 — one market-based prediction engine.
// Pure TypeScript (no Deno/Node APIs) so it can be unit-tested anywhere.
//
// Fixture data -> team ratings -> expected goals -> (odds calibration)
// -> Dixon-Coles Poisson grid -> ALL market probabilities -> data quality
// -> final confidence -> market ranking -> main pick.

import type { LeagueTier } from "./leaguePriorityV7.ts";

export const ENGINE_VERSION = "v7";
export const MIN_PUBLISH_CONFIDENCE = 65;
export const MIN_QUALITY_ANALYSE = 30;   // below → rejected (insufficient data)
export const QUALITY_MEDIUM = 50;
export const QUALITY_HIGH = 75;
export const PREMIUM_MIN_CONFIDENCE = 85;
export const CAPS = { premium: 10, pro: 10, free: 10 };
const MAX_GOALS = 8;
const DC_RHO = -0.08;
export const BASE_RATE_WEIGHT = 0.8;
// Minimum excess over base rate for a market to count as a real signal
// (e.g. Over 1.5 needs ≥85%, Under 3.5 ≥83%, Over 2.5 ≥67%, Home Win 65%).
export const MIN_SIGNAL_SCORE = 25;

// ---------------- Input types ----------------
export interface VenueStats { played: number; goalsFor: number; goalsAgainst: number } // totals
export interface MatchScore { for: number; against: number }
export interface H2HMatch { homeGoals: number; awayGoals: number; homeIsFixtureHome: boolean }
export interface OddsInput {
  bookmakers: number;
  home?: number; draw?: number; away?: number;     // decimal consensus
  over25?: number; under25?: number;
  bttsYes?: number; bttsNo?: number;
}
export interface LeagueAverages { homeGoals: number; awayGoals: number; matches: number }

export interface FixtureInput {
  tier: LeagueTier;
  league: LeagueAverages | null;
  homeSeasonVenue: VenueStats | null;   // home team's HOME season record
  awaySeasonVenue: VenueStats | null;   // away team's AWAY season record
  homeSeasonAll: VenueStats | null;
  awaySeasonAll: VenueStats | null;
  homeForm: MatchScore[];               // last up-to-10 real results, any venue
  awayForm: MatchScore[];
  h2h: H2HMatch[];
  odds: OddsInput | null;
  injuries: { home: number; away: number } | null; // null = source unavailable
}

export type MarketKey =
  | "1" | "X" | "2"
  | "Over 1.5" | "Under 1.5" | "Over 2.5" | "Under 2.5" | "Over 3.5" | "Under 3.5"
  | "BTTS Yes" | "BTTS No";

export interface EngineResult {
  engine_version: string;
  xg_home: number; xg_away: number;
  markets: Record<MarketKey, number>;        // probability 0-100 (1 decimal)
  combos: Record<string, number>;
  correct_scores: { score: string; p: number }[];
  main_market: string;
  main_probability: number;
  confidence: number;
  data_quality: number;
  data_quality_label: "HIGH" | "MEDIUM" | "LIMITED";
  quality_breakdown: Record<string, number>;
  sources_used: string[];
  predicted_score: string;
  market_scores: { market: string; p: number; score: number }[];
  rejected?: string;
}

// Natural base rates (European top-flight averages) used to measure edge,
// so markets that are "usually true" (Over 1.5) don't win automatically.
export const BASE_RATES: Record<MarketKey, number> = {
  "1": 0.45, "X": 0.26, "2": 0.29,
  "Over 1.5": 0.75, "Under 1.5": 0.25,
  "Over 2.5": 0.52, "Under 2.5": 0.48,
  "Over 3.5": 0.28, "Under 3.5": 0.72,
  "BTTS Yes": 0.52, "BTTS No": 0.48,
};

// Generic priors used ONLY as shrinkage targets for thin samples (never as data).
const PRIOR_HOME_GOALS = 1.45;
const PRIOR_AWAY_GOALS = 1.15;

// ---------------- Math helpers ----------------
function pois(l: number, k: number): number {
  let f = 1; for (let i = 2; i <= k; i++) f *= i;
  return Math.exp(-l) * Math.pow(l, k) / f;
}
function dcTau(h: number, a: number, lh: number, la: number): number {
  if (h === 0 && a === 0) return 1 - lh * la * DC_RHO;
  if (h === 0 && a === 1) return 1 + lh * DC_RHO;
  if (h === 1 && a === 0) return 1 + la * DC_RHO;
  if (h === 1 && a === 1) return 1 - DC_RHO;
  return 1;
}
export function scoreGrid(lh: number, la: number): number[][] {
  const g: number[][] = [];
  let sum = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    g[h] = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = Math.max(0, pois(lh, h) * pois(la, a) * dcTau(h, a, lh, la));
      g[h][a] = p; sum += p;
    }
  }
  for (let h = 0; h <= MAX_GOALS; h++) for (let a = 0; a <= MAX_GOALS; a++) g[h][a] /= sum;
  return g;
}
export function marketsFromGrid(g: number[][]): Record<MarketKey, number> {
  let p1 = 0, px = 0, p2 = 0, o15 = 0, o25 = 0, o35 = 0, btts = 0;
  for (let h = 0; h <= MAX_GOALS; h++) for (let a = 0; a <= MAX_GOALS; a++) {
    const p = g[h][a];
    if (h > a) p1 += p; else if (h === a) px += p; else p2 += p;
    const t = h + a;
    if (t >= 2) o15 += p; if (t >= 3) o25 += p; if (t >= 4) o35 += p;
    if (h >= 1 && a >= 1) btts += p;
  }
  return {
    "1": p1, "X": px, "2": p2,
    "Over 1.5": o15, "Under 1.5": 1 - o15,
    "Over 2.5": o25, "Under 2.5": 1 - o25,
    "Over 3.5": o35, "Under 3.5": 1 - o35,
    "BTTS Yes": btts, "BTTS No": 1 - btts,
  };
}
function combosFromGrid(g: number[][]): Record<string, number> {
  const c: Record<string, number> = {
    "BTTS Yes & Over 2.5": 0, "BTTS No & Under 2.5": 0,
    "1 & Over 1.5": 0, "2 & Over 1.5": 0, "1 & BTTS No": 0, "2 & BTTS No": 0,
    "1X & Under 3.5": 0, "X2 & Under 3.5": 0,
  };
  for (let h = 0; h <= MAX_GOALS; h++) for (let a = 0; a <= MAX_GOALS; a++) {
    const p = g[h][a], t = h + a, bt = h >= 1 && a >= 1;
    if (bt && t >= 3) c["BTTS Yes & Over 2.5"] += p;
    if (!bt && t <= 2) c["BTTS No & Under 2.5"] += p;
    if (h > a && t >= 2) c["1 & Over 1.5"] += p;
    if (a > h && t >= 2) c["2 & Over 1.5"] += p;
    if (h > a && !bt) c["1 & BTTS No"] += p;
    if (a > h && !bt) c["2 & BTTS No"] += p;
    if (h >= a && t <= 3) c["1X & Under 3.5"] += p;
    if (a >= h && t <= 3) c["X2 & Under 3.5"] += p;
  }
  return c;
}
const r1 = (x: number) => Math.round(x * 1000) / 10;

// ---------------- Ratings ----------------
interface Rating { attack: number; defence: number; n: number }

/** Weighted blend of available sources, then shrinkage toward 1.0 by sample size. */
function teamRating(
  venue: VenueStats | null, all: VenueStats | null, form: MatchScore[], h2hFor: number[], h2hAgainst: number[],
  venueFor: number, venueAgainst: number, overallAvg: number,
): Rating {
  const parts: { att: number; def: number; w: number; n: number }[] = [];
  if (venue && venue.played >= 2) {
    parts.push({ att: venue.goalsFor / venue.played / venueFor, def: venue.goalsAgainst / venue.played / venueAgainst, w: 0.35, n: venue.played });
  }
  if (all && all.played >= 3) {
    parts.push({ att: all.goalsFor / all.played / overallAvg, def: all.goalsAgainst / all.played / overallAvg, w: 0.15, n: all.played });
  }
  if (form.length >= 3) {
    const gf = form.reduce((s, m) => s + m.for, 0) / form.length;
    const ga = form.reduce((s, m) => s + m.against, 0) / form.length;
    parts.push({ att: gf / overallAvg, def: ga / overallAvg, w: 0.3, n: form.length });
  }
  if (h2hFor.length >= 3) {
    const gf = h2hFor.reduce((s, x) => s + x, 0) / h2hFor.length;
    const ga = h2hAgainst.reduce((s, x) => s + x, 0) / h2hAgainst.length;
    parts.push({ att: gf / overallAvg, def: ga / overallAvg, w: 0.1, n: h2hFor.length });
  }
  if (!parts.length) return { attack: 1, defence: 1, n: 0 };
  const wSum = parts.reduce((s, p) => s + p.w, 0);
  let att = parts.reduce((s, p) => s + p.att * p.w, 0) / wSum;
  let def = parts.reduce((s, p) => s + p.def * p.w, 0) / wSum;
  const n = Math.max(...parts.map((p) => p.n));
  const K = 5; // shrinkage strength (matches)
  att = (n * att + K) / (n + K);
  def = (n * def + K) / (n + K);
  return { attack: Math.max(0.25, Math.min(3, att)), defence: Math.max(0.25, Math.min(3, def)), n };
}

// ---------------- Odds calibration ----------------
function impliedFromOdds(o: OddsInput) {
  const out: Partial<Record<MarketKey, number>> = {};
  if (o.home && o.draw && o.away) {
    const s = 1 / o.home + 1 / o.draw + 1 / o.away;
    out["1"] = 1 / o.home / s; out["X"] = 1 / o.draw / s; out["2"] = 1 / o.away / s;
  }
  if (o.over25 && o.under25) {
    const s = 1 / o.over25 + 1 / o.under25; out["Over 2.5"] = 1 / o.over25 / s;
  }
  if (o.bttsYes && o.bttsNo) {
    const s = 1 / o.bttsYes + 1 / o.bttsNo; out["BTTS Yes"] = 1 / o.bttsYes / s;
  }
  return out;
}
/** Find (lh, la) whose grid best matches the market's implied probabilities. */
function marketLambdas(target: Partial<Record<MarketKey, number>>): { lh: number; la: number } | null {
  const keys = Object.keys(target) as MarketKey[];
  if (!keys.length || target["1"] === undefined) return null;
  let best = { lh: 1.4, la: 1.1, err: Infinity };
  for (let lh = 0.2; lh <= 4.0; lh += 0.1) for (let la = 0.2; la <= 4.0; la += 0.1) {
    const m = marketsFromGrid(scoreGrid(lh, la));
    let err = 0; for (const k of keys) err += (m[k] - (target[k] as number)) ** 2;
    if (err < best.err) best = { lh, la, err };
  }
  return { lh: best.lh, la: best.la };
}

// ---------------- Data quality ----------------
function dataQuality(f: FixtureInput): { score: number; breakdown: Record<string, number>; sources: string[] } {
  const b: Record<string, number> = {};
  const sources: string[] = [];
  const seasonPts = (v: VenueStats | null) => (v ? Math.min(v.played, 8) / 8 * 12.5 : 0);
  b.season = seasonPts(f.homeSeasonAll) + seasonPts(f.awaySeasonAll);
  if (b.season > 0) sources.push("season stats");
  b.form = Math.min(f.homeForm.length, 10) / 10 * 12.5 + Math.min(f.awayForm.length, 10) / 10 * 12.5;
  if (b.form > 0) sources.push("recent form");
  b.venue = (f.homeSeasonVenue?.played ?? 0) >= 3 && (f.awaySeasonVenue?.played ?? 0) >= 3 ? 10
    : (f.homeSeasonVenue?.played ?? 0) >= 1 && (f.awaySeasonVenue?.played ?? 0) >= 1 ? 5 : 0;
  if (b.venue > 0) sources.push("home/away split");
  const bk = f.odds && f.odds.home ? f.odds.bookmakers : 0;
  b.odds = Math.min(bk, 5) / 5 * 20;
  if (b.odds > 0) sources.push("bookmaker odds");
  b.h2h = f.h2h.length >= 3 ? 5 : f.h2h.length > 0 ? 2 : 0;
  if (b.h2h > 0) sources.push("head-to-head");
  b.injuries = f.injuries ? 5 : 0;
  if (b.injuries > 0) sources.push("injuries");
  b.tier = f.tier === 1 ? 10 : f.tier === 2 ? 6 : 2;
  const score = Math.round(Object.values(b).reduce((s, x) => s + x, 0));
  return { score, breakdown: Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v * 10) / 10])), sources };
}

export function finalConfidence(pPct: number, quality: number): number {
  const rel = 0.55 + 0.45 * (quality / 100);
  return Math.round(50 + (pPct - 50) * rel);
}
export function qualityLabel(q: number): "HIGH" | "MEDIUM" | "LIMITED" {
  return q >= QUALITY_HIGH ? "HIGH" : q >= QUALITY_MEDIUM ? "MEDIUM" : "LIMITED";
}

// ---------------- Main pick ----------------
export function rankMarkets(markets: Record<MarketKey, number>): { market: string; p: number; score: number }[] {
  return (Object.keys(BASE_RATES) as MarketKey[])
    .map((k) => {
      const p = markets[k], base = BASE_RATES[k];
      // Excess over the market's natural base rate: a 90% Over 1.5 (usually
      // true 75% of the time) ranks below a 78% Over 2.5 (usually 52%).
      return { market: k, p: r1(p), score: Math.round((p - BASE_RATE_WEIGHT * base) * 1000) / 10 };
    })
    .sort((a, b) => b.score - a.score);
}

// ---------------- Main market selection ----------------
// MAIN is chosen by FINAL CONFIDENCE (c), never by raw probability (p).
// Strongest final confidence wins, but among eligible markets within
// PREFERENCE_MARGIN pp of the strongest, the more informative market is
// preferred. Preference order (0 = most informative). Never changes any
// probability, never picks a market more than the margin weaker.
export const PREFERENCE_MARGIN = 5;
export const MARKET_PREFERENCE: Record<string, number> = {
  "Over 2.5": 0, "Under 2.5": 0,
  "BTTS Yes": 1, "BTTS No": 1,
  "1": 2, "X": 2, "2": 2,
  "Over 3.5": 3, "Under 3.5": 3,
  "Over 1.5": 4, "Under 1.5": 4,
};
export function selectMain<T extends { market: string; p: number; c: number }>(eligible: T[]): T {
  const maxC = Math.max(...eligible.map((r) => r.c));
  const near = eligible.filter((r) => maxC - r.c <= PREFERENCE_MARGIN);
  near.sort((a, b) => (MARKET_PREFERENCE[a.market] ?? 9) - (MARKET_PREFERENCE[b.market] ?? 9) || b.c - a.c);
  return near[0];
}

function predictedScoreFor(g: number[][], market: string): string {
  const ok = (h: number, a: number) => {
    const t = h + a, bt = h >= 1 && a >= 1;
    switch (market) {
      case "1": return h > a; case "X": return h === a; case "2": return a > h;
      case "Over 1.5": return t >= 2; case "Under 1.5": return t <= 1;
      case "Over 2.5": return t >= 3; case "Under 2.5": return t <= 2;
      case "Over 3.5": return t >= 4; case "Under 3.5": return t <= 3;
      case "BTTS Yes": return bt; case "BTTS No": return !bt;
      default: return true;
    }
  };
  let best = { s: "1-1", p: -1 };
  for (let h = 0; h <= 6; h++) for (let a = 0; a <= 6; a++) if (ok(h, a) && g[h][a] > best.p) best = { s: `${h}-${a}`, p: g[h][a] };
  return best.s;
}

// ---------------- Engine ----------------
export function runEngine(f: FixtureInput): EngineResult {
  const q = dataQuality(f);
  const leagueHome = f.league && f.league.matches >= 10
    ? (f.league.homeGoals * f.league.matches + PRIOR_HOME_GOALS * 20) / (f.league.matches + 20)
    : PRIOR_HOME_GOALS;
  const leagueAway = f.league && f.league.matches >= 10
    ? (f.league.awayGoals * f.league.matches + PRIOR_AWAY_GOALS * 20) / (f.league.matches + 20)
    : PRIOR_AWAY_GOALS;
  const overall = (leagueHome + leagueAway) / 2;

  const hH2hFor = f.h2h.map((m) => (m.homeIsFixtureHome ? m.homeGoals : m.awayGoals));
  const hH2hAg = f.h2h.map((m) => (m.homeIsFixtureHome ? m.awayGoals : m.homeGoals));
  const home = teamRating(f.homeSeasonVenue, f.homeSeasonAll, f.homeForm, hH2hFor, hH2hAg, leagueHome, leagueAway, overall);
  const away = teamRating(f.awaySeasonVenue, f.awaySeasonAll, f.awayForm, hH2hAg, hH2hFor, leagueAway, leagueHome, overall);

  let lh = leagueHome * home.attack * away.defence;
  let la = leagueAway * away.attack * home.defence;

  // Odds calibration (weight grows with bookmaker count, max 35%)
  if (f.odds && f.odds.bookmakers > 0) {
    const ml = marketLambdas(impliedFromOdds(f.odds));
    if (ml) {
      const w = Math.min(0.35, 0.1 + 0.05 * f.odds.bookmakers);
      lh = Math.exp((1 - w) * Math.log(lh) + w * Math.log(ml.lh));
      la = Math.exp((1 - w) * Math.log(la) + w * Math.log(ml.la));
    }
  }
  // Injuries: −1.5% per listed absentee, max −10%
  if (f.injuries) {
    lh *= 1 - Math.min(0.10, f.injuries.home * 0.015);
    la *= 1 - Math.min(0.10, f.injuries.away * 0.015);
  }
  lh = Math.max(0.15, Math.min(4.5, lh));
  la = Math.max(0.15, Math.min(4.5, la));

  const g = scoreGrid(lh, la);
  const m = marketsFromGrid(g);
  const markets = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, r1(v)])) as Record<MarketKey, number>;
  const combos = Object.fromEntries(Object.entries(combosFromGrid(g)).map(([k, v]) => [k, r1(v)]));
  const scores: { score: string; p: number }[] = [];
  for (let h = 0; h <= 6; h++) for (let a = 0; a <= 6; a++) scores.push({ score: `${h}-${a}`, p: r1(g[h][a]) });
  scores.sort((a, b) => b.p - a.p);

  const ranked = rankMarkets(m);
  // Eligible = probability >= 65. Never rejected for being Over 1.5 / Under 3.5.
  // MAIN is selected on FINAL CONFIDENCE (c = finalConfidence(p, quality)),
  // not on the raw market probability shown in the market cards.
  const withConf = ranked.map((r) => ({ ...r, c: finalConfidence(r.p, q.score) }));
  const eligible = withConf.filter((r) => r.p >= MIN_PUBLISH_CONFIDENCE);
  const top = eligible.length ? selectMain(eligible) : [...withConf].sort((a, b) => b.c - a.c)[0];
  let main = top.market, mainP = top.p, mainConf = top.c;
  // Correct score only with very strong data AND ≥65% (rare by design)
  if (q.score >= QUALITY_HIGH && scores[0].p >= 65) {
    main = `Correct Score ${scores[0].score}`; mainP = scores[0].p;
    mainConf = finalConfidence(mainP, q.score);
  }

  const result: EngineResult = {
    engine_version: ENGINE_VERSION,
    xg_home: Math.round(lh * 100) / 100,
    xg_away: Math.round(la * 100) / 100,
    markets, combos,
    correct_scores: scores.slice(0, 5),
    main_market: main,
    main_probability: mainP,
    confidence: mainConf,
    data_quality: q.score,
    data_quality_label: qualityLabel(q.score),
    quality_breakdown: q.breakdown,
    sources_used: q.sources,
    predicted_score: main.startsWith("Correct Score") ? main.slice(14) : predictedScoreFor(g, main),
    market_scores: ranked.slice(0, 5),
  };
  if (q.score < MIN_QUALITY_ANALYSE) result.rejected = "insufficient_data";
  else if (!eligible.length && !main.startsWith("Correct Score")) result.rejected = "no_strong_signal";
  else if (home.n === 0 || away.n === 0) result.rejected = "no_team_data";
  return result;
}

// ---------------- Pool allocation ----------------
export interface PoolItem { id: string; tier: LeagueTier; result: EngineResult }
export type TierName = "premium" | "pro" | "free";

export function rankScore(i: PoolItem): number {
  const bonus = i.tier === 1 ? 1.5 : i.tier === 2 ? 0.5 : 0;
  return i.result.confidence + i.result.data_quality / 25 + bonus;
}

// Minimum user-facing confidence. 65–69 is analysed/stored only, never published.
export const MIN_USER_CONFIDENCE = 70;


/**
 * Tier 1/2 always get publication slots before Tier 3 (Tier 3 = fallback only).
 * Priority never changes confidence or thresholds — it only orders qualified items.
 * Unused Premium slots roll down to Pro (then Free); Premium criteria are never lowered.
 */
export function allocate(pool: PoolItem[]): { premium: PoolItem[]; pro: PoolItem[]; free: PoolItem[]; limitedHeld: PoolItem[]; analysedOnly: PoolItem[]; unplaced: PoolItem[] } {
  const notRejected = pool.filter((i) => !i.result.rejected);
  const analysedOnly = notRejected.filter((i) => i.result.confidence >= MIN_PUBLISH_CONFIDENCE && i.result.confidence < MIN_USER_CONFIDENCE);
  const byPriority = (a: PoolItem, b: PoolItem) => {
    const pa = a.tier === 3 ? 1 : 0, pb = b.tier === 3 ? 1 : 0;
    return pa - pb || rankScore(b) - rankScore(a);
  };
  const qualified = notRejected.filter((i) => i.result.confidence >= MIN_USER_CONFIDENCE).sort(byPriority);
  const limitedHeld = qualified.filter((i) => i.result.data_quality < QUALITY_MEDIUM);
  const publishable = qualified.filter((i) => i.result.data_quality >= QUALITY_MEDIUM);
  const used = new Set<string>();

  // Premium: conf ≥85 AND HIGH quality, never lowered. Tier 1/2 first, Tier 3 only remaining capacity.
  const premium = publishable
    .filter((i) => i.result.confidence >= PREMIUM_MIN_CONFIDENCE && i.result.data_quality >= QUALITY_HIGH)
    .slice(0, CAPS.premium);
  premium.forEach((i) => used.add(i.id));

  const unusedPremium = CAPS.premium - premium.length;
  const proCap = CAPS.pro + unusedPremium;
  const slots = proCap + CAPS.free;
  const rest = publishable.filter((i) => !used.has(i.id));
  const placed = rest.slice(0, slots); // already Tier 1/2 first, then rankScore
  const placedIds = new Set(placed.map((i) => i.id));
  const pro = placed.slice(0, proCap);
  const free = placed.slice(proCap);
  const unplaced = rest.filter((i) => !placedIds.has(i.id));
  return { premium, pro, free, limitedHeld, analysedOnly, unplaced };
}
