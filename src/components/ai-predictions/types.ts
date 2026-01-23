export type MatchDay = "today" | "tomorrow";
export type RiskLevel = "low" | "medium" | "high";
export type ResultStatus = "pending" | "won" | "lost";

export interface AIPrediction {
  id: string;
  match_id: string;
  league: string | null;

  home_team: string;
  away_team: string;

  match_date: string | null;
  match_time: string | null;
  match_day: MatchDay | null;

  home_win: number;
  draw: number;
  away_win: number;

  prediction: string;
  predicted_score: string | null;
  confidence: number;

  risk_level: RiskLevel | null;

  analysis: string | null;
  key_factors: string[] | null;

  is_premium: boolean | null;
  is_live: boolean | null;
  is_locked: boolean | null;

  result_status: ResultStatus | null;

  // Live match fields (optional)
  live_minute?: number;
  home_score?: number;
  away_score?: number;
}

export interface AIStats {
  won: number;
  lost: number;
  pending: number;
}
