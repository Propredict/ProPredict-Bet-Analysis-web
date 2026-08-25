import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIPredictionLeague {
  league: string;
  matches_count: number;
}

/**
 * Leagues list for AI Predictions filters.
 * Heavily cached (30 min) — this view is expensive and the data barely changes.
 */
export function useAIPredictionLeagues() {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-prediction-leagues"],
    queryFn: async (): Promise<AIPredictionLeague[]> => {
      const { data, error } = await supabase
        .from("ai_prediction_leagues")
        .select("league, matches_count")
        .order("matches_count", { ascending: false });

      if (error) {
        console.error("Error fetching leagues:", error);
        return [];
      }

      return (data || [])
        .filter(
          (l): l is { league: string; matches_count: number } =>
            l.league !== null && l.matches_count !== null
        )
        .map((l) => ({ league: l.league, matches_count: l.matches_count }));
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return { leagues: data ?? [], loading: isLoading };
}
