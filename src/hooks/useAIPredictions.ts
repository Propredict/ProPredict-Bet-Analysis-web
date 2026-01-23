import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MatchDay = "today" | "tomorrow";

export interface AIPrediction {
  id: string;
  league: string;
  home_team: string;
  away_team: string;
  match_time: string;
  match_day: MatchDay;

  home_win: number;
  draw: number;
  away_win: number;

  prediction: string;
  predicted_score: string;
  confidence: number;
  risk_level: string;

  is_premium: boolean;
  result_status: "pending" | "won" | "lost";
}

export function useAIPredictions(day: MatchDay) {
  const [data, setData] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .eq("match_day", day)
        .order("match_time", { ascending: true });

      if (!error && data) setData(data as AIPrediction[]);
      setLoading(false);
    };

    fetchData();
  }, [day]);

  return { predictions: data, loading };
}
