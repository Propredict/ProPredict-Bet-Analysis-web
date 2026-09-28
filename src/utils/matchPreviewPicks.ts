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
  // The match-preview hero must show the strongest DIRECTIONAL pick — the
  // same one Top 10 lists (e.g. Sweden–Poland: Away Win 83%). Over/Under
  // markets are excluded from the hero entirely; they live in the Goals tab.
  // Candidates: 1X2 + BTTS Yes/No, plus the stored AI confidence attached to
  // its matching market (or to the strongest 1X2 outcome when MAIN is a
  // goals market like "Over 1.5").
  const { hw, d, aw } = getNormalized1x2(pred);
  const g = calculateGoalMarketProbs(pred);
  const candidates: Array<[string, number]> = [
    ["Home Win", hw],
    ["Draw", d],
    ["Away Win", aw],
    ["BTTS Yes", g.bttsYes],
    ["BTTS No", g.bttsNo],
  ];
  const aiConf = Number(pred.confidence ?? 0);
  if (pred.prediction && aiConf > 0) {
    const p = String(pred.prediction).toLowerCase().trim();
    const home = String(pred.home_team ?? "").toLowerCase();
    const away = String(pred.away_team ?? "").toLowerCase();
    let mainLabel: string | null = null;
    if (p === "1" || p === "home win" || (home && p.includes(home) && p.includes("win"))) mainLabel = "Home Win";
    else if (p === "2" || p === "away win" || (away && p.includes(away) && p.includes("win"))) mainLabel = "Away Win";
    else if (p === "x" || p === "draw") mainLabel = "Draw";
    else if (p.includes("btts") && p.includes("yes")) mainLabel = "BTTS Yes";
    else if (p.includes("btts") && p.includes("no")) mainLabel = "BTTS No";
    if (mainLabel) {
      candidates.push([mainLabel, aiConf]);
    } else {
      // MAIN is a goals market: the AI confidence still describes the match
      // favourite, so attach it to the strongest 1X2 outcome.
      const best1x2: Array<[string, number]> = [["Home Win", hw], ["Draw", d], ["Away Win", aw]];
      const [bLabel] = best1x2.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
      candidates.push([bLabel, aiConf]);
    }
  }
  const [label, pct] = candidates.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  return makePick(label, pct);
}

export const TOP10_MIN_CONFIDENCE = 80;
export const TOP10_MAX = 10;

/**
 * Strongest single market for a match from the unified model.
 * Priority order (Top 10, >=80% only):
 *   1) 1X2 (Home Win / Draw / Away Win)
 *   2) Over 2.5 / Under 2.5
 *   3) BTTS Yes / No
 *   4) FALLBACK only when ALL of the above are below 70%: Over 1.5 / Under 3.5
 * No double chance (1X/X2/12) anywhere.
 */
export function getStrongestMarketPick(pred: AIPrediction): MatchPreviewAIPick {
  const { hw, d, aw } = getNormalized1x2(pred);
  const g = calculateGoalMarketProbs(pred);
  const primary: Array<[string, number]> = [
    ["Home Win", hw],
    ["Draw", d],
    ["Away Win", aw],
    ["Over 2.5", g.over25],
    ["Under 2.5", g.under25],
    ["BTTS Yes", g.bttsYes],
    ["BTTS No", g.bttsNo],
  ];
  // AI main confidence counts only when its MAIN is a primary market
  // (1X2 / Over-Under 2.5 / BTTS). A MAIN like "Over 1.5" never wins here.
  const aiConf = Number(pred.confidence ?? 0);
  if (pred.prediction && aiConf > 0) {
    const p = String(pred.prediction).toLowerCase().trim();
    const home = String(pred.home_team ?? "").toLowerCase();
    const away = String(pred.away_team ?? "").toLowerCase();
    let mainLabel: string | null = null;
    if (p === "1" || p === "home win" || (home && p.includes(home) && p.includes("win"))) mainLabel = "Home Win";
    else if (p === "2" || p === "away win" || (away && p.includes(away) && p.includes("win"))) mainLabel = "Away Win";
    else if (p === "x" || p === "draw") mainLabel = "Draw";
    else if (p.includes("over 2.5")) mainLabel = "Over 2.5";
    else if (p.includes("under 2.5")) mainLabel = "Under 2.5";
    else if (p.includes("btts") && p.includes("yes")) mainLabel = "BTTS Yes";
    else if (p.includes("btts") && p.includes("no")) mainLabel = "BTTS No";
    if (mainLabel) {
      primary.push([mainLabel, aiConf]);
    } else {
      // MAIN is a fallback market (e.g. "Over 1.5"): the AI confidence still
      // describes the match favourite, so attach it to the strongest 1X2
      // outcome — Germany "Over 1.5" MAIN with 87% shows as Home Win 87%.
      const best1x2: Array<[string, number]> = [["Home Win", hw], ["Draw", d], ["Away Win", aw]];
      const [bLabel] = best1x2.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
      primary.push([bLabel, aiConf]);
    }
  }

  let [label, pct] = primary.reduce((best, cur) => (cur[1] > best[1] ? cur : best));

  // Fallback: Over 1.5 / Under 3.5 are used ONLY when every primary market
  // (1X2, Over/Under 2.5, BTTS) is below 70%. If any primary market is 70%+,
  // it always wins — e.g. Away Win 83% beats Over 1.5 88%.
  if (pct < 70) {
    const fallback: Array<[string, number]> = [
      ["Over 1.5", g.over15],
      ["Under 3.5", g.under35],
    ];
    const [fLabel, fPct] = fallback.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
    if (fPct > pct) {
      label = fLabel;
      pct = fPct;
    }
  }

  return makePick(label, pct);
}
