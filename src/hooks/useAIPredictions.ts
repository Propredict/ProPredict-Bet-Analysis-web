import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AIPrediction } from "@/components/ai-predictions/types";

type DayFilter = "today" | "tomorrow";

const normalizeOutcome = (value: string): "1" | "X" | "2" => {
  if (value === "1" || value === "2" || value === "X") return value;
  return "1";
};

export function useAIPredictions(day: DayFilter) {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);

      const date = new Date();
      if (day === "tomorrow") date.setDate(date.getDate() + 1);
      const targetDate = date.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .eq("match_date", targetDate)
        .order("match_time", { ascending: true });

      if (error) {
        console.error("AI predictions error:", error);
        setPredictions([]);
        setLoading(false);
        return;
      }

      const mapped: AIPrediction[] = (data ?? []).map((row) => ({
        id: row.id,
        matchId: row.match_id,
        league: row.league,

        homeTeam: row.home_team,
        awayTeam: row.away_team,

        matchDate: row.match_date,
        matchTime: row.match_time,

        predictedOutcome: normalizeOutcome(row.prediction),
        predictedScore: row.predicted_score,
        confidence: row.confidence,

        homeWinProbability: row.home_win,
        drawProbability: row.draw,
        awayWinProbability: row.away_win,

        riskLevel: row.risk_level,

        isLive: false,
        liveMinute: null,

        isLocked: true,
        isPremium: false,

        analysis: "Watch an ad to unlock full AI analysis.",
        keyFactors: [],
      }));

      setPredictions(mapped);
      setLoading(false);
    };

    fetchPredictions();
  }, [day]);

  return { predictions, loading };
}
