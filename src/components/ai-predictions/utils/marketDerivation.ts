import type { AIPrediction } from "@/hooks/useAIPredictions";

export interface DerivedMarkets {
  // Goals markets
  goals: {
    over15: { recommended: boolean; value: string };
    over25: { recommended: boolean; value: string };
    under35: { recommended: boolean; value: string };
  };
  // BTTS
  btts: {
    gg: { recommended: boolean };
    ng: { recommended: boolean };
  };
  // Double Chance
  doubleChance: {
    option: "1X" | "12" | "X2";
    recommended: boolean;
  };
  // Combos
  combos: { label: string; recommended: boolean }[];
  // AI Guidance
  guidance: {
    badge: "recommended" | "best-value" | "medium-risk" | "high-risk";
    explanation: string;
  };
}

/**
 * Parse predicted_score like "2-1" into home and away goals
 */
function parseScore(predictedScore: string | null): { home: number; away: number } | null {
  if (!predictedScore) return null;
  const match = predictedScore.match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!match) return null;
  return { home: parseInt(match[1], 10), away: parseInt(match[2], 10) };
}

/**
 * Poisson probability function: P(k) = (λ^k * e^-λ) / k!
 */
function poissonProb(lambda: number, k: number): number {
  let result = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) {
    result *= lambda / i;
  }
  return result;
}

/**
 * Calculate Poisson-based goal market probabilities from predicted score or goal rates.
 * Uses the predicted score to estimate xG for each team.
 */
export interface GoalMarketProbs {
  over15: number;
  over25: number;
  over35: number;
  under15: number;
  under25: number;
  under35: number;
  bttsYes: number;
  bttsNo: number;
}

// Clamp helper: ensure minimum 5% floor on all probabilities
function clampProb(n: number, min = 5, max = 95): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Get the xG values used for Poisson calculations, ensuring consistency
 * across all market derivations (goals, BTTS, correct scores, predicted score).
 */
function getXgValues(prediction: AIPrediction): { homeXg: number; awayXg: number } {
  const lastHomeGoals = (prediction as any).last_home_goals;
  const lastAwayGoals = (prediction as any).last_away_goals;
  
  if (lastHomeGoals && lastHomeGoals > 0 && lastAwayGoals && lastAwayGoals > 0) {
    return { homeXg: Math.max(0.4, lastHomeGoals), awayXg: Math.max(0.3, lastAwayGoals) };
  }
  
  const score = parseScore(prediction.predicted_score);
  if (score) {
    return { homeXg: Math.max(0.4, score.home * 0.85 + 0.2), awayXg: Math.max(0.3, score.away * 0.85 + 0.15) };
  }
  
  // Fallback: derive from 1X2 probabilities
  const hw = prediction.home_win ?? 40;
  const aw = prediction.away_win ?? 30;
  return { homeXg: Math.max(0.5, hw / 30), awayXg: Math.max(0.4, aw / 30) };
}

export function calculateGoalMarketProbs(prediction: AIPrediction): GoalMarketProbs {
  const { homeXg, awayXg } = getXgValues(prediction);

  let over15 = 0, over25 = 0, over35 = 0;
  let bttsYes = 0;

  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const p = poissonProb(homeXg, h) * poissonProb(awayXg, a);
      const total = h + a;
      if (total > 1) over15 += p;
      if (total > 2) over25 += p;
      if (total > 3) over35 += p;
      if (h > 0 && a > 0) bttsYes += p;
    }
  }

  // Apply minimum 5% floor — NEVER return 0
  let o15 = clampProb(over15 * 100);
  let o25 = clampProb(over25 * 100);
  let o35 = clampProb(over35 * 100);
  let by = clampProb(bttsYes * 100);

  // === ANTI-ERROR OVERRIDES (form-based consistency checks) ===
  // When xG values are high, ensure Over/BTTS don't contradict
  const totalXg = homeXg + awayXg;
  
  // Rule 1: High xG → prevent Under-biased output
  if (totalXg >= 2.8 && homeXg >= 1.2 && awayXg >= 1.0) {
    o25 = Math.max(o25, 58); // Floor Over 2.5 at 58%
    by = Math.max(by, 55);   // Floor BTTS Yes at 55%
  }
  
  // Rule 2: Very high xG → strong Over signal
  if (totalXg >= 3.2) {
    o25 = Math.max(o25, 65);
    o35 = Math.max(o35, 40);
  }
  
  // Rule 3: Both teams scoring ability high → prevent BTTS No
  if (homeXg >= 1.3 && awayXg >= 1.1) {
    by = Math.max(by, 55);
  }
  
  // Rule 4: Very low xG → lock Under direction  
  if (totalXg < 1.8) {
    o25 = Math.min(o25, 35);
    by = Math.min(by, 38);
  }

  return {
    over15: o15,
    over25: o25,
    over35: o35,
    under15: clampProb(100 - o15),
    under25: clampProb(100 - o25),
    under35: clampProb(100 - o35),
    bttsYes: by,
    bttsNo: clampProb(100 - by),
  };
}

