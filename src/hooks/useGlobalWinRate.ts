import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WIN_RATE_DISPLAY } from "@/config/winRateDisplay";

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

      let pending = 0;

      (data ?? []).forEach((item) => {
        if (item.result !== "won" && item.result !== "lost") pending++;
      });

      // Win Rate / Success / Missed are manually configured in
      // src/config/winRateDisplay.ts and are intentionally NOT derived from
      // historical tips or tickets, so deleting old records cannot lower them.
      return {
        accuracy: WIN_RATE_DISPLAY.accuracy,
        won: WIN_RATE_DISPLAY.successCount,
        lost: WIN_RATE_DISPLAY.missedCount,
        pending,
      };
    },
    refetchInterval: 30_000,
  });
}
