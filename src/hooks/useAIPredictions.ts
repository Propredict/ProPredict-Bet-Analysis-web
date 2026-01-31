import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

export interface AIPrediction {
  id: string;
  match_id: string;
  league: string | null;
  home_team: string;
  away_team: string;
  match_date: string;
  match_time: string;
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

/**
 * Fetch AI predictions based on dynamic date logic:
 * - "today" → match_date = current date
 * - "tomorrow" → match_date = current date + 1 day
 */
export function useAIPredictions(day: "today" | "tomorrow") {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Calculate the actual date based on "today" or "tomorrow"
      const now = new Date();
      const targetDate = day === "tomorrow" ? addDays(now, 1) : now;
      const dateStr = format(targetDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .eq("match_date", dateStr)
        .order("match_time", { ascending: true });

      if (error) {
        console.error("Error fetching AI predictions:", error);
        setPredictions([]);
      } else {
        setPredictions(data ?? []);
      }

      setLoading(false);
    }

    load();
  }, [day]);

  return { predictions, loading };
}
