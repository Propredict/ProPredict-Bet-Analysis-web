import type { AIPrediction } from "@/hooks/useAIPredictions";

export interface GeneratedAnalysis {
  explanation: string;
  keyFactors: string[];
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
 * Get confidence tier
 */
function getConfidenceTier(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 70) return "high";
  if (confidence >= 55) return "medium";
  return "low";
}

/**
 * Generate confidence sentence based on confidence level
 */
function getConfidenceSentence(confidence: number): string {
  if (confidence >= 70) {
    return "Multiple performance indicators align strongly with this prediction.";
  } else if (confidence >= 55) {
    return "Key metrics suggest a slight edge rather than a decisive advantage.";
  } else {
    return "This prediction carries increased uncertainty due to mixed signals.";
  }
}

/**
 * Generate dynamic key factors based on prediction context
 */
function generateKeyFactors(prediction: AIPrediction): string[] {
  const factors: string[] = [];
  const score = parseScore(prediction.predicted_score);
  const totalGoals = score ? score.home + score.away : 0;
  
  switch (prediction.prediction) {
    case "1": // Home win
      factors.push("Home advantage");
      if (prediction.home_win > 50) factors.push("Dominant probability");
      if (score && score.home >= 2) factors.push("Goal-scoring potential");
      if (prediction.confidence >= 65) factors.push("Recent form");
      if (score && score.away === 0) factors.push("Defensive stability");
      if (prediction.risk_level === "low") factors.push("Low volatility");
      break;
      
    case "2": // Away win
      factors.push("Away efficiency");
      if (prediction.away_win > 45) factors.push("Counter-attack strength");
      if (score && score.away >= 2) factors.push("Clinical finishing");
      if (prediction.risk_level === "high") factors.push("High-risk opportunity");
      if (prediction.confidence >= 60) factors.push("Tactical discipline");
      if (score && score.home <= 1) factors.push("Opponent weakness");
      break;
      
    case "X": // Draw
      factors.push("Balanced matchup");
      if (prediction.draw > 30) factors.push("Evenly matched");
      factors.push("Tactical stalemate");
      if (totalGoals <= 2) factors.push("Defensive stability");
      if (totalGoals >= 3) factors.push("End-to-end action");
      if (prediction.confidence < 60) factors.push("Momentum shifts");
      break;
  }
  
  // Limit to 4 factors and ensure uniqueness
  return [...new Set(factors)].slice(0, 4);
}

/**
 * Generate home win explanation
 */
function generateHomeWinExplanation(prediction: AIPrediction): string {
  const { home_team, away_team, predicted_score, confidence, risk_level, home_win } = prediction;
  const score = parseScore(predicted_score);
  
  let explanation = `The AI favors ${home_team} due to a ${home_win > 55 ? "significantly higher" : "notably higher"} win probability and favorable matchup indicators.`;
  
  if (score) {
    if (score.home >= 3) {
      explanation += ` The predicted score of ${predicted_score} suggests dominant attacking pressure and sustained control throughout the match.`;
    } else if (score.home === 2) {
      explanation += ` The predicted score of ${predicted_score} suggests consistent attacking pressure and control throughout the match.`;
    } else {
      explanation += ` The projected ${predicted_score} scoreline indicates a tighter contest with ${home_team} finding the decisive edge.`;
    }
  }
  
  // Add low confidence caveat
  if (confidence < 60) {
    explanation += ` However, the margin is not overwhelming, indicating some resistance from ${away_team}.`;
  }
  
  // Add risk level context
  if (risk_level === "high") {
    explanation += ` Despite the prediction, volatility factors suggest this could swing unexpectedly.`;
  }
  
  // Add confidence sentence
  explanation += " " + getConfidenceSentence(confidence);
  
  return explanation;
}

/**
 * Generate away win explanation
 */
function generateAwayWinExplanation(prediction: AIPrediction): string {
  const { home_team, away_team, predicted_score, confidence, risk_level, away_win } = prediction;
  const score = parseScore(predicted_score);
  
  let explanation = `The AI predicts an away victory for ${away_team}, driven by ${away_win > 45 ? "superior efficiency" : "tactical superiority"} and favorable matchup dynamics.`;
  
  if (score) {
    if (score.away >= 3) {
      explanation += ` The expected ${predicted_score} scoreline reflects commanding performance and clinical finishing in attack.`;
    } else if (score.away === 2) {
      explanation += ` The expected ${predicted_score} scoreline reflects an ability to capitalize on key moments, even without dominant possession.`;
    } else {
      explanation += ` The projected ${predicted_score} outcome suggests a measured approach, taking advantage of limited opportunities.`;
    }
  }
  
  // Add high risk caveat
  if (risk_level === "high") {
    explanation += ` This remains a higher-risk scenario due to potential home-side volatility from ${home_team}.`;
  }
  
  // Add low confidence caveat
  if (confidence < 60) {
    explanation += ` The away context introduces additional uncertainty to this prediction.`;
  }
  
  // Add confidence sentence
  explanation += " " + getConfidenceSentence(confidence);
  
  return explanation;
}

/**
 * Generate draw explanation
 */
function generateDrawExplanation(prediction: AIPrediction): string {
  const { home_team, away_team, predicted_score, confidence, risk_level, draw } = prediction;
  const score = parseScore(predicted_score);
  const totalGoals = score ? score.home + score.away : 0;
  
  let explanation = `The AI identifies a balanced matchup with no clear dominance from either ${home_team} or ${away_team}.`;
  
  if (score) {
    if (totalGoals === 0) {
      explanation += ` The projected ${predicted_score} outcome reflects strong defensive organization from both sides, with limited scoring opportunities.`;
    } else if (totalGoals <= 2) {
      explanation += ` The projected ${predicted_score} outcome reflects evenly matched strengths and a tactical stalemate across key phases of play.`;
    } else {
      explanation += ` The expected ${predicted_score} scoreline suggests an entertaining, end-to-end contest where neither side can pull away.`;
    }
  }
  
  // Add low confidence caveat
  if (confidence < 60) {
    explanation += ` Small shifts in momentum could easily tilt the result in either direction.`;
  }
  
  // Add medium-high draw probability context
  if (draw > 35) {
    explanation += ` Historical patterns between similar matchups support this stalemate scenario.`;
  }
  
  // Add confidence sentence
  explanation += " " + getConfidenceSentence(confidence);
  
  return explanation;
}

/**
 * Main function to generate AI analysis
 */
export function generateAIAnalysis(prediction: AIPrediction): GeneratedAnalysis {
  let explanation: string;
  
  switch (prediction.prediction) {
    case "1":
      explanation = generateHomeWinExplanation(prediction);
      break;
    case "2":
      explanation = generateAwayWinExplanation(prediction);
      break;
    case "X":
      explanation = generateDrawExplanation(prediction);
      break;
    default:
      explanation = "Analysis data unavailable for this prediction.";
  }
  
  const keyFactors = generateKeyFactors(prediction);
  
  return { explanation, keyFactors };
}

/**
 * Get short confidence explanation for the Main tab
 */
export function getShortConfidenceExplanation(prediction: AIPrediction): string {
  const { prediction: outcome, confidence, risk_level, home_team, away_team } = prediction;
  
  if (confidence >= 75) {
    if (outcome === "1") {
      return `Strong indicators favor ${home_team} with high conviction.`;
    } else if (outcome === "2") {
      return `${away_team} shows compelling away form and efficiency.`;
    } else {
      return "Both teams display evenly matched capabilities.";
    }
  } else if (confidence >= 60) {
    if (outcome === "1") {
      return `${home_team} holds a moderate edge at home.`;
    } else if (outcome === "2") {
      return `${away_team} has tactical advantages, though margins are tight.`;
    } else {
      return "A balanced matchup with slight unpredictability.";
    }
  } else if (confidence >= 45) {
    if (risk_level === "high") {
      return "Competitive fixture with elevated uncertainty factors.";
    }
    return "Mixed signals make this a difficult call.";
  } else {
    return "Unpredictable fixture with limited decisive indicators.";
  }
}
