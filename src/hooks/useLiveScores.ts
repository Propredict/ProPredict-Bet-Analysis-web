import { useEffect, useRef, useState, useCallback } from "react";

export type LiveMatch = {
  id: number;
  league: {
    name: string;
    logo?: string;
  };
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  elapsed: number | null;
  status: "LIVE" | "HT" | "FT" | "NS";
};

const API_URL = "https://v3.football.api-sports.io/fixtures?live=all";
const REFRESH_INTERVAL = 30000;

export function useLiveScores() {
  const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;

  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  const fetchLiveScores = useCallback(async () => {
    if (!API_KEY) {
      console.error("API Football key is missing");
      setError("Missing API key");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(API_URL, {
        headers: {
          "x-apisports-key": API_KEY,
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error("Failed to fetch live scores");
      }

      const data = await res.json();

      const mapped: LiveMatch[] = data.response.map((item: any) => ({
        id: item.fixture.id,
        league: {
          name: item.league.name,
          logo: item.league.logo,
        },
        homeTeam: item.teams.home.name,
        awayTeam: item.teams.away.name,
        homeGoals: item.goals.home,
        awayGoals: item.goals.away,
        elapsed: item.fixture.status.elapsed,
        status: item.fixture.status.short,
      }));

      setMatches(mapped);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err);
        setError("Failed to load live matches");
      }
    } finally {
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [API_KEY]);

  useEffect(() => {
    fetchLiveScores();

    intervalRef.current = window.setInterval(fetchLiveScores, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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
