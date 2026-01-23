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

// ✅ TAČAN SUPABASE EDGE FUNCTION URL
const SUPABASE_FUNCTIONS_URL = "https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/get-fixtures";

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

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}?mode=${dateMode}`, { signal: controller.signal });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data: ApiResponse = await res.json();

      let list = data.fixtures ?? [];

      // ✅ ISPRAVAN frontend filter
      if (statusFilter === "live") {
        list = list.filter((m) => m.status === "live" || m.status === "halftime");
      } else if (statusFilter !== "all") {
        list = list.filter((m) => m.status === statusFilter);
      }

      setMatches(list);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err?.message ?? "Failed to load live scores");
        setMatches([]);
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
