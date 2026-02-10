import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MatchStatus = "live" | "upcoming" | "finished" | "halftime";
export type DateFilter = "yesterday" | "today" | "tomorrow";

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number;
  awayTeamId?: number;
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
  silentRefetch: () => Promise<void>;
}

export function useFixtures(dateFilter: DateFilter, fetchLiveOnly: boolean = false): UseFixturesResult {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchFixtures = useCallback(async (silent: boolean = false) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const mode = fetchLiveOnly ? "live" : dateFilter;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-fixtures?mode=${mode}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
            "Content-Type": "application/json",
          },
          signal: abortControllerRef.current.signal,
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
      // Ignore abort errors
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("Error fetching fixtures:", err);
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to fetch fixtures");
      }
      if (!silent) {
        setMatches([]);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [dateFilter, fetchLiveOnly]);

  const refetch = useCallback(() => fetchFixtures(false), [fetchFixtures]);
  const silentRefetch = useCallback(() => fetchFixtures(true), [fetchFixtures]);

  useEffect(() => {
    fetchFixtures(false);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFixtures]);

  return {
    matches,
    isLoading,
    error,
    refetch,
    silentRefetch,
  };
}
