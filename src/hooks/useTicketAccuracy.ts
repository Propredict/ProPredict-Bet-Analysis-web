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
    refetchInterval: 30_000,
  });
}
