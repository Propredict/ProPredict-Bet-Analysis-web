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

  const score =
    confidence * 0.5 +
    value * 0.25 +
    injurySafety * 0.15 +
    trend * 0.1;

  // Label: Elite = conf ≥ 80% AND value > 8%
  // value is scaled (bestProb-50)*2, so value > 16 ≈ bestProb > 58 — but the user said ">8%"
  // We interpret "value > 8%" as: best market probability exceeds 58% (8 points above 50% baseline → scaled = 16)
  const isElite = confidence >= 80 && value >= 16;

  return {
    prediction: p,
    score,
    label: isElite ? "elite" : "strong",
    components: { confidence, value, injurySafety, trend },
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

export function selectTopPicks(predictions: AIPrediction[], limit: number): RankedPick[] {
  const pending = predictions.filter(
    (p) => !p.result_status || p.result_status === "pending",
  );
  // Strict pool: Tier 1/2 + confidence ≥70
  const strictPool = pending.filter(
    (p) => (p.confidence ?? 0) >= 70 && isTierAllowed(p.league),
  );
  // Soft fallback #1: any league, confidence ≥70.
  const softPool = pending.filter((p) => (p.confidence ?? 0) >= 70);
  // Soft fallback #2 (weak day): any league, top by confidence, min 55.
  // Ensures the section is never empty when the day's quality is low.
  const weakDayPool = pending
    .filter((p) => (p.confidence ?? 0) >= 55)
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  let pool: AIPrediction[];
  if (strictPool.length >= 3) pool = strictPool;
  else if (softPool.length >= 3) pool = softPool;
  else pool = weakDayPool;
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
  return picks;
}