/**
 * Calculate top correct scores using the same Poisson model as goals/BTTS derivation.
 */
export interface CorrectScorePrediction {
  score: string;
  probability: number;
}

interface RankedCorrectScore extends CorrectScorePrediction {
  home: number;
  away: number;
}

export interface ScoreConstraintOptions {
  marketType?: MarketType;
  safeCombo?: string | null;
  minTotalGoals?: number;
  maxTotalGoals?: number;
  requireBothTeamsToScore?: boolean | null;
}

function calculateRankedCorrectScores(prediction: AIPrediction): RankedCorrectScore[] {
  const { homeXg, awayXg } = getXgValues(prediction);

  const scores: RankedCorrectScore[] = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const p = poissonProb(homeXg, h) * poissonProb(awayXg, a);
      scores.push({ score: `${h}-${a}`, probability: Math.round(p * 1000) / 10, home: h, away: a });
    }
  }

  scores.sort((a, b) => b.probability - a.probability);
  return scores;
}

export function calculateTopCorrectScores(prediction: AIPrediction): CorrectScorePrediction[] {
  return calculateRankedCorrectScores(prediction)
    .slice(0, 3)
    .map(({ score, probability }) => ({ score, probability }));
}

export function getRecommendedScoreConstraints(
  prediction: AIPrediction
): Pick<ScoreConstraintOptions, "minTotalGoals" | "maxTotalGoals" | "requireBothTeamsToScore"> {
  const goalProbs = calculateGoalMarketProbs(prediction);

  let minTotalGoals: number | undefined;
  let maxTotalGoals: number | undefined;
  let requireBothTeamsToScore: boolean | null = null;

  if (goalProbs.over15 >= 55) minTotalGoals = Math.max(minTotalGoals ?? 0, 2);
  if (goalProbs.over25 >= 50) minTotalGoals = Math.max(minTotalGoals ?? 0, 3);
  if (goalProbs.over35 >= 45) minTotalGoals = Math.max(minTotalGoals ?? 0, 4);
  if (goalProbs.under25 >= 55) maxTotalGoals = Math.min(maxTotalGoals ?? Number.POSITIVE_INFINITY, 2);

  if (goalProbs.bttsYes > goalProbs.bttsNo && goalProbs.bttsYes >= 50) {
    requireBothTeamsToScore = true;
  } else if (goalProbs.bttsNo > goalProbs.bttsYes && goalProbs.bttsNo >= 50) {
    requireBothTeamsToScore = false;
  }

  return {
    minTotalGoals,
    maxTotalGoals: Number.isFinite(maxTotalGoals ?? Number.NaN) ? maxTotalGoals : undefined,
    requireBothTeamsToScore,
  };
}

/**
 * Check if a scoreline is consistent with a given market type.
 */
function scoreMatchesMarket(home: number, away: number, market: MarketType): boolean {
  switch (market) {
    case "home_win": return home > away;
    case "away_win": return away > home;
    case "draw": return home === away;
    case "over25": return (home + away) > 2;
    case "under25": return (home + away) <= 2;
    case "btts_yes": return home > 0 && away > 0;
    case "btts_no": return home === 0 || away === 0;
    default: return true;
  }
}

