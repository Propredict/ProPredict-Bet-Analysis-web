export interface AIPrediction {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  league: string;
  leagueLogo?: string;
  matchTime: string;
  isLive: boolean;
  liveMinute?: number;
  homeScore?: number;
  awayScore?: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  predictedOutcome: "1" | "X" | "2";
  predictedScore: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  analysis: string;
  keyFactors: string[];
  isPremium: boolean;
  isLocked: boolean;
}

export type RiskLevel = "low" | "medium" | "high";
