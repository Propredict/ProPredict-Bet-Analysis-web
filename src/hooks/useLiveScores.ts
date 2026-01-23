import { useEffect, useState, useCallback } from "react";

export type MatchStatus = "live" | "halftime" | "finished" | "upcoming";

export interface Match {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute?: number;
  startTime?: string;
}

interface UseLiveScoresResult {
  matches: Match[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLiveScores(): UseLiveScoresResult {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveScores = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      /**
       * ⛔ PRIVREMENO
       * Ovo će u KORAKU 2 biti Supabase Edge Function URL
       */
      const res = await fetch("/api/live-scores-test");

      if (!res.ok) {
        throw new Error("Failed to fetch live scores");
      }

      const data = await res.json();

      /**
       * PRIVREMENO: ako API ne postoji,
       * vrati prazan niz (da UI radi)
       */
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Live scores unavailable");
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveScores();
  }, [fetchLiveScores]);

  return {
    matches,
    isLoading,
    error,
    refetch: fetchLiveScores,
  };
}
