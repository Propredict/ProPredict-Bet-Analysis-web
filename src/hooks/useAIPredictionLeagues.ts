import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AIPredictionLeague {
  league: string;
  matches_count: number;
}

export function useAIPredictionLeagues() {
  const [leagues, setLeagues] = useState<AIPredictionLeague[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("ai_prediction_leagues")
        .select("*")
        .order("matches_count", { ascending: false });

      if (error) {
        console.error("Error fetching leagues:", error);
        setLeagues([]);
      } else {
        setLeagues(
          (data || [])
            .filter((l): l is { league: string; matches_count: number } => 
              l.league !== null && l.matches_count !== null
            )
            .map((l) => ({
              league: l.league,
              matches_count: l.matches_count,
            }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  return { leagues, loading };
}
