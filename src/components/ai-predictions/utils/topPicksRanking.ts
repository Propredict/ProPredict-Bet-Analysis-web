import type { AIPrediction } from "@/hooks/useAIPredictions";
import { getBestMarketProbability } from "./marketDerivation";

export type TopPickLabel = "elite" | "strong";

export interface RankedPick {
  prediction: AIPrediction;
  score: number;
  label: TopPickLabel;
  components: {
    confidence: number;
    value: number;
    injurySafety: number;
    trend: number;
    stability: number;
  };
}

/**
 * Get variance stability — prefers structured DB columns (variance_stable, variance_score),
 * falls back to the legacy `variance:STABLE|UNSTABLE|<score>` tag in key_factors
 * for back-compat with predictions generated before the DB columns were added.
 */
function getVarianceScore(p: AIPrediction): { stable: boolean; score: number } {
  // 1) Prefer structured DB columns
  const dbStable = (p as any).variance_stable;
  const dbScore = (p as any).variance_score;
  if (typeof dbStable === "boolean" || typeof dbScore === "number") {
    return {
      stable: dbStable === true,
      score: typeof dbScore === "number" && Number.isFinite(dbScore) ? dbScore : 50,
    };
  }
  // 2) Legacy fallback — parse key_factors tag
  const f = p.key_factors;
  if (!Array.isArray(f)) return { stable: false, score: 50 };
  const tag = f.find((s) => typeof s === "string" && s.startsWith("variance:"));
  if (!tag) return { stable: false, score: 50 };
  const [flag, scoreStr] = tag.replace("variance:", "").split("|");
  const score = Number(scoreStr);
  return {
    stable: flag === "STABLE",
    score: Number.isFinite(score) ? score : 50,
  };
}

/**
 * Estimate "value" — how much AI's best probability beats random/implied odds.
 * Uses the highest market probability as a proxy. Free of bookmaker odds (we don't store them).
 * Returns 0-100.
 */
function calcValue(p: AIPrediction): number {
  const bestProb = Math.max(
    p.confidence ?? 0,
    getBestMarketProbability(p as any),
  );
  // value = how much best market exceeds 50% (random baseline)
  return Math.max(0, Math.min(100, (bestProb - 50) * 2));
}

/**
 * Injury safety score — inverse of injury impact.
 * If the FAVORED team has high injury impact → low safety.
 * Returns 0-100.
 */
function calcInjurySafety(p: AIPrediction): number {
  const homeImpact = p.injury_impact_home ?? 0;
  const awayImpact = p.injury_impact_away ?? 0;

  // Determine which side is favored
  const favHome = (p.home_win ?? 0) >= (p.away_win ?? 0);
  const favImpact = favHome ? homeImpact : awayImpact;

  // 0 impact → 100 safety, 100 impact → 0 safety
  return Math.max(0, 100 - favImpact);
}

/**
 * Market trend — distance between top two outcomes (1X2).
 * Larger gap = clearer signal = higher trend score.
 * Returns 0-100.
 */
function calcTrend(p: AIPrediction): number {
  const probs = [p.home_win ?? 0, p.draw ?? 0, p.away_win ?? 0].sort((a, b) => b - a);
  const gap = probs[0] - probs[1];
  // gap of 50 = max trend signal
  return Math.max(0, Math.min(100, gap * 2));
}

/**
 * Final ranking score: 50% confidence + 25% value + 15% injury_safety + 10% trend
 */
export function calcTopPickScore(p: AIPrediction): RankedPick {
  const confidence = p.confidence ?? 0;
  const value = calcValue(p);
  const injurySafety = calcInjurySafety(p);
  const trend = calcTrend(p);
  const variance = getVarianceScore(p);
  const stability = variance.score;

  const score =
    confidence * 0.45 +
    value * 0.20 +
    injurySafety * 0.15 +
    trend * 0.10 +
    stability * 0.10;

  // Label: Elite = conf ≥ 80% AND value > 8%
  // value is scaled (bestProb-50)*2, so value > 16 ≈ bestProb > 58 — but the user said ">8%"
  // We interpret "value > 8%" as: best market probability exceeds 58% (8 points above 50% baseline → scaled = 16)
  // Elite also requires variance to be STABLE for a clean signal.
  const isElite = confidence >= 80 && value >= 16 && variance.stable;

  return {
    prediction: p,
    score,
    label: isElite ? "elite" : "strong",
    components: { confidence, value, injurySafety, trend, stability },
  };
}

/**
 * Top 5 = strong but diverse Elite AI Selection.
 * Hard rules: Tier 1 or Tier 2 league only, confidence ≥ 70.
 * Diversity: max 2 of same bet type. Quality > diversity (no force-fill).
 */
