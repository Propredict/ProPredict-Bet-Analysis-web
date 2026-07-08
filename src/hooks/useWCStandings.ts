import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WCStandingTeam {
  team: string;
  logo: string;
  rank: number;
  points: number;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
}

interface WCStandingsResponse {
  standings: Record<string, WCStandingTeam[]>;
  hasData: boolean;
}

export function useWCStandings() {
  return useQuery({
    queryKey: ["wc-standings-2026"],
    queryFn: async (): Promise<WCStandingsResponse> => {
      const { data, error } = await supabase.functions.invoke("get-wc-standings");
      if (error) throw error;
      return data as WCStandingsResponse;
    },
    // Group stage is over and tables no longer change. Keep the last fetched
    // data cached without any automatic refetch to save API quota.
    staleTime: Infinity,
    refetchInterval: false,
    retry: 1,
  });
}
