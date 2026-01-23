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
  startedAt?: number; // timestamp za lokalni timer
}

const REFRESH_INTERVAL = 30000;

export function useLiveScores() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const fetchMatches = useCallback(
    async (mode: "today" | "live" | "yesterday" | "tomorrow" = "today") => {
      if (!SUPABASE_URL) {
        setError("Missing Supabase URL");
        setLoading(false);
        return;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-fixtures?mode=${mode}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        const now = Date.now();

        const mapped: Match[] = (data.fixtures || []).map((m: Match) => ({
          ...m,
          startedAt: m.status === "live" && m.minute !== null ? now - m.minute * 60 * 1000 : undefined,
        }));

        setMatches(mapped);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err);
          setError("Failed to load live scores");
        }
      } finally {
        setLoading(false);
      }
    },
    [SUPABASE_URL],
  );

  // initial + auto refresh
  useEffect(() => {
    fetchMatches("today");

    intervalRef.current = setInterval(() => {
      fetchMatches("today");
    }, REFRESH_INTERVAL);

    return () => {
      controllerRef.current?.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMatches]);

  return {
    matches,
    loading,
    error,
    refetch: fetchMatches,
  };
}