function scoreMatchesConstraintOptions(home: number, away: number, options: ScoreConstraintOptions): boolean {
  const total = home + away;

  if (typeof options.minTotalGoals === "number" && total < options.minTotalGoals) return false;
  if (typeof options.maxTotalGoals === "number" && total > options.maxTotalGoals) return false;
  if (options.requireBothTeamsToScore === true && !(home > 0 && away > 0)) return false;
  if (options.requireBothTeamsToScore === false && !(home === 0 || away === 0)) return false;

  return true;
}

function scoreMatchesSafeCombo(home: number, away: number, safeCombo?: string | null): boolean {
  if (!safeCombo) return true;

  const total = home + away;
  const combo = safeCombo.toUpperCase().replace(/\s+/g, " ").trim();

  if (combo.includes("OVER 1.5") && total <= 1) return false;
  if (combo.includes("OVER 2.5") && total <= 2) return false;
  if (combo.includes("UNDER 3.5") && total >= 4) return false;
  if (combo.includes("UNDER 2.5") && total >= 3) return false;
  if (combo.includes("BTTS YES") && !(home > 0 && away > 0)) return false;
  if (combo.includes("BTTS NO") && !(home === 0 || away === 0)) return false;
  if (combo.includes("DC 1X") && home < away) return false;
  if (combo.includes("DC X2") && away < home) return false;
  if (combo.includes("DC 12") && home === away) return false;
  if ((combo.startsWith("1 ") || combo.startsWith("1 +")) && home <= away) return false;
  if ((combo.startsWith("2 ") || combo.startsWith("2 +")) && away <= home) return false;
  if ((combo.startsWith("X ") || combo.startsWith("X +")) && home !== away) return false;

  return true;
}

export function getConsistentTopCorrectScores(
  prediction: AIPrediction,
  options: ScoreConstraintOptions = {},
  limit = 3
): CorrectScorePrediction[] {
  const rankedScores = calculateRankedCorrectScores(prediction);
  const filteredScores = rankedScores.filter((score) => {
    const matchesMarket = options.marketType ? scoreMatchesMarket(score.home, score.away, options.marketType) : true;
    const matchesExtraConstraints = scoreMatchesConstraintOptions(score.home, score.away, options);
    const matchesSafeCombo = scoreMatchesSafeCombo(score.home, score.away, options.safeCombo);
    return matchesMarket && matchesExtraConstraints && matchesSafeCombo;
  });

  const source = filteredScores.length > 0 ? filteredScores : rankedScores;
  return source.slice(0, limit).map(({ score, probability }) => ({ score, probability }));
}

/**
 * Get the Poisson-derived predicted score aligned with displayed market signals.
 */
export function getDerivedPredictedScore(prediction: AIPrediction, options: ScoreConstraintOptions = {}): string {
  const topScores = getConsistentTopCorrectScores(prediction, options, 1);
  return topScores.length > 0 ? topScores[0].score : prediction.predicted_score ?? "1-0";
}

/**
 * Get confidence explanation based on level
 */
export function getConfidenceExplanation(confidence: number): string {
  if (confidence >= 75) {
    return "Strong form and goal trends support this outcome.";
  } else if (confidence >= 60) {
    return "Balanced matchup with slight edge.";
  } else if (confidence >= 45) {
    return "Competitive fixture with moderate uncertainty.";
  } else {
    return "Unpredictable fixture.";
  }
}

/**
 * Get risk badge based on risk_level and confidence
 */
export function getRiskBadge(
  riskLevel: string | null,
  confidence: number
): "recommended" | "best-value" | "medium-risk" | "high-risk" {
  if (confidence >= 75 && riskLevel === "low") {
    return "recommended";
  } else if (confidence >= 65 && riskLevel !== "high") {
    return "best-value";
  } else if (riskLevel === "high" || confidence < 45) {
    return "high-risk";
  } else {
    return "medium-risk";
  }
}

/**
 * Derive all prediction markets from AI analysis data
 */
