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

// 🔴 OVDJE UPISI TVOJ SUPABASE PROJECT URL
const SUPABASE_FUNCTIONS_URL = "https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-fixtures";

export function useLiveScores({
  dateMode = "today", // today | yesterday | tomorrow | live
  statusFilter = "all", // all | live | upcoming | finished
}: {
  dateMode?: "today" | "yesterday" | "tomorrow" | "live";
  statusFilter?: "all" | "live" | "upcoming" | "finished";
}) {
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
      params.set("mode", dateMode);

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}?${params.toString()}`, { signal: controller.signal });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data: ApiResponse = await res.json();

      let filtered = data.fixtures;

      // 🔹 frontend status filter
      if (statusFilter !== "all") {
        filtered = filtered.filter((m) => m.status === statusFilter);
      }

      setMatches(filtered);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err?.message ?? "Failed to load live scores");
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateMode, statusFilter]);

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
