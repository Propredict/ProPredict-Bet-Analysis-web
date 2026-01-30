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
      const { data, error } = await supabase
        .from("dashboard_results")
        .select("result");

      if (error) throw error;

      let won = 0;
      let lost = 0;
      let pending = 0;

      (data ?? []).forEach((item) => {
        if (item.result === "won") won++;
        else if (item.result === "lost") lost++;
        else pending++;
      });

      // Calculate accuracy: won / (won + lost) * 100
      // Pending items are excluded from accuracy calculation
      const closedTotal = won + lost;
      const accuracy = closedTotal > 0 ? Math.round((won / closedTotal) * 100) : 0;

      return { accuracy, won, lost, pending };
    },
    refetchInterval: 30_000,
  });
}
