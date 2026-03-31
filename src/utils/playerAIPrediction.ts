/**
 * Player AI Prediction Engine
 * 
 * Uses real season stats (goals, assists, shots, passes, rating, appearances, etc.)
 * to calculate per-game averages and derive probabilities.
 * 
 * NOT random — all values are deterministic from the player's actual data.
 */

import type { PlayerProfile } from "@/hooks/usePlayerProfile";

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
  minutesPercentage: number;     // % of total possible minutes played
  starterPercentage: number;     // % of appearances as starter
}

export function calculatePlayerPrediction(profile: PlayerProfile): PlayerAIPrediction {
  const s = profile.stats;
  const apps = Math.max(s.appearances, 1); // avoid division by zero

  // ─── PER-GAME AVERAGES (based on real season data) ───
  const goalsPerGame = s.goals / apps;
  const assistsPerGame = s.assists / apps;
  const shotsPerGame = s.shots.total / apps;
  const shotsOnTargetPerGame = s.shots.on / apps;
  const keyPassesPerGame = s.passes.key / apps;
  const dribblesSuccessRate = s.dribbles.attempts > 0
    ? s.dribbles.success / s.dribbles.attempts
    : 0;
  const duelsWinRate = s.duels.total > 0
    ? s.duels.won / s.duels.total
    : 0;
  const rating = parseFloat(s.rating || "0");

  // Minutes percentage (out of max possible ~90min * appearances)
  const maxPossibleMinutes = apps * 90;
  const minutesPercentage = Math.min(100, Math.round((s.minutes / maxPossibleMinutes) * 100));

  // Starter percentage
  const starterPercentage = Math.round((s.lineups / apps) * 100);

  // ─── GOAL PROBABILITY ───
  // Formula: weighted combination of goal rate, shot accuracy, minutes%, and shot volume
  const goalRate = goalsPerGame; // goals per game (e.g., 0.6 = 60% base)
  const shotAccuracy = shotsPerGame > 0 ? shotsOnTargetPerGame / shotsPerGame : 0;
  
  let goalProbRaw = 
    (goalRate * 0.40) +                                    // 40% weight: actual goal scoring rate
    (Math.min(shotsPerGame / 5, 1) * 0.30) +               // 30% weight: shot volume (normalized to 5 max)
    ((minutesPercentage / 100) * 0.20) +                    // 20% weight: minutes played
    (shotAccuracy * 0.10);                                  // 10% weight: shot accuracy
  
  // Convert to 0-100 scale with realistic ceiling
  let goalProbability = Math.round(Math.min(95, Math.max(5, goalProbRaw * 100)));
  
  // Boost for prolific scorers (>0.5 goals/game)
  if (goalsPerGame > 0.5) goalProbability = Math.min(95, goalProbability + 8);
  // Penalty for low-volume shooters
  if (shotsPerGame < 1) goalProbability = Math.max(5, goalProbability - 10);

  // ─── ASSIST PROBABILITY ───
  const assistRate = assistsPerGame;
  
  let assistProbRaw =
    (assistRate * 0.50) +                                    // 50% weight: actual assist rate
    (Math.min(keyPassesPerGame / 3, 1) * 0.30) +             // 30% weight: key passes (normalized to 3)
    (Math.min(s.passes.accuracy / 100, 1) * 0.20);           // 20% weight: pass accuracy
  
  let assistProbability = Math.round(Math.min(90, Math.max(3, assistProbRaw * 100)));
  
  // Boost for creative players (>0.3 assists/game)
  if (assistsPerGame > 0.3) assistProbability = Math.min(90, assistProbability + 7);

  // ─── FORM SCORE (0–100) ───
  // Weighted: G+A contribution (40%), average rating (30%), consistency via minutes (30%)
  const gaContribution = Math.min(1, (goalsPerGame + assistsPerGame) / 1.2); // normalized to ~1.2 G+A/game max
  const ratingNorm = rating > 0 ? Math.min(1, (rating - 5.5) / 2.5) : 0.3;  // 5.5-8.0 range mapped to 0-1
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

  // ─── SHOTS EXPECTED ───
  const shotsExpected = Math.round(shotsPerGame * 10) / 10;

  // ─── AI BEST PICK ───
  // Deterministic rules based on calculated probabilities
  let bestPick = "";
  let bestPickConfidence = 0;

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

  // Pick the highest confidence candidate that meets its condition
  const validCandidates = candidates
    .filter(c => c.condition)
    .sort((a, b) => b.confidence - a.confidence);

  if (validCandidates.length > 0) {
    bestPick = validCandidates[0].pick;
    bestPickConfidence = validCandidates[0].confidence;
  } else {
    // Fallback: safest pick based on what's available
    if (shotsPerGame >= 1) {
      bestPick = "1+ Shot Attempted";
      bestPickConfidence = Math.round(Math.min(85, shotsPerGame * 40));
    } else {
      bestPick = "Player to Feature";
      bestPickConfidence = Math.round(starterPercentage * 0.9);
    }
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
  };
}
