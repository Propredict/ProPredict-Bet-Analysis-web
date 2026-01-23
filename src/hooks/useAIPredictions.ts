import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type MatchDay = "today" | "tomorrow";

export interface AIPrediction {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
  matchDay: MatchDay;

  homeWin: number;
  draw: number;
  awayWin: number;

  predictedScore: string;
  confidence: number;

  isPremium: boolean;
  resultStatus: "pending" | "won" | "lost";
}

export function useAIPredictions(day: MatchDay) {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    won: 0,
    lost: 0,
    pending: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data } = await supabase
        .from("ai_predictions")
        .select("*")
        .eq("match_day", day)
        .order("match_time", { ascending: true });

      if (data) {
        setPredictions(
          data.map((m) => ({
            id: m.match_id,
            league: m.league,
            homeTeam: m.home_team,
            awayTeam: m.away_team,
            matchTime: m.match_time,
            matchDay: m.match_day,
            homeWin: m.home_win,
            draw: m.draw,
            awayWin: m.away_win,
            predictedScore: m.predicted_score,
            confidence: m.confidence,
            isPremium: m.is_premium,
            resultStatus: m.result_status,
          })),
        );
      }

      const { data: s } = await supabase.from("ai_prediction_stats").select("*").single();

      if (s) setStats(s);

      setLoading(false);
    };

    load();
  }, [day]);

  const accuracy = stats.won + stats.lost > 0 ? Math.round((stats.won / (stats.won + stats.lost)) * 100) : 0;

  return {
    predictions,
    loading,
    stats,
    accuracy,
  };
}
