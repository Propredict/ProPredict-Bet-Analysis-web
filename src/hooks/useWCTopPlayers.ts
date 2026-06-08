import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WCTopType = "scorers" | "assists" | "yellow" | "red";

export interface WCTopPlayer {
  id: number;
  name: string;
  photo: string | null;
  nationality: string | null;
  age: number | null;
  team: string | null;
  teamLogo: string | null;
  goals: number;
  assists: number;
  appearances: number;
  minutes: number;
  yellow: number;
  red: number;
}

interface Resp {
  players: WCTopPlayer[];
  type: WCTopType;
  season: number;
  fallback: boolean;
  count: number;
}

export function useWCTopPlayers(type: WCTopType) {
  return useQuery({
    queryKey: ["wc-top-players", type],
    queryFn: async (): Promise<Resp> => {
      const { data, error } = await supabase.functions.invoke(
        `get-wc-top-players?type=${type}`,
        { method: "GET" },
      );
      if (error) throw error;
      return (data ?? { players: [], type, season: 2026, fallback: false, count: 0 }) as Resp;
    },
    staleTime: 10 * 60_000,
    retry: 1,
  });
}