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

interface ApiResponse {
  fixtures: Match[];
  count: number;
}

const AUTO_REFRESH_MS = 30_000;

export function useLiveScores(mode: "all" | "live" | "upcoming" | "finished" = "all") {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (mode === "live") params.set("mode", "live");
      else params.set("mode", "today");

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-fixtures?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data: ApiResponse = await res.json();

      let filtered = data.fixtures;

      if (mode === "upcoming") {
        filtered = filtered.filter((m) => m.status === "upcoming");
      }
      if (mode === "finished") {
        filtered = filtered.filter((m) => m.status === "finished");
      }

      setMatches(filtered);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message ?? "Failed to load live scores");
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchMatches();

    const interval = setInterval(fetchMatches, AUTO_REFRESH_MS);

    return () => {
      controllerRef.current?.abort();
      clearInterval(interval);
    };
  }, [fetchMatches]);

  return {
    matches,
    isLoading,
    error,
    refetch: fetchMatches,
  };
}
