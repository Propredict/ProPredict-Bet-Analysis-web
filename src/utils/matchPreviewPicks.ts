import type { AIPrediction } from "@/hooks/useAIPredictions";

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

function extractGoalsFromAnalysis(analysis: string | null): {
  homeGoals: number;
  awayGoals: number;
} {
  if (!analysis) return { homeGoals: 0, awayGoals: 0 };

  let homeGoals = 0;
  let awayGoals = 0;

  const splitsSection = analysis.match(/HOME\/AWAY SPLITS.*?(?=📈|🛡️|🔥|$)/s);
  if (splitsSection) {
    const homeMatch = splitsSection[0].match(/at home.*?avg\s*([\d.]+)\/([\d.]+)/i);
    if (homeMatch) homeGoals = parseFloat(homeMatch[1]);
    const awayMatch = splitsSection[0].match(/away.*?avg\s*([\d.]+)\/([\d.]+)/i);
    if (awayMatch) awayGoals = parseFloat(awayMatch[1]);
  }

  if (!homeGoals || !awayGoals) {
    const seasonSection = analysis.match(/SEASON STATS.*?(?=🛡️|🔥|🚑|$)/s);
    if (seasonSection) {
      const avgMatches = seasonSection[0].match(/Avg goals:\s*([\d.]+)\s*scored,\s*([\d.]+)\s*conceded/gi);
      if (avgMatches?.[0] && !homeGoals) {
        const m1 = avgMatches[0].match(/Avg goals:\s*([\d.]+)\s*scored/i);
        if (m1) homeGoals = parseFloat(m1[1]);
      }
      if (avgMatches?.[1] && !awayGoals) {
        const m2 = avgMatches[1].match(/Avg goals:\s*([\d.]+)\s*scored/i);
        if (m2) awayGoals = parseFloat(m2[1]);
      }
    }
  }

  if (!homeGoals || !awayGoals) {
    const pairs = [...analysis.matchAll(/avg\s*([\d.]+)\s*\/\s*([\d.]+)/gi)];
    if (pairs[0] && !homeGoals) homeGoals = parseFloat(pairs[0][1]);
    if (pairs[1] && !awayGoals) awayGoals = parseFloat(pairs[1][1]);
  }

  return { homeGoals, awayGoals };
}

function resolveGoalMetrics(pred: AIPrediction) {
  const extracted = extractGoalsFromAnalysis(pred.analysis);
  let homeGoals = pred.last_home_goals && pred.last_home_goals > 0 ? pred.last_home_goals : extracted.homeGoals;
  let awayGoals = pred.last_away_goals && pred.last_away_goals > 0 ? pred.last_away_goals : extracted.awayGoals;
  const homeWin = pred.home_win ?? 33;
  const draw = pred.draw ?? 34;

  if (homeGoals <= 0 || awayGoals <= 0) {
    const estimatedTotal = clamp(2 + (100 - draw) / 110 + Math.abs(homeWin - (pred.away_win ?? 33)) / 180, 1.7, 3.7);
    const homeShare = clamp((homeWin + draw * 0.5) / 100, 0.35, 0.7);
    homeGoals = homeGoals > 0 ? homeGoals : Number((estimatedTotal * homeShare).toFixed(1));
    awayGoals = awayGoals > 0 ? awayGoals : Number((estimatedTotal - homeGoals).toFixed(1));
  }

  return { homeGoals, awayGoals, totalGoalsAvg: Number((homeGoals + awayGoals).toFixed(1)) };
}

