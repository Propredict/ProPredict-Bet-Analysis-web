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

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useAIPredictions(
  day: "today" | "tomorrow" = "today"
) {
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const now = new Date();

      const targetDate =
        day === "today"
          ? now
          : new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 1
            );

      // ✅ LOKALNI DATUM (NE UTC)
      const dateString = getLocalDateString(targetDate);

      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .eq("match_date", dateString)
        .order("match_time", { ascending: true });

      if (error) {
        console.error("Error fetching AI predictions:", error);
        setPredictions([]);
      } else {
        setPredictions((data as AIPrediction[]) ?? []);
      }

      setLoading(false);
    }

    load();
  }, [day]);

  return { predictions, loading };
}
