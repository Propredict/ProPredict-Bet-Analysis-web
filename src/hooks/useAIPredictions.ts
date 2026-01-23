import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AIPrediction } from "@/components/ai-predictions/types";

export function useAIPredictions(day: "today" | "tomorrow") {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data } = await supabase.from("ai_predictions").select("*").eq("match_day", day).order("match_time");

      setPredictions(data || []);
      setLoading(false);
    };

    load();
  }, [day]);

  const won = predictions.filter((p) => p.result_status === "won").length;
  const lost = predictions.filter((p) => p.result_status === "lost").length;
  const pending = predictions.filter((p) => p.result_status === "pending").length;

  const accuracy = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  return {
    predictions,
    loading,
    stats: { won, lost, pending, accuracy },
  };
}
