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

  // Double Chance derived from main prediction
  let doubleChanceOption: "1X" | "12" | "X2" = "1X";
  if (prediction.prediction === "1") {
    doubleChanceOption = "1X";
  } else if (prediction.prediction === "X") {
    doubleChanceOption = "12";
  } else if (prediction.prediction === "2") {
    doubleChanceOption = "X2";
  }

  const doubleChance = {
    option: doubleChanceOption,
    recommended: true,
  };

  // Combos - max 2 options based on prediction
  const combos: { label: string; recommended: boolean }[] = [];
  
  if (prediction.prediction === "1") {
    // Home win combos
    if (totalGoals > 1.5) {
      combos.push({ label: "1 & Over 1.5", recommended: true });
    }
    if (totalGoals > 2.5) {
      combos.push({ label: "1 & Over 2.5", recommended: true });
    } else if (combos.length < 2) {
      combos.push({ label: "1 & Over 1.5", recommended: totalGoals >= 2 });
    }
  } else if (prediction.prediction === "2") {
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
