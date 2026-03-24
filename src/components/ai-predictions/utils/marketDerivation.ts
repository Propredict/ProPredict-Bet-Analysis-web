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

export function calculateGoalMarketProbs(prediction: AIPrediction): GoalMarketProbs {
  const score = parseScore(prediction.predicted_score);
  // Estimate xG from predicted score with slight regression to mean (1.3 goals)
  const homeXg = score ? Math.max(0.4, score.home * 0.85 + 0.2) : 1.3;
  const awayXg = score ? Math.max(0.3, score.away * 0.85 + 0.15) : 1.0;

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

  return {
    over15: Math.round(over15 * 100),
    over25: Math.round(over25 * 100),
    over35: Math.round(over35 * 100),
    under15: Math.round((1 - over15) * 100),
    under25: Math.round((1 - over25) * 100),
    under35: Math.round((1 - over35) * 100),
    bttsYes: Math.round(bttsYes * 100),
    bttsNo: Math.round((1 - bttsYes) * 100),
  };
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
  const score = parseScore(prediction.predicted_score);
  const totalGoals = score ? score.home + score.away : 0;
  const bothScored = score ? score.home > 0 && score.away > 0 : false;
  
  // Goals markets derived from predicted_score
  const goals = {
    over15: {
      recommended: totalGoals > 1.5,
      value: totalGoals > 1.5 ? "Yes" : "No",
    },
    over25: {
      recommended: totalGoals > 2.5,
      value: totalGoals > 2.5 ? "Yes" : "No",
    },
    under35: {
      recommended: totalGoals < 3.5,
      value: totalGoals < 3.5 ? "Yes" : "No",
    },
  };

  // BTTS derived from score
  const btts = {
    gg: { recommended: bothScored },
    ng: { recommended: !bothScored },
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

  // Combos - max 2 options based on prediction
  const combos: { label: string; recommended: boolean }[] = [];
  
  if (effectivePrediction === "1") {
    // Home win combos
    if (totalGoals > 1.5) {
      combos.push({ label: "1 & Over 1.5", recommended: true });
    }
    if (totalGoals > 2.5) {
      combos.push({ label: "1 & Over 2.5", recommended: true });
    } else if (combos.length < 2) {
      combos.push({ label: "1 & Over 1.5", recommended: totalGoals >= 2 });
    }
  } else if (effectivePrediction === "2") {
    // Away win combos
    if (totalGoals > 1.5) {
      combos.push({ label: "2 & Over 1.5", recommended: true });
    }
    if (totalGoals > 2.5) {
      combos.push({ label: "2 & Over 2.5", recommended: true });
    } else if (combos.length < 2) {
      combos.push({ label: "2 & Over 1.5", recommended: totalGoals >= 2 });
    }
  } else {
    // Draw combos
    combos.push({ label: "X & Over 1.5", recommended: totalGoals >= 2 });
    if (totalGoals >= 2) {
      combos.push({ label: "X & Under 3.5", recommended: totalGoals < 4 });
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

/**
 * Calibrate a raw probability to account for model conservatism.
 * 1) Multiply by 1.2
 * 2) Tiered boost: 65%+ gets +5%, 70%+ gets +8%
 * 3) Cap at 92%
 */
export function calibrateProb(raw: number): number {
  let p = raw * 1.2;
  if (p >= 70) p += 8;
  else if (p >= 65) p += 5;
  return Math.min(92, Math.round(p));
}

/**
 * Get the highest market probability for a prediction (calibrated).
 */
export function getBestMarketProbability(prediction: AIPrediction): number {
  const hw = prediction.home_win ?? 0;
  const aw = prediction.away_win ?? 0;
  const d = prediction.draw ?? 0;
  const probs = calculateGoalMarketProbs(prediction);

  // Normalize 1X2 probabilities (pairwise vs strongest rival)
  const norm1 = hw > 0 ? Math.round(hw * (100 / (hw + Math.max(aw, d)))) : 0;
  const norm2 = aw > 0 ? Math.round(aw * (100 / (aw + Math.max(hw, d)))) : 0;
  const normX = d > 0 ? Math.round(d * (100 / (d + Math.max(hw, aw)))) : 0;

  const rawBest = Math.max(norm1, norm2, normX, probs.over25, probs.under25, probs.bttsYes, probs.bttsNo);
  return calibrateProb(rawBest);
}

/**
 * Simple tier assignment — highest market probability only:
 *   80%+ → Premium
 *   70-79% → Pro
 *   <70% → Free
 */
export function getTierFromMarketProbability(bestProb: number): "free" | "pro" | "premium" {
  if (bestProb >= 80) return "premium";
  if (bestProb >= 70) return "pro";
  return "free";
}
