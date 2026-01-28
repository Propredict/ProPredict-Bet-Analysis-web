import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface GlobalWinRateData {
  accuracy: number;
  won: number;
  lost: number;
  pending: number;
}

export function useGlobalWinRate() {
  return useQuery({
    queryKey: ["global-win-rate"],
    queryFn: async (): Promise<GlobalWinRateData> => {
      // Fetch tips results
      const { data: tipsData, error: tipsError } = await supabase
        .from("tips")
        .select("result")
        .eq("status", "published");

      if (tipsError) throw tipsError;

      // Fetch tickets results
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("tickets")
        .select("result")
        .eq("status", "published");

      if (ticketsError) throw ticketsError;

      // Count results from tips
      let tipsWon = 0;
      let tipsLost = 0;
      let tipsPending = 0;

      (tipsData ?? []).forEach((tip) => {
        if (tip.result === "won") tipsWon++;
        else if (tip.result === "lost") tipsLost++;
        else tipsPending++;
      });

      // Count results from tickets
      let ticketsWon = 0;
      let ticketsLost = 0;
      let ticketsPending = 0;

      (ticketsData ?? []).forEach((ticket) => {
        if (ticket.result === "won") ticketsWon++;
        else if (ticket.result === "lost") ticketsLost++;
        else ticketsPending++;
      });

      // Combine counts
      const won = tipsWon + ticketsWon;
      const lost = tipsLost + ticketsLost;
      const pending = tipsPending + ticketsPending;

      // Calculate accuracy: won / (won + lost) * 100
      // If no closed items, accuracy is 0
      const closedTotal = won + lost;
      const accuracy = closedTotal > 0 ? Math.round((won / closedTotal) * 100) : 0;

      return { accuracy, won, lost, pending };
    },
    refetchInterval: 30_000,
  });
}
