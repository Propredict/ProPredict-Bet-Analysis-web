/**
 * Player AI Prediction Engine
 * 
 * Uses real season stats (goals, assists, shots, passes, rating, appearances, etc.)
 * to calculate per-game averages and derive probabilities.
 * Supports opponent-based adjustment when next match data is available.
 * 
 * NOT random — all values are deterministic from the player's actual data.
 */

import type { PlayerProfile } from "@/hooks/usePlayerProfile";
import type { NextOpponentData } from "@/hooks/useNextOpponent";

export interface OpponentAdjustment {
  goalAdjust: number;      // multiplier (e.g., 1.15 = +15%)
  assistAdjust: number;
  riskAdjust: number;      // 0 = no change, 1 = increase risk
  label: string;           // e.g., "Weak Defense (+12%)"
  defenseRating: number;
  matchDifficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface PlayerAIPrediction {
  goalProbability: number;       // 0–100
  assistProbability: number;     // 0–100
  formScore: number;             // 0–100
  formLabel: "HOT" | "GOOD" | "COLD";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskReason: string;
  shotsExpected: number;         // per game
  bestPick: string;
  bestPickConfidence: number;    // 0–100
  keyPassesPerGame: number;
  minutesPercentage: number;
  starterPercentage: number;
  opponentAdjustment: OpponentAdjustment | null;
}

/**
 * Calculate opponent-based adjustment multipliers.
 * Defense rating 0-100 (higher = stronger defense).
 * Average defense = 50 → no adjustment.
 * Weak defense (20) → boost goals +20-30%
 * Strong defense (80) → reduce goals -15-25%
 */
function calculateOpponentAdjustment(opponentData: NextOpponentData): OpponentAdjustment | null {
  if (!opponentData.opponentStats) return null;

  const { defenseRating, cleanSheetRate, goalsAgainstPerGame, form } = opponentData.opponentStats;

  // Match difficulty based on opponent's win rate and defense
  const played = opponentData.opponentStats.played || 1;
  const winRate = (opponentData.opponentStats.wins / played) * 100;

  let matchDifficulty: "EASY" | "MEDIUM" | "HARD";
  if (defenseRating >= 65 && winRate >= 55) {
    matchDifficulty = "HARD";
  } else if (defenseRating <= 40 || winRate <= 35) {
    matchDifficulty = "EASY";
  } else {
    matchDifficulty = "MEDIUM";
  }

  // Goal adjustment: weak defense = more goals expected
  // defenseRating 50 = baseline (1.0x), 20 = weak (1.25x), 80 = strong (0.8x)
  const goalAdjust = 1 + ((50 - defenseRating) / 100) * 0.5;
  
  // Assist adjustment: similar but slightly less impact
  const assistAdjust = 1 + ((50 - defenseRating) / 100) * 0.35;

  // Risk adjustment: strong opponent increases risk
  const riskAdjust = defenseRating >= 70 ? 1 : 0;

  // Label
  const adjustPercent = Math.round((goalAdjust - 1) * 100);
  let label: string;
  if (adjustPercent > 0) {
    label = `Weak Defense (+${adjustPercent}%)`;
  } else if (adjustPercent < 0) {
    label = `Strong Defense (${adjustPercent}%)`;
  } else {
    label = "Average Defense";
  }

  return {
    goalAdjust: Math.round(goalAdjust * 100) / 100,
    assistAdjust: Math.round(assistAdjust * 100) / 100,
    riskAdjust,
    label,
    defenseRating,
    matchDifficulty,
  };
}

export function calculatePlayerPrediction(
  profile: PlayerProfile,
  opponentData?: NextOpponentData | null
): PlayerAIPrediction {
  const s = profile.stats;
  const apps = Math.max(s.appearances, 1);

  // ─── PER-GAME AVERAGES ───
  const goalsPerGame = s.goals / apps;
  const assistsPerGame = s.assists / apps;
  const shotsPerGame = s.shots.total / apps;
  const shotsOnTargetPerGame = s.shots.on / apps;
  const keyPassesPerGame = s.passes.key / apps;
  const rating = parseFloat(s.rating || "0");
  const maxPossibleMinutes = apps * 90;
  const minutesPercentage = Math.min(100, Math.round((s.minutes / maxPossibleMinutes) * 100));
  const starterPercentage = Math.round((s.lineups / apps) * 100);

  // ─── OPPONENT ADJUSTMENT ───
  const opponentAdj = opponentData ? calculateOpponentAdjustment(opponentData) : null;
  const goalMultiplier = opponentAdj?.goalAdjust ?? 1;
  const assistMultiplier = opponentAdj?.assistAdjust ?? 1;

  // ─── GOAL PROBABILITY ───
  const goalRate = goalsPerGame;
  const shotAccuracy = shotsPerGame > 0 ? shotsOnTargetPerGame / shotsPerGame : 0;
  
  let goalProbRaw = 
    (goalRate * 0.40) +
    (Math.min(shotsPerGame / 5, 1) * 0.30) +
    ((minutesPercentage / 100) * 0.20) +
    (shotAccuracy * 0.10);
  
  // Apply opponent adjustment
  goalProbRaw *= goalMultiplier;
  
  let goalProbability = Math.round(Math.min(95, Math.max(5, goalProbRaw * 100)));
  if (goalsPerGame > 0.5) goalProbability = Math.min(95, goalProbability + 8);
  if (shotsPerGame < 1) goalProbability = Math.max(5, goalProbability - 10);

  // ─── ASSIST PROBABILITY ───
  const assistRate = assistsPerGame;
  
  let assistProbRaw =
    (assistRate * 0.50) +
    (Math.min(keyPassesPerGame / 3, 1) * 0.30) +
    (Math.min(s.passes.accuracy / 100, 1) * 0.20);
  
  // Apply opponent adjustment
  assistProbRaw *= assistMultiplier;
  
  let assistProbability = Math.round(Math.min(90, Math.max(3, assistProbRaw * 100)));
  if (assistsPerGame > 0.3) assistProbability = Math.min(90, assistProbability + 7);

  // ─── FORM SCORE (0–100) ───
  const gaContribution = Math.min(1, (goalsPerGame + assistsPerGame) / 1.2);
  const ratingNorm = rating > 0 ? Math.min(1, (rating - 5.5) / 2.5) : 0.3;
  const consistencyNorm = minutesPercentage / 100;
  
  let formScore = Math.round(
    (gaContribution * 40) +
    (ratingNorm * 30) +
    (consistencyNorm * 30)
  );
  formScore = Math.min(99, Math.max(5, formScore));

  const formLabel: "HOT" | "GOOD" | "COLD" = 
    formScore >= 70 ? "HOT" : formScore >= 40 ? "GOOD" : "COLD";

  // ─── RISK LEVEL ───
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let riskReason = "Starter with consistent form";

  if (profile.player.injured) {
    riskLevel = "HIGH";
    riskReason = "Currently injured";
  } else if (starterPercentage < 50) {
    riskLevel = "HIGH";
    riskReason = "Rotation risk – not a regular starter";
  } else if (s.cards.yellow >= 8 || s.cards.red >= 1) {
    riskLevel = "MEDIUM";
    riskReason = "Discipline risk – high card count";
  } else if (formScore < 40) {
    riskLevel = "MEDIUM";
    riskReason = "Inconsistent recent form";
  } else if (minutesPercentage < 60) {
    riskLevel = "MEDIUM";
    riskReason = "Limited minutes – possible rotation";
  }

  // Opponent can increase risk
  if (opponentAdj?.riskAdjust && riskLevel === "LOW") {
    riskLevel = "MEDIUM";
    riskReason = "Tough opponent – strong defense";
  }

  // ─── SHOTS EXPECTED (adjusted by opponent) ───
  const shotsExpected = Math.round(shotsPerGame * goalMultiplier * 10) / 10;

  // ─── AI BEST PICK ───
  interface PickCandidate {
    pick: string;
    confidence: number;
    condition: boolean;
  }

  const candidates: PickCandidate[] = [
    {
      pick: "Over 0.5 Player Goals",
      confidence: goalProbability,
      condition: goalProbability >= 55,
    },
    {
      pick: "1+ Shots on Target",
      confidence: Math.round(Math.min(95, (shotsOnTargetPerGame / Math.max(0.5, 1)) * 70)),
      condition: shotsOnTargetPerGame >= 1,
    },
    {
      pick: "Assist or Goal Involvement",
      confidence: Math.round(Math.min(90, (goalProbability + assistProbability) / 2)),
      condition: assistProbability >= 35 && goalProbability >= 30,
    },
    {
      pick: "Over 1.5 Shots",
      confidence: Math.round(Math.min(90, (shotsPerGame / 2.5) * 70)),
      condition: shotsPerGame >= 2.5,
    },
    {
      pick: "Anytime Goalscorer",
      confidence: goalProbability,
      condition: goalProbability >= 60,
    },
  ];

  const validCandidates = candidates
    .filter(c => c.condition)
    .sort((a, b) => b.confidence - a.confidence);

  let bestPick: string;
  let bestPickConfidence: number;

  if (validCandidates.length > 0) {
    bestPick = validCandidates[0].pick;
    bestPickConfidence = validCandidates[0].confidence;
  } else if (shotsPerGame >= 1) {
    bestPick = "1+ Shot Attempted";
    bestPickConfidence = Math.round(Math.min(85, shotsPerGame * 40));
  } else {
    bestPick = "Player to Feature";
    bestPickConfidence = Math.round(starterPercentage * 0.9);
  }

  return {
    goalProbability,
    assistProbability,
    formScore,
    formLabel,
    riskLevel,
    riskReason,
    shotsExpected,
    bestPick,
    bestPickConfidence,
    keyPassesPerGame: Math.round(keyPassesPerGame * 10) / 10,
    minutesPercentage,
    starterPercentage,
    opponentAdjustment: opponentAdj,
  };
}
