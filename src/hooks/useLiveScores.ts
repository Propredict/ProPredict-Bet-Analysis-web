import { useCallback, useEffect, useRef, useState } from "react";

export type MatchStatus = "live" | "upcoming" | "finished" | "halftime";

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

type Mode = "live" | "all" | "upcoming" | "finished";

const AUTO_REFRESH_MS = 30_000;

export function useLiveScores(mode: Mode = "all") {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchScores = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);

      // TODAY = 2026-01-23 (automatski po server time)
      const res = await fetch(`/functions/v1/get-fixtures?mode=${mode}`, { signal: controller.signal });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const data = await res.json();
      setMatches(data.fixtures || []);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Live scores error:", err);
        setError(err.message || "Failed to load live scores");
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  // Initial fetch + auto refresh
  useEffect(() => {
    fetchScores();

    intervalRef.current = setInterval(() => {
      fetchScores();
    }, AUTO_REFRESH_MS);

    return () => {
      abortRef.current?.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchScores]);

  return {
    matches,
    isLoading,
    error,
    refetch: fetchScores,
  };
}
