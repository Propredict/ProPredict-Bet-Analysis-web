import type { AIPrediction } from "@/hooks/useAIPredictions";
import {
  calculateGoalMarketProbs,
  getBestMarketPickWithLabel,
  getNormalized1x2,

} from "@/components/ai-predictions/utils/marketDerivation";

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
  // Always use NORMALIZED 1X2 (raw DB values rarely sum to 100), so every
  // page shows the same percentages as the AI Predictions card.
  const { hw: homeWin, d: draw, aw: awayWin } = getNormalized1x2(pred);
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

  // 1X2 uses the SAME normalized probabilities as the AI Predictions cards.
  // No boosts based on the stored headline prediction — a boost could flip the
  // favourite here (Home Win) while AI Predictions shows the other side (Away Win).
  const nHome = homeWin;
  const nDraw = draw;
  const nAway = awayWin;
  const dc1x = clamp(nHome + nDraw, 5, 97);
  const dcx2 = clamp(nDraw + nAway, 5, 97);
  const favorsHome = nHome > nAway && nHome > nDraw;
  const favorsAway = nAway > nHome && nAway > nDraw;
  // DNB = win probability conditioned on no draw: p / (pHome + pAway)
  const dnbBase = Math.max(1, nHome + nAway);
  const dnbConf = clamp(((favorsAway ? nAway : nHome) / dnbBase) * 100, 5, 95);

  const candidatePicks: MatchPreviewAIPick[] = [
    ...(favorsAway ? [] : [makePick("Home Win", nHome)]),
    makePick("Draw", nDraw),
    ...(favorsHome ? [] : [makePick("Away Win", nAway)]),
    ...(favorsAway ? [] : [makePick("1X (Home/Draw)", dc1x)]),
    ...(favorsHome ? [] : [makePick("X2 (Draw/Away)", dcx2)]),
    makePick(favorsAway ? "DNB Away" : "DNB Home", dnbConf),

    goalsPick,
    bttsPick,
  ];

  // Only verified picks are shown — anything under 65% is confusing noise
  // (e.g. "DNB Away 59%") and is hidden completely.
  return candidatePicks
    .filter((pick) => pick.confidence >= MIN_PICK_CONFIDENCE)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 7);
}

export const MIN_PICK_CONFIDENCE = 65;

/**
 * Get the single best market pick — uses unified Poisson model.
 * Ignores the 65% display gate so ranking/eligibility logic still has a value.
 */
export function getTopMatchPreviewPick(pred: AIPrediction): MatchPreviewAIPick {
  // Top 30 and AI Predictions must never calculate a different headline pick.
  // Both surfaces consume the same centralized market-selection result.
  const pick = getBestMarketPickWithLabel(pred);
  return makePick(pick.label, pick.pct);
}
