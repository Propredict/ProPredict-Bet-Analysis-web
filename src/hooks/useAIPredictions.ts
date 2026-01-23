import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AIPrediction, MatchDay } from "@/components/ai-predictions/types";

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
            matchDate: m.match_date,
            matchTime: m.match_time,
            matchDay: m.match_day,
            homeWin: m.home_win,
            draw: m.draw,
            awayWin: m.away_win,
            prediction: m.prediction,
            predictedScore: m.predicted_score,
            confidence: m.confidence,
            riskLevel: m.risk_level,
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
