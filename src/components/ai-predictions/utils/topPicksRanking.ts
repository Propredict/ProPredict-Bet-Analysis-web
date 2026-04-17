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
 * Pick top N predictions ranked by composite score.
 * Filters out matches that are already finished (won/lost) to keep focus on upcoming.
 */
export function selectTopPicks(predictions: AIPrediction[], limit: number): RankedPick[] {
  const upcoming = predictions.filter(
    (p) => !p.result_status || p.result_status === "pending",
  );
  return upcoming
    .map(calcTopPickScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
