import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MatchStatus = "live" | "upcoming" | "finished" | "halftime";
export type DateFilter = "yesterday" | "today" | "tomorrow";

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute: number | null;
  startTime: string;
  league: string;
  leagueCountry: string;
  leagueLogo?: string | null;
  homeLogo?: string | null;
  awayLogo?: string | null;
}

interface UseFixturesResult {
  matches: Match[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFixtures(dateFilter: DateFilter, fetchLiveOnly: boolean = false): UseFixturesResult {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFixtures = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // If today + live filter is active, use live mode; otherwise use date mode
      const mode = fetchLiveOnly ? "live" : dateFilter;

      const supabaseUrl = "https://tczettddxmlcmhdhgebw.supabase.co";
      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-fixtures?mode=${mode}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch fixtures: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setMatches(result.fixtures || []);
    } catch (err) {
      console.error("Error fetching fixtures:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch fixtures");
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, fetchLiveOnly]);

  useEffect(() => {
    fetchFixtures();
  }, [fetchFixtures]);

  return {
    matches,
    isLoading,
    error,
    refetch: fetchFixtures,
  };
}
