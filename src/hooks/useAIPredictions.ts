import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/integrations/supabase/types";

export type AIPredictionRow = Tables<"ai_predictions">;

export function useAIPredictions() {
  return useQuery({
    queryKey: ["ai-predictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_predictions")
        .select("*")
        .order("match_time", { ascending: true });

      if (error) throw error;
      return data as AIPredictionRow[];
    },
  });
}
