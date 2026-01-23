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
        .order("match_time", { ascending: true });

      if (!error && data) {
        setData(
          data.map((m: any) => ({
            match_id: m.match_id,

            league: m.league,
            home_team: m.home_team,
            away_team: m.away_team,

            match_day: m.match_day,
            match_time: m.match_time,

            home_win: m.home_win,
            draw: m.draw,
            away_win: m.away_win,

            prediction: m.prediction,
            predicted_score: m.predicted_score,
            confidence: m.confidence,
            risk_level: m.risk_level,

            is_premium: m.is_premium,
            is_locked: m.is_locked,

            result_status: m.result_status,
          })),
        );
      }

      setLoading(false);
    };

    load();
  }, [day]);

  return { predictions: data, loading };
}
