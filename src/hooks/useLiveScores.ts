import { useCallback, useEffect, useRef, useState } from "react";

export type MatchStatus = "live" | "upcoming" | "finished" | "halftime";
export type DateMode = "yesterday" | "today" | "tomorrow";
export type StatusFilter = "all" | "live" | "upcoming" | "finished";

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
const SUPABASE_URL = "https://tczettddxmlcmhdhgebw.supabase.co";

export function useLiveScores(
  statusFilter: StatusFilter = "all",
  dateMode: DateMode = "today"
) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [previousMatches, setPreviousMatches] = useState<Match[]>([]);
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

      // Determine API mode based on statusFilter and dateMode
      let apiMode: string;
      if (statusFilter === "live") {
        apiMode = "live";
      } else {
        apiMode = dateMode; // yesterday, today, or tomorrow
      }

      const params = new URLSearchParams();
      params.set("mode", apiMode);

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/get-fixtures?${params.toString()}`,
        {
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data: ApiResponse = await res.json();

      let filtered = data.fixtures;

      // Apply client-side status filtering
      if (statusFilter === "upcoming") {
        filtered = filtered.filter((m) => m.status === "upcoming");
      }
      if (statusFilter === "finished") {
        filtered = filtered.filter((m) => m.status === "finished");
      }
      if (statusFilter === "live") {
        filtered = filtered.filter(
          (m) => m.status === "live" || m.status === "halftime"
        );
      }

      // Store previous matches for comparison (for alert detection)
      setPreviousMatches(matches);
      setMatches(filtered);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message ?? "Failed to load live scores");
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, dateMode, matches]);

  useEffect(() => {
    fetchMatches();

    const interval = setInterval(fetchMatches, AUTO_REFRESH_MS);

    return () => {
      controllerRef.current?.abort();
      clearInterval(interval);
    };
  }, [statusFilter, dateMode]); // Re-fetch when filters change

  return {
    matches,
    previousMatches,
    isLoading,
    error,
    refetch: fetchMatches,
  };
}