export function deriveMarkets(prediction: AIPrediction): DerivedMarkets {
  // Use Poisson-derived data for consistency with Goals/BTTS tabs
  const goalProbs = calculateGoalMarketProbs(prediction);

  // Goals markets derived from Poisson probabilities (consistent with Goals tab)
  const goals = {
    over15: {
      recommended: goalProbs.over15 > 55,
      value: goalProbs.over15 > 55 ? "Yes" : "No",
    },
    over25: {
      recommended: goalProbs.over25 > 55,
      value: goalProbs.over25 > 55 ? "Yes" : "No",
    },
    under35: {
      recommended: goalProbs.over35 < 45,
      value: goalProbs.over35 < 45 ? "Yes" : "No",
    },
  };

  // BTTS derived from Poisson probabilities (consistent with BTTS tab)
  const btts = {
    gg: { recommended: goalProbs.bttsYes > 50 },
    ng: { recommended: goalProbs.bttsNo > 50 },
  };

  // Double Chance derived from main prediction (use 1X2 probabilities for goal market predictions)
  const p = (prediction.prediction || "").toLowerCase();
  const is1X2 = p === "1" || p === "2" || p === "x" || p === "draw";
  const effectivePrediction = is1X2 ? prediction.prediction : 
    ((prediction.home_win ?? 0) >= (prediction.away_win ?? 0) ? "1" : "2");
  
  let doubleChanceOption: "1X" | "12" | "X2" = "1X";
  if (effectivePrediction === "1") {
    doubleChanceOption = "1X";
  } else if (effectivePrediction === "X" || effectivePrediction === "draw") {
    doubleChanceOption = "12";
  } else if (effectivePrediction === "2") {
    doubleChanceOption = "X2";
  }

  const doubleChance = {
    option: doubleChanceOption,
    recommended: true,
  };

  // Combos - max 2 options based on prediction + Poisson probabilities
  const combos: { label: string; recommended: boolean }[] = [];
  
  if (effectivePrediction === "1") {
    if (goalProbs.over15 > 55) {
      combos.push({ label: "1 & Over 1.5", recommended: true });
    }
    if (goalProbs.over25 > 55) {
      combos.push({ label: "1 & Over 2.5", recommended: true });
    } else if (combos.length < 2) {
      combos.push({ label: "1 & Under 2.5", recommended: goalProbs.under25 > 50 });
    }
  } else if (effectivePrediction === "2") {
    if (goalProbs.over15 > 55) {
      combos.push({ label: "2 & Over 1.5", recommended: true });
    }
    if (goalProbs.over25 > 55) {
      combos.push({ label: "2 & Over 2.5", recommended: true });
    } else if (combos.length < 2) {
      combos.push({ label: "2 & Under 2.5", recommended: goalProbs.under25 > 50 });
    }
  } else {
    // Draw combos
    combos.push({ label: "X & Over 1.5", recommended: goalProbs.over15 > 55 });
    if (goalProbs.over35 < 45) {
      combos.push({ label: "X & Under 3.5", recommended: true });
    } else {
      combos.push({ label: "X & Over 2.5", recommended: goalProbs.over25 > 55 });
    }
  }

  // Limit to 2 combos
  const limitedCombos = combos.slice(0, 2);

  // AI Guidance
  const badge = getRiskBadge(prediction.risk_level, prediction.confidence);
  const explanation = getConfidenceExplanation(prediction.confidence);

  return {
    goals,
    btts,
    doubleChance,
    combos: limitedCombos,
    guidance: { badge, explanation },
  };
}

/**
 * Get badge color classes
 */
export function getBadgeStyles(badge: DerivedMarkets["guidance"]["badge"]) {
  switch (badge) {
    case "recommended":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "best-value":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "medium-risk":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "high-risk":
      return "bg-red-500/20 text-red-400 border-red-500/30";
  }
}

/**
 * Get badge label
 */
export function getBadgeLabel(badge: DerivedMarkets["guidance"]["badge"]) {
  switch (badge) {
    case "recommended":
      return "⭐ AI Recommended";
    case "best-value":
      return "🟢 Best Value";
    case "medium-risk":
      return "🟡 Medium Risk";
    case "high-risk":
      return "🔴 High Risk";
  }
}

/**
 * Get risk level color
 */
