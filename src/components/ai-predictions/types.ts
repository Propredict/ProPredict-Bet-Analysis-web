export type MatchDay = "today" | "tomorrow";
export type RiskLevel = "low" | "medium" | "high";
export type ResultStatus = "pending" | "won" | "lost";

export interface AIPrediction {
  id: string;

  match_id: string;
  league: string;

  home_team: string;
  away_team: string;

  match_date: string;
  match_time: string;
  match_day: MatchDay;

  home_win: number;
  draw: number;
  away_win: number;

  prediction: "1" | "X" | "2";
  predicted_score: string;
  confidence: number;

  risk_level: RiskLevel;

  analysis: string;
  key_factors: string[];

  is_premium: boolean;
  is_live: boolean;

  result_status: ResultStatus;
}
