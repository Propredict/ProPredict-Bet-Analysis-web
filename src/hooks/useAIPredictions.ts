import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AIPredictionRow {
  id: string;
  match_id: string;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  match_time: string;
}

export const useAIPredictions = () => {
  const [data, setData] = useState<AIPredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .eq("match_date", today)
        .order("match_time", { ascending: true });

      if (error) {
        console.error(error);
        setError("Failed to load AI predictions");
      } else {
        setData(data || []);
      }

      setLoading(false);
    };

    fetchPredictions();
  }, []);

  return {
    predictions: data,
    loading,
    error,
  };
};
