export type Outcome = "1" | "X" | "2" | string;
export type RiskLevel = "low" | "medium" | "high";

export interface AIPrediction {
  id: string;

  // Match info
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;

  league: string;
  leagueLogo?: string;

  matchTime: string; // "20:00"
  matchDate?: string; // "2026-01-23"
  matchDay?: "today" | "tomorrow";

  // Live (za kasnije)
  isLive: boolean;
  liveMinute?: number;
  homeScore?: number;
  awayScore?: number;

  // AI probabilities
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;

  // AI prediction
  predictedOutcome: Outcome; // ⬅️ OVO JE BITNO (nije strogo)
  predictedScore: string;
  confidence: number;
  riskLevel: RiskLevel;

  analysis: string;
  keyFactors: string[];

  // Monetization / access
  isPremium: boolean;
  isLocked: boolean;
}
