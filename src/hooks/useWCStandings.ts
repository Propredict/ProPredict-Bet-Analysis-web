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
    // Standings only update after full-time. 30min polling is more than enough
    // and saves ~5x API-Football requests per user.
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
  });
}
