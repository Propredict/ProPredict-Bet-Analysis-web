import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AIPrediction {
  id: string;
  match_id: string;
  league: string | null;
  home_team: string;
  away_team: string;
  match_date: string | null;
  match_time: string | null;
  prediction: string;
  predicted_score: string | null;
  confidence: number;
  home_win: number;
  draw: number;
  away_win: number;
  risk_level: string | null;
  analysis: string | null;
  key_factors: string[] | null;
  is_premium: boolean | null;
  is_live: boolean | null;
  is_locked: boolean | null;
  result_status: string | null;
}

export function useAIPredictions(day: "today" | "tomorrow" = "today") {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPredictions() {
      setLoading(true);

      const viewName =
        day === "today"
          ? "ai_predictions_today"
          : "ai_predictions_tomorrow";

      const { data, error } = await supabase
        .from(viewName)
        .select("*")
        .order("match_time", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("❌ Error loading AI predictions:", error);
        setPredictions([]);
      } else {
        setPredictions((data ?? []) as AIPrediction[]);
      }

      setLoading(false);
    }

    loadPredictions();

    return () => {
      mounted = false;
    };
  }, [day]);

  return { predictions, loading };
}
