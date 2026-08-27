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

  // Double chance / DNB derived from NORMALIZED 1X2 (exact probability math,
  // same basis as the AI Predictions market model — no arbitrary boosts).
  const total1x2 = Math.max(1, homePickConf + drawPickConf + awayPickConf);
  const nHome = (homePickConf / total1x2) * 100;
  const nDraw = (drawPickConf / total1x2) * 100;
  const nAway = (awayPickConf / total1x2) * 100;
  const dc1x = clamp(nHome + nDraw, 5, 97);
  const dcx2 = clamp(nDraw + nAway, 5, 97);
  const favorsHome = homePickConf > awayPickConf && homePickConf > drawPickConf;
  const favorsAway = awayPickConf > homePickConf && awayPickConf > drawPickConf;
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
  const picks = deriveMatchPreviewAIPicks(pred);
  if (picks.length > 0) return picks[0];
  // Fallback for ranking only — the caller decides whether to display it.
  const goalProbs = calculateGoalMarketProbs(pred);
  const best = Math.max(
    pred.home_win ?? 0,
    pred.away_win ?? 0,
    pred.draw ?? 0,
    goalProbs.over25,
    goalProbs.under25,
    goalProbs.bttsYes,
    goalProbs.bttsNo,
    pred.confidence ?? 0,
  );
  const label =
    best === goalProbs.over25 ? "Over 2.5"
      : best === goalProbs.under25 ? "Under 2.5"
      : best === goalProbs.bttsYes ? "BTTS Yes"
      : best === goalProbs.bttsNo ? "BTTS No"
      : best === (pred.home_win ?? 0) ? "Home Win"
      : best === (pred.away_win ?? 0) ? "Away Win"
      : "Draw";
  return makePick(label, best);
}
