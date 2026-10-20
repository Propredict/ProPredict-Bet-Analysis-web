import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TipAccuracy = {
  tier: "free" | "daily" | "exclusive" | "premium";
  accuracy: number;
};

export function useTipAccuracy() {
  return useQuery({
    queryKey: ["tip-accuracy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tip_accuracy_by_tier")
        .select("*");

      if (error) throw error;
      return (data ?? []) as TipAccuracy[];
    },
    // Finished-tip accuracy changes rarely — refresh slowly to save Disk IO.
    staleTime: 10 * 60_000,
    refetchInterval: 15 * 60_000,
  });
}
