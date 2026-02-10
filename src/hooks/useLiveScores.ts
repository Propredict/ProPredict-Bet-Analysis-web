import { useCallback, useEffect, useRef, useState } from "react";

export type MatchStatus = "live" | "upcoming" | "finished" | "halftime";

export interface Match {
  id: string; // ← FIXTURE ID (KLJUČNO)
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
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
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-fixtures`;

export function useLiveScores({
  dateMode = "today",
  statusFilter = "all",
}: {
  dateMode?: "today" | "yesterday" | "tomorrow" | "live";
  statusFilter?: "all" | "live" | "upcoming" | "finished";
}) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      const res = await fetch(`${EDGE_URL}?mode=${dateMode}`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: ApiResponse = await res.json();
      let list = data.fixtures ?? [];

      if (statusFilter === "live") {
        list = list.filter((m) => m.status === "live" || m.status === "halftime");
      } else if (statusFilter !== "all") {
        list = list.filter((m) => m.status === statusFilter);
      }

      setMatches(list);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setError("Failed to load live scores");
        setMatches([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateMode, statusFilter]);

  useEffect(() => {
    fetchMatches();
    const i = setInterval(fetchMatches, AUTO_REFRESH_MS);
    return () => {
      abortRef.current?.abort();
      clearInterval(i);
    };
  }, [fetchMatches]);

  return { matches, isLoading, error, refetch: fetchMatches };
}
