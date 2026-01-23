import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AIPrediction } from "@/components/ai-predictions/types";

type DayFilter = "today" | "tomorrow";

export function useAIPredictions(day: DayFilter) {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      setError(null);

      const today = new Date();
      const targetDate = new Date(today);

      if (day === "tomorrow") {
        targetDate.setDate(today.getDate() + 1);
      }

      const dateString = targetDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .eq("match_date", dateString)
        .order("match_time", { ascending: true });

      if (error) {
        console.error(error);
        setError("Failed to load AI predictions");
      } else {
        const mapped: AIPrediction[] = (data || []).map((row) => ({
          id: row.id,
          matchId: row.match_id,
          league: row.league,
          homeTeam: row.home_team,
          awayTeam: row.away_team,
          matchDate: row.match_date,
          matchTime: row.match_time,

          // AI DATA (iz tvoje tabele)
          predictedOutcome: row.prediction, // "1", "X", "2"
          predictedScore: row.predicted_score,
          confidence: row.confidence,
          homeWinProbability: row.home_win,
          drawProbability: row.draw,
          awayWinProbability: row.away_win,
          riskLevel: row.risk_level,

          // UI FLAGS
          isLive: false,
          isLocked: true, // 🔒 SVE JE LOCKED
          isPremium: false,

          // OPTIONAL (pošto nemas u tabeli)
          analysis: "AI analysis available after unlock",
          keyFactors: [],
        }));

        setPredictions(mapped);
      }

      setLoading(false);
    };

    fetchPredictions();
  }, [day]);

  return { predictions, loading, error };
}
