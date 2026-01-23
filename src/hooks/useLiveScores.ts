import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LiveMatchStatus = "live" | "halftime" | "finished";

export interface LiveMatch {
  id: string;
  league: string;
  leagueLogo: string | null;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  elapsed: number | null;
  status: LiveMatchStatus;
}

interface UseLiveScoresResult {
  matches: LiveMatch[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

export function useLiveScores(): UseLiveScoresResult {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLiveScores = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(
        `https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/get-fixtures?mode=live`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjemV0dGRkeG1sY21oZGhnZWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjI3MjEsImV4cCI6MjA4NDU5ODcyMX0.aMULmU_Lb7E6qFSHSK05JKJRlKXAz5_aXMUYjf_yXgA",
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Handle empty response safely
      const fixtures = data?.fixtures ?? [];

      // Map to LiveMatch interface
      const liveMatches: LiveMatch[] = fixtures.map((fixture: any) => ({
        id: String(fixture.id),
        league: fixture.league ?? "",
        leagueLogo: fixture.leagueLogo ?? null,
        homeTeam: fixture.homeTeam ?? "",
        awayTeam: fixture.awayTeam ?? "",
        homeGoals: fixture.homeScore ?? null,
        awayGoals: fixture.awayScore ?? null,
        elapsed: fixture.minute ?? null,
        status: mapStatus(fixture.status),
      }));

      setMatches(liveMatches);
    } catch (err: any) {
      if (err.name === "AbortError") {
        return; // Ignore abort errors
      }
      console.error("Failed to fetch live scores:", err);
      setError(err.message ?? "Failed to fetch live scores");
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Map status to LiveMatchStatus
  function mapStatus(status: string | undefined): LiveMatchStatus {
    if (!status) return "live";
    if (status === "halftime") return "halftime";
    if (status === "finished") return "finished";
    return "live";
  }

  // Initial fetch
  useEffect(() => {
    fetchLiveScores();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLiveScores]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchLiveScores();
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchLiveScores]);

  return {
    matches,
    isLoading,
    error,
    refetch: fetchLiveScores,
  };
}
