import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AIPrediction } from "@/components/ai-predictions/types";

export function useAIPredictions(day: "today" | "tomorrow") {
  const [data, setData] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .eq("match_day", day)
        .order("match_timestamp", { ascending: true });

      if (!error && data) {
        setData(
          data.map((row: any) => ({
            id: row.id,
            matchId: row.match_id,
            league: row.league,
            homeTeam: row.home_team,
            awayTeam: row.away_team,
            matchDate: row.match_date,
            matchTime: row.match_time,

            predictedOutcome: row.prediction,
            predictedScore: row.predicted_score,
            confidence: row.confidence,

            homeWinProbability: row.home_win,
            drawProbability: row.draw,
            awayWinProbability: row.away_win,

            riskLevel: row.risk_level,
            analysis: row.analysis ?? "AI analysis pending.",
            keyFactors: row.key_factors ?? [],

            isLocked: false, // TI SI OSLOBOĐENA ADS
            isPremium: false,
            isLive: false,
          })),
        );
      }

      setLoading(false);
    };

    load();
  }, [day]);

  return { predictions: data, loading };
}
