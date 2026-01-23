import { useCallback, useEffect, useRef, useState } from "react";

export type MatchStatus = "live" | "halftime" | "finished" | "upcoming";

export type Match = {
  id: number;
  league: string;
  leagueCountry: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute?: number;
  startTime?: string;
};

const API_URL = "https://v3.football.api-sports.io/fixtures?live=all";
const REFRESH_INTERVAL = 30000; // 30s

export function useLiveScores() {
  const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;

  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  const fetchMatches = useCallback(
    async (silent = false) => {
      if (!API_KEY) {
        console.error("API Football key is missing");
        setError("Missing API key");
        setIsLoading(false);
        return;
      }

      if (!silent) setIsLoading(true);

      try {
        const res = await fetch(API_URL, {
          headers: {
            "x-apisports-key": API_KEY,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch live matches");
        }

        const json = await res.json();

        const mapped: Match[] = (json.response ?? []).map((item: any) => {
          const statusShort = item.fixture.status.short;

          let status: MatchStatus = "upcoming";
          if (statusShort === "1H" || statusShort === "2H") status = "live";
          if (statusShort === "HT") status = "halftime";
          if (statusShort === "FT") status = "finished";

          return {
            id: item.fixture.id,
            league: item.league.name,
            leagueCountry: item.league.country,
            homeTeam: item.teams.home.name,
            awayTeam: item.teams.away.name,
            homeScore: item.goals.home,
            awayScore: item.goals.away,
            status,
            minute: item.fixture.status.elapsed ?? undefined,
            startTime: item.fixture.date
              ? new Date(item.fixture.date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : undefined,
          };
        });

        setMatches(mapped);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [API_KEY],
  );

  // Initial fetch + auto refresh
  useEffect(() => {
    fetchMatches();

    intervalRef.current = window.setInterval(() => {
      fetchMatches(true);
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMatches]);

  return {
    matches,
    isLoading,
    error,
    refetch: () => fetchMatches(false),
    silentRefetch: () => fetchMatches(true),
  };
}
