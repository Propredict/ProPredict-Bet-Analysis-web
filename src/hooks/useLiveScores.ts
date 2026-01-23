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

type DateMode = "yesterday" | "today" | "tomorrow";

const AUTO_REFRESH_MS = 30_000;

// Map API-Football status codes to our simplified status
function mapApiStatus(shortStatus: string): MatchStatus {
  const liveStatuses = ["1H", "2H", "ET", "P", "LIVE"];
  const halftimeStatuses = ["HT", "BT"];
  const finishedStatuses = ["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"];
  
  if (liveStatuses.includes(shortStatus)) return "live";
  if (halftimeStatuses.includes(shortStatus)) return "halftime";
  if (finishedStatuses.includes(shortStatus)) return "finished";
  return "upcoming";
}

export function useLiveScores(dateMode: DateMode = "today") {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchScores = useCallback(async () => {
    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);

      // Call the edge function with date mode
      const res = await fetch(`/functions/v1/get-fixtures?mode=${dateMode}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const data = await res.json();
      
      // Map the response to ensure correct status format
      const mappedMatches: Match[] = (data.fixtures || []).map((fixture: any) => ({
        ...fixture,
        status: mapApiStatus(fixture.status) || fixture.status,
      }));

      setMatches(mappedMatches);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Live scores error:", err);
        setError(err.message || "Failed to load live scores");
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateMode]);

  // Initial fetch + auto refresh
  useEffect(() => {
    fetchScores();

    // Auto refresh every 30 seconds
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
