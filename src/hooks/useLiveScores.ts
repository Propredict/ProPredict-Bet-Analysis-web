import { useCallback, useEffect, useRef, useState } from "react";

export type MatchStatus = "live" | "halftime" | "finished" | "upcoming";

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
  leagueLogo: string | null;
  homeLogo: string | null;
  awayLogo: string | null;
}

export type DateMode = "today" | "yesterday" | "tomorrow" | "live";

export function useLiveScores(mode: DateMode = "today") {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const abortRef = useRef<AbortController | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      setError("");
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-fixtures?mode=${mode}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch fixtures (${res.status})`);
      }

      const data = await res.json();
      setMatches(data.fixtures ?? []);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to load live scores");
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    setIsLoading(true);
    fetchMatches();

    const interval = setInterval(fetchMatches, 30000); // auto refresh 30s

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchMatches]);

  return {
    matches,
    isLoading,
    error,
    refetch: fetchMatches,
  };
}