export function getRiskLevelColor(riskLevel: string | null) {
  switch (riskLevel) {
    case "low":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "high":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

export type MarketType = "home_win" | "away_win" | "draw" | "over25" | "under25" | "btts_yes" | "btts_no";

interface MarketCandidate {
  type: MarketType;
  prob: number;
}

/**
 * Get all market candidates with their probabilities.
 * 1X2 markets get a +5 "primary market" bonus so they compete fairly
 * against conservative Under markets that naturally dominate Poisson output.
 */
function getMarketCandidates(prediction: AIPrediction): MarketCandidate[] {
  let hw = prediction.home_win ?? 33;
  let aw = prediction.away_win ?? 33;
  let d = prediction.draw ?? 34;
  
  // Normalize 1X2 to always sum to 100, with 5% floor
  hw = Math.max(5, hw);
  aw = Math.max(5, aw);
  d = Math.max(5, d);
  const total1x2 = hw + aw + d;
  hw = Math.round((hw / total1x2) * 100);
  aw = Math.round((aw / total1x2) * 100);
  d = 100 - hw - aw;

  const probs = calculateGoalMarketProbs(prediction);

  // +5 bonus for 1X2 markets to prevent Under 2.5 from always dominating
  const PRIMARY_BOOST = 5;

  const candidates: MarketCandidate[] = [
    { type: "home_win", prob: hw + PRIMARY_BOOST },
    { type: "away_win", prob: aw + PRIMARY_BOOST },
    { type: "draw", prob: d + PRIMARY_BOOST },
    { type: "over25", prob: probs.over25 },
    { type: "under25", prob: probs.under25 },
    { type: "btts_yes", prob: probs.bttsYes },
    { type: "btts_no", prob: probs.bttsNo },
  ];

  candidates.sort((a, b) => b.prob - a.prob);
  return candidates;
}

/**
 * Get the best pick's market type for a prediction.
 */
export function getBestPickType(prediction: AIPrediction): MarketType {
  return getMarketCandidates(prediction)[0].type;
}

/**
 * Get the RAW (display) probability for the best pick — without PRIMARY_BOOST.
 * This is what users see AND what determines the tier.
 */
export function getBestMarketProbability(prediction: AIPrediction): number {
  const bestType = getBestPickType(prediction);
  let hw = Math.max(5, prediction.home_win ?? 33);
  let aw = Math.max(5, prediction.away_win ?? 33);
  let d = Math.max(5, prediction.draw ?? 34);
  const total1x2 = hw + aw + d;
  hw = Math.round((hw / total1x2) * 100);
  aw = Math.round((aw / total1x2) * 100);
  d = 100 - hw - aw;
  
  const probs = calculateGoalMarketProbs(prediction);

  const rawProbs: Record<MarketType, number> = {
    home_win: hw, away_win: aw, draw: d,
    over25: probs.over25, under25: probs.under25,
    btts_yes: probs.bttsYes, btts_no: probs.bttsNo,
  };

  return rawProbs[bestType];
}

/**
 * Tier assignment based on confidence score (v3):
 *   76%+ → Premium
 *   60-75% → Pro
 *   0-59% → Free
 */
export function getTierFromConfidence(confidence: number): "free" | "pro" | "premium" {
  if (confidence >= 78) return "premium";
  if (confidence >= 65) return "pro";
  return "free";
}

/**
 * Simple tier from market probability (fallback when confidence not available)
 */
export function getTierFromMarketProbability(bestProb: number): "free" | "pro" | "premium" {
  if (bestProb >= 78) return "premium";
  if (bestProb >= 65) return "pro";
  return "free";
}

const MARKET_LABELS: Record<MarketType, { label: string; emoji: string }> = {
  home_win: { label: "Home Win", emoji: "🏠" },
  away_win: { label: "Away Win", emoji: "✈️" },
  draw: { label: "Draw", emoji: "🤝" },
  over25: { label: "Over 2.5", emoji: "🔥" },
  under25: { label: "Under 2.5", emoji: "🔥" },
  btts_yes: { label: "BTTS Yes", emoji: "🔥" },
  btts_no: { label: "BTTS No", emoji: "🔥" },
};

/**
 * Get the best market pick with label and probability — single source of truth.
 * Used by both AI Predictions and Match Previews for consistent data.
 */
export function getBestMarketPickWithLabel(prediction: AIPrediction): { label: string; pct: number; emoji: string } {
  const bestType = getBestPickType(prediction);
  const pct = getBestMarketProbability(prediction);
  const meta = MARKET_LABELS[bestType];
  return { label: meta.label, pct, emoji: meta.emoji };
}
