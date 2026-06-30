import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WCTodayFixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "live" | "upcoming" | "finished" | "halftime";
  statusShort: string;
  minute: number | null;
  startTime: string | null;
  venue: string | null;
  round: string | null;
}

interface Resp {
  fixtures: WCTodayFixture[];
  count: number;
  date: string;
}

export function useWCTodayFixtures() {
  return useQuery({
    queryKey: ["wc-today-fixtures"],
    queryFn: async (): Promise<Resp> => {
      const { data, error } = await supabase.functions.invoke("get-wc-today", { method: "GET" });
      if (error) throw error;
      return (data ?? { fixtures: [], count: 0, date: "" }) as Resp;
    },
    // Auto-refresh every 30s — picks up live score changes.
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 1,
    // Critical for Android: when the app is resumed (e.g. from a push
    // notification tap), force a fresh fetch instead of serving an empty
    // cached result. Without this, the WC tab can briefly render
    // "No matches today" until the user pulls/reopens the app.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}