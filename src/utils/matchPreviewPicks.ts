import type { AIPrediction } from "@/hooks/useAIPredictions";
import { calculateGoalMarketProbs } from "@/components/ai-predictions/utils/marketDerivation";

export interface MatchPreviewAIPick {
  emoji: string;
  label: string;
  confidence: number;
  color: string;
  bg: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function makePick(label: string, confidence: number): MatchPreviewAIPick {
  const conf = clamp(Math.round(confidence), 30, 95);
  const emoji = conf >= 80 ? "🔥" : conf >= 75 ? "🟢" : conf >= 60 ? "🟡" : "⚠️";
  const color = conf >= 75 ? "text-emerald-400" : conf >= 60 ? "text-amber-400" : "text-red-400";
  const bg = conf >= 75
    ? "bg-emerald-500/10 border-emerald-500/20"
    : conf >= 60
      ? "bg-amber-500/10 border-amber-500/20"
      : "bg-red-500/10 border-red-500/20";
  return { emoji, label, confidence: conf, color, bg };
}

/**
 * Derive all AI picks for a match preview using the SAME Poisson model
 * as the AI Predictions page (calculateGoalMarketProbs).
 */
export function deriveMatchPreviewAIPicks(pred: AIPrediction): MatchPreviewAIPick[] {
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const draw = pred.draw ?? 0;
  const confidence = pred.confidence ?? 60;

  // Use the unified Poisson model for goals/BTTS — same as AI Predictions page
  const goalProbs = calculateGoalMarketProbs(pred);

  // Goals pick from Poisson model
  const goalsPick = goalProbs.over25 >= 50
    ? makePick("Over 2.5", goalProbs.over25)
    : makePick("Under 2.5", goalProbs.under25);

  // BTTS pick from Poisson model
  const bttsPick = goalProbs.bttsYes >= 50
    ? makePick("BTTS Yes", goalProbs.bttsYes)
    : makePick("BTTS No", goalProbs.bttsNo);

  // 1X2 picks use stored probabilities (same source as AI Predictions)
  const mainPrediction = (pred.prediction || "").toLowerCase();
  const homePickConf = mainPrediction === "1" || mainPrediction === "home" ? clamp(Math.max(homeWin, confidence * 0.85), 40, 92) : homeWin;
  const awayPickConf = mainPrediction === "2" || mainPrediction === "away" ? clamp(Math.max(awayWin, confidence * 0.85), 40, 92) : awayWin;
  const drawPickConf = mainPrediction === "x" || mainPrediction === "draw" ? clamp(Math.max(draw, confidence * 0.8), 40, 88) : draw;

  // Double chance / DNB derived from 1X2
  const dc1x = clamp(homePickConf + draw * 0.6, 50, 95);
  const dcx2 = clamp(awayPickConf + draw * 0.6, 50, 95);
  const dnbConf = clamp(Math.max(homePickConf, awayPickConf) + draw * 0.3, 50, 92);
  const favorsHome = homeWin > awayWin && homeWin > draw;
  const favorsAway = awayWin > homeWin && awayWin > draw;

  const candidatePicks: MatchPreviewAIPick[] = [
    makePick("Home Win", homePickConf),
    makePick("Draw", drawPickConf),
    makePick("Away Win", awayPickConf),
    ...(favorsAway ? [] : [makePick("1X (Home/Draw)", dc1x)]),
    ...(favorsHome ? [] : [makePick("X2 (Draw/Away)", dcx2)]),
    makePick(homeWin >= awayWin ? "DNB Home" : "DNB Away", dnbConf),
    goalsPick,
    bttsPick,
  ];

  const finalPicks = candidatePicks
    .filter((pick) => pick.confidence >= 55)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);

  const included = new Set(finalPicks.map((p) => p.label));
  if (!included.has(goalsPick.label)) finalPicks.push(goalsPick);
  if (!included.has(bttsPick.label)) finalPicks.push(bttsPick);

  return finalPicks.slice(0, 7);
}

/**
 * Get the single best market pick — uses unified Poisson model.
 */
export function getTopMatchPreviewPick(pred: AIPrediction): MatchPreviewAIPick {
  const picks = deriveMatchPreviewAIPicks(pred);
  return picks.reduce((best, pick) => (pick.confidence > best.confidence ? pick : best), picks[0]);
}
