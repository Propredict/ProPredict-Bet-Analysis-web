import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MatchStatus = "LIVE" | "HT" | "FT" | "NS";

export interface Match {
  id: string;
  league: string;
  leagueLogo?: string | null;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute?: number | null;
  startTime?: string;
}

interface UseLiveScoresResult {
  matches: Match[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function mapStatus(status: string): MatchStatus {
  const liveStatuses = ["1H", "2H", "ET", "P", "LIVE"];
  const halftimeStatuses = ["HT", "BT"];
  const finishedStatuses = ["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"];

  if (liveStatuses.includes(status)) return "LIVE";
  if (halftimeStatuses.includes(status)) return "HT";
  if (finishedStatuses.includes(status)) return "FT";
  return "NS";
}

export function useLiveScores(): UseLiveScoresResult {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLiveScores = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
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
        throw new Error(`Failed to fetch live scores: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Map API response to Match interface
      const mappedMatches: Match[] = (data.fixtures || []).map((fixture: any) => ({
        id: String(fixture.id),
        league: fixture.league || "",
        leagueLogo: fixture.leagueLogo || null,
        homeTeam: fixture.homeTeam || "",
        awayTeam: fixture.awayTeam || "",
        homeLogo: fixture.homeLogo || null,
        awayLogo: fixture.awayLogo || null,
        homeScore: fixture.homeScore ?? null,
        awayScore: fixture.awayScore ?? null,
        status: mapStatus(fixture.status === "live" ? "LIVE" : fixture.status === "halftime" ? "HT" : fixture.status === "finished" ? "FT" : "NS"),
        minute: fixture.minute ?? null,
        startTime: fixture.startTime || "",
      }));

      setMatches(mappedMatches);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore abort errors
      }
      console.error("Error fetching live scores:", err);
      setError(err instanceof Error ? err.message : "Live scores unavailable");
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveScores();

    // Auto-refresh every 30 seconds
    const intervalId = setInterval(fetchLiveScores, 30000);

    return () => {
      clearInterval(intervalId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLiveScores]);

  return {
    matches,
    isLoading,
    error,
    refetch: fetchLiveScores,
  };
}
