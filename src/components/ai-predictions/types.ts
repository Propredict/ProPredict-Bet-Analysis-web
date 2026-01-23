export type MatchDay = "today" | "tomorrow";

export interface AIPrediction {
  id: string;

  league: string;
  homeTeam: string;
  awayTeam: string;

  matchDate: string;
  matchTime: string;
  matchDay: MatchDay;

  homeWin: number;
  draw: number;
  awayWin: number;

  prediction: "1" | "X" | "2";
  predictedScore: string;
  confidence: number;

  riskLevel: "low" | "medium" | "high";

  isPremium: boolean;
  resultStatus: "pending" | "won" | "lost";
}