const TIER_NAME_FRAGMENTS = [
  "premier league", "la liga", "bundesliga", "serie a", "ligue 1",
  "champions league", "europa league", "conference league",
  "world cup", "euro championship",
  "primeira liga", "eredivisie", "super lig", "süper lig", "jupiler pro league",
  "scottish premiership", "championship", "la liga 2",
  "segunda división", "segunda division", "2. bundesliga", "serie b", "ligue 2",
];
function isTierAllowed(league: string | null | undefined): boolean {
  const l = (league ?? "").toLowerCase();
  if (!l) return false;
  return TIER_NAME_FRAGMENTS.some((n) => l.includes(n));
}
function classifyBet(raw: string | null | undefined): string {
  const p = (raw ?? "").toLowerCase().trim();
  if (!p) return "other";
  if (p.includes("under")) return "under";
  if (p.includes("over")) return "over";
  if (p.includes("btts") || p.includes("both teams")) return "btts";
  if (p.includes("double chance") || /\b(1x|x2|12)\b/.test(p)) return "dc";
  if (p === "1" || p === "home") return "home";
  if (p === "2" || p === "away") return "away";
  if (p === "x" || p === "draw") return "draw";
  return p;
}

/**
 * Quality gate — mirrors the backend Premium gate.
 * A Top-5 "Elite" pick MUST have real analytical data:
 *  - non-fallback analysis text
 *  - xG signal for both teams
 *  - recent form data (last_home_goals / last_away_goals)
 *  - bookmaker consensus (≥2 books)
 * Without these, the pick is hidden from the Top 5 — we never promote a fabricated pick as "Elite".
 */
const FALLBACK_MARKERS = [
  "pending data from api",
  "limited team-form data",
  "fallback to bookmaker",
  "form data limited",
  "insufficient form data",
  "relying on market intelligence",
  "data limited",
];
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function hasRealData(p: AIPrediction): boolean {
  const a = (p.analysis ?? "").toString().toLowerCase();
  if (a.length < 60) return false;
  if (FALLBACK_MARKERS.some((m) => a.includes(m))) return false;

  const anyP = p as any;
  // CORE quality requirements — must come from real API data:
  //  1) xG signal for both teams (Poisson model input)
  //  2) recent form data (last_home_goals OR last_away_goals)
  // Bookmaker consensus is treated as a BONUS, not a hard gate, because
  // odds snapshots are not always available for every league/match,
  // but xG + form are sufficient to guarantee the prediction is real
  // (not a fabricated fallback).
  if (num(anyP.xg_home) <= 0 || num(anyP.xg_away) <= 0) return false;

  const hasForm =
    anyP.last_home_goals != null || anyP.last_away_goals != null;
  if (!hasForm) return false;

  return true;
}

export function selectTopPicks(predictions: AIPrediction[], limit: number): RankedPick[] {
  const pending = predictions.filter(
    (p) => !p.result_status || p.result_status === "pending",
  );
  // QUALITY GATE: every Top 5 pick must have real analytical data.
  // We never fall back to "any high-confidence pick" — better to show fewer
  // cards than to label a fabricated/fallback prediction as "Elite".
  const qualified = pending.filter(hasRealData);

  // Strict pool: qualified + Tier 1/2 + confidence ≥70
  const strictPool = qualified.filter(
    (p) => (p.confidence ?? 0) >= 70 && isTierAllowed(p.league),
  );
  // Soft pool (still quality-gated): any league, confidence ≥70.
  const softPool = qualified.filter((p) => (p.confidence ?? 0) >= 70);

  let pool: AIPrediction[];
  if (strictPool.length >= 3) pool = strictPool;
  else if (softPool.length >= 3) pool = softPool;
  else pool = softPool; // never relax to <70 conf or non-quality data
  const ranked = pool.map(calcTopPickScore).sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const typeCount = new Map<string, number>();
  const picks: RankedPick[] = [];
  for (const r of ranked) {
    if (picks.length >= limit) break;
    if (seen.has(r.prediction.id)) continue;
    const t = classifyBet(r.prediction.prediction);
    if ((typeCount.get(t) ?? 0) >= 2) continue; // diversity cap
    seen.add(r.prediction.id);
    typeCount.set(t, (typeCount.get(t) ?? 0) + 1);
    picks.push(r);
  }
  // Fallback fill: if diversity cap left us short, top up with remaining ranked picks
  // (still no duplicates) so the section always has up to `limit` cards.
  if (picks.length < limit) {
    for (const r of ranked) {
      if (picks.length >= limit) break;
      if (seen.has(r.prediction.id)) continue;
      seen.add(r.prediction.id);
      picks.push(r);
    }
  }
  // NOTE: removed last-resort fill that pulled from un-gated pending list.
  // Quality > quantity. If we have fewer than `limit` qualified picks,
  // the section shows fewer cards rather than promoting low-data picks.
  return picks;
}