function makePick(label: string, confidence: number, _seed: number): MatchPreviewAIPick {
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

export function deriveMatchPreviewAIPicks(pred: AIPrediction): MatchPreviewAIPick[] {
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const draw = pred.draw ?? 0;
  const confidence = pred.confidence ?? 60;
  const { homeGoals, awayGoals, totalGoalsAvg } = resolveGoalMetrics(pred);

  const scoreParts = (pred.predicted_score ?? "").match(/^(\d+)\s*[-:]\s*(\d+)$/);
  const predictedTotal = scoreParts ? parseInt(scoreParts[1]) + parseInt(scoreParts[2]) : null;
  const predictedHome = scoreParts ? parseInt(scoreParts[1]) : 0;
  const predictedAway = scoreParts ? parseInt(scoreParts[2]) : 0;
  const predictedBothScored = scoreParts ? predictedHome > 0 && predictedAway > 0 : null;

  const seed = (pred.match_id || "").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 10;

  let goalsPick: MatchPreviewAIPick;
  if (predictedTotal !== null) {
    goalsPick = predictedTotal >= 3
      ? makePick("Over 2.5", clamp(78 + (predictedTotal - 3) * 5 + seed * 0.3, 78, 92), seed)
      : makePick("Under 2.5", clamp(82 + (2 - predictedTotal) * 4 + seed * 0.3, 80, 92), seed);
  } else {
    goalsPick = totalGoalsAvg >= 2.5
      ? makePick("Over 2.5", clamp(75 + totalGoalsAvg * 3, 76, 90), seed)
      : makePick("Under 2.5", clamp(75 + (3 - totalGoalsAvg) * 4, 76, 90), seed);
  }

  let bttsPick: MatchPreviewAIPick;
  if (predictedBothScored !== null) {
    bttsPick = predictedBothScored
      ? makePick("BTTS Yes", clamp(78 + seed * 0.5, 78, 88), seed)
      : makePick("BTTS No", clamp(82 + seed * 0.3, 80, 90), seed);
  } else {
    const bothScore = homeGoals >= 1 && awayGoals >= 1;
    bttsPick = bothScore
      ? makePick("BTTS Yes", clamp(76 + Math.min(homeGoals, awayGoals) * 3, 76, 88), seed)
      : makePick("BTTS No", clamp(76 + (1.5 - Math.min(homeGoals, awayGoals)) * 5, 76, 88), seed);
  }

  const mainPrediction = (pred.prediction || "").toLowerCase();
  const homePickConf = mainPrediction === "1" || mainPrediction === "home" ? clamp(Math.max(homeWin, confidence * 0.85), 76, 92) : homeWin;
  const awayPickConf = mainPrediction === "2" || mainPrediction === "away" ? clamp(Math.max(awayWin, confidence * 0.85), 76, 92) : awayWin;
  const drawPickConf = mainPrediction === "x" || mainPrediction === "draw" ? clamp(Math.max(draw, confidence * 0.8), 75, 88) : draw;
  const dc1x = clamp(homePickConf + draw * 0.6, 78, 95);
  const dcx2 = clamp(awayPickConf + draw * 0.6, 78, 95);
  const dnbConf = clamp(Math.max(homePickConf, awayPickConf) + draw * 0.3, 76, 92);
  const favorsHome = homeWin > awayWin && homeWin > draw;
  const favorsAway = awayWin > homeWin && awayWin > draw;

  const candidatePicks: MatchPreviewAIPick[] = [
    makePick("Home Win", homePickConf, seed),
    makePick("Draw", drawPickConf, seed),
    makePick("Away Win", awayPickConf, seed),
    ...(favorsAway ? [] : [makePick("1X (Home/Draw)", dc1x, seed)]),
    ...(favorsHome ? [] : [makePick("X2 (Draw/Away)", dcx2, seed)]),
    makePick(homeWin >= awayWin ? "DNB Home" : "DNB Away", dnbConf, seed),
    goalsPick,
    bttsPick,
  ];

  const finalPicks = candidatePicks
    .filter((pick) => pick.confidence >= 75)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);

  const included = new Set(finalPicks.map((p) => p.label));
  if (!included.has(goalsPick.label)) finalPicks.push(goalsPick);
  if (!included.has(bttsPick.label)) finalPicks.push(bttsPick);

  return finalPicks.slice(0, 7);
}

export function getTopMatchPreviewPick(pred: AIPrediction): MatchPreviewAIPick {
  const picks = deriveMatchPreviewAIPicks(pred);
  return picks.reduce((best, pick) => (pick.confidence > best.confidence ? pick : best), picks[0]);
}