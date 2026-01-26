import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type TipCountByTier = {
  tier: "free" | "daily" | "exclusive" | "premium";
  total: number;
};

export function useTipCounts() {
  return useQuery({
    queryKey: ["tip-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tip_count_by_tier")
        .select("*");

      if (error) {
        console.error("Tip count error:", error);
        throw error;
      }

      return (data ?? []) as TipCountByTier[];
    },
  });
}
