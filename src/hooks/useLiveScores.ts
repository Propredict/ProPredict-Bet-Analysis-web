import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type MatchStatus = "live" | "upcoming" | "finished" | "halftime";

export interface Match {
  id: string;
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
const STALE_TIME_MS = 2 * 60 * 1000; // 2 minutes
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-fixtures`;

async function fetchFixtures(
  dateMode: string,
  signal?: AbortSignal
): Promise<Match[]> {
  const res = await fetch(`${EDGE_URL}?mode=${dateMode}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: ApiResponse = await res.json();
  return data.fixtures ?? [];
}

export function useLiveScores({
  dateMode = "today",
  statusFilter = "all",
}: {
  dateMode?: "today" | "yesterday" | "tomorrow" | "live";
  statusFilter?: "all" | "live" | "upcoming" | "finished";
}) {
  const queryClient = useQueryClient();

  const {
    data: allMatches = [],
    isLoading,
    error,
    dataUpdatedAt,
  } = useQuery<Match[]>({
    queryKey: ["live-scores", dateMode],
    queryFn: ({ signal }) => fetchFixtures(dateMode, signal),
    staleTime: STALE_TIME_MS,
    gcTime: 10 * 60 * 1000, // 10 min garbage collection
    refetchInterval: AUTO_REFRESH_MS,
    refetchOnWindowFocus: false,
  });

  // Client-side status filtering
  const matches =
    statusFilter === "all"
      ? allMatches
      : statusFilter === "live"
      ? allMatches.filter((m) => m.status === "live" || m.status === "halftime")
      : allMatches.filter((m) => m.status === statusFilter);

  const hasFetchedOnce = dataUpdatedAt > 0;

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["live-scores", dateMode] });
  }, [queryClient, dateMode]);

  return { matches, isLoading, error: error ? "Failed to load live scores" : null, refetch, hasFetchedOnce };
}
