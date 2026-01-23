export type MatchDay = "today" | "tomorrow";

export interface AIPrediction {
  // CORE
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;

  matchDate: string;
  matchTime: string;
  matchDay: MatchDay;

  // PROBABILITIES
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;

  // AI OUTPUT
  predictedOutcome: "1" | "X" | "2";
  predictedScore: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high";

  analysis?: string;
  keyFactors?: string[];

  // ACCESS
  isPremium: boolean;
  isLocked: boolean;
}
