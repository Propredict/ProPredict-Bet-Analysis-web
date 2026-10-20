import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TicketAccuracy = {
  tier: "daily" | "exclusive" | "premium";
  accuracy: number;
};

export function useTicketAccuracy() {
  return useQuery({
    queryKey: ["ticket-accuracy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_accuracy_by_tier")
        .select("*");

      if (error) throw error;
      return (data ?? []) as TicketAccuracy[];
    },
    // Accuracy only changes when finished tickets are settled — no need to
    // re-run this aggregate view every 30s for every visitor (Disk IO).
    staleTime: 10 * 60_000,
    refetchInterval: 15 * 60_000,
  });
}
