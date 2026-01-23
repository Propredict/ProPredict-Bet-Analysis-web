import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AIPrediction, MatchDay } from "@/components/ai-predictions/types";

export function useAIPredictions(day: MatchDay) {
  const [data, setData] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .eq("match_day", day)
        .order("match_time", { ascending: true });

      if (!error && data) {
        setData(data);
      }

      setLoading(false);
    };

    fetchPredictions();
  }, [day]);

  return { predictions: data, loading };
}
