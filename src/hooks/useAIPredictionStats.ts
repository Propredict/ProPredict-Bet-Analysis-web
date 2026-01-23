import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AIPredictionStats {
  won: number;
  lost: number;
  pending: number;
  accuracy: number;
}

export function useAIPredictionStats() {
  const [stats, setStats] = useState<AIPredictionStats>({
    won: 0,
    lost: 0,
    pending: 0,
    accuracy: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch from ai_prediction_stats view
      const { data, error } = await supabase
        .from("ai_prediction_stats")
        .select("*")
        .single();

      if (error) {
        console.error("Error fetching stats:", error);
        // Fallback: calculate from predictions
        const { data: predictions } = await supabase
          .from("ai_predictions")
          .select("result_status");

        if (predictions) {
          const won = predictions.filter((p) => p.result_status === "won").length;
          const lost = predictions.filter((p) => p.result_status === "lost").length;
          const pending = predictions.filter((p) => p.result_status === "pending").length;
          const total = won + lost;
          const accuracy = total > 0 ? Math.round((won / total) * 100) : 0;
          setStats({ won, lost, pending, accuracy });
        }
      } else if (data) {
        const won = data.won || 0;
        const lost = data.lost || 0;
        const pending = data.pending || 0;
        const total = won + lost;
        const accuracy = total > 0 ? Math.round((won / total) * 100) : 0;
        setStats({ won, lost, pending, accuracy });
      }
      setLoading(false);
    }
    load();
  }, []);

  return { stats, loading };
}
