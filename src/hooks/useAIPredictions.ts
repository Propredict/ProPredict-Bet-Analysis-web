import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AIPrediction, MatchDay } from "@/components/ai-predictions/types";

export function useAIPredictions(day: MatchDay) {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchPredictions = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .eq("match_day", day)
        .order("match_time", { ascending: true });

      if (!error && data && isMounted) {
        setPredictions(
          data.map((m: any) => ({
            id: m.match_id,
            league: m.league,
            homeTeam: m.home_team,
            awayTeam: m.away_team,

            matchDate: m.match_date,
            matchTime: m.match_time,
            matchDay: m.match_day,

            homeWinProbability: m.home_win,
            drawProbability: m.draw,
            awayWinProbability: m.away_win,

            predictedOutcome: m.prediction,
            predictedScore: m.predicted_score,
            confidence: m.confidence,

            riskLevel: m.risk_level,
            analysis: m.analysis,
            keyFactors: m.key_factors ?? [],

            isPremium: m.is_premium,
            isLocked: m.is_locked,
          })),
        );
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    fetchPredictions();

    return () => {
      isMounted = false;
    };
  }, [day]);

  return { predictions, loading };
}
