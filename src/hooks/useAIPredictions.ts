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
        setPredictions(data as AIPrediction[]);
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
