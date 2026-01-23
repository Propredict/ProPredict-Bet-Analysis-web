import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AIPrediction } from "@/components/ai-predictions/types";

export function useAIPredictions(day: "today" | "tomorrow") {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    won: 0,
    lost: 0,
    pending: 0,
    accuracy: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data } = await supabase.from("ai_predictions").select("*").eq("match_day", day).order("match_time");

      const won = data?.filter((d) => d.result_status === "won").length ?? 0;
      const lost = data?.filter((d) => d.result_status === "lost").length ?? 0;
      const pending = data?.filter((d) => d.result_status === "pending").length ?? 0;

      setStats({
        won,
        lost,
        pending,
        accuracy: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0,
      });

      setPredictions(data ?? []);
      setLoading(false);
    };

    fetchData();
  }, [day]);

  return { predictions, stats, loading };
}
