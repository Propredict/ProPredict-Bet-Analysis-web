export interface AIPrediction {
  id: string;

  league: string;
  home_team: string;
  away_team: string;

  match_time: string;
  match_day: "today" | "tomorrow";

  prediction: "1" | "X" | "2";
  predicted_score: string; // npr "2-1"
  confidence: number;

  home_win: number;
  draw: number;
  away_win: number;

  risk_level: "low" | "medium" | "high";
  is_premium: boolean;
  result_status: "pending" | "won" | "lost";

  // ➕ NOVO
  odds?: number; // ako postoji
}
