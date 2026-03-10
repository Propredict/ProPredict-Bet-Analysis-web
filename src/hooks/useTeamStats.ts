import { useQuery } from "@tanstack/react-query";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface TeamSeasonStats {
  team: { id: number; name: string; logo: string };
  coach: { id: number; name: string; photo: string; nationality: string; age: number | null } | null;
  form: string;
  fixtures: {
    played: { home: number; away: number; total: number };
    wins: { home: number; away: number; total: number };
    draws: { home: number; away: number; total: number };
    losses: { home: number; away: number; total: number };
  };
  goals: {
    for: {
      total: { home: number; away: number; total: number };
      average: { home: string; away: string; total: string };
    };
    against: {
      total: { home: number; away: number; total: number };
      average: { home: string; away: string; total: string };
    };
  };
  cleanSheet: { home: number; away: number; total: number };
  failedToScore: { home: number; away: number; total: number };
  penalty: {
    scored: { total: number; percentage: string };
    missed: { total: number };
  };
  biggestStreak: { wins: number; draws: number; losses: number };
  biggestWins: { home: string | null; away: string | null };
  biggestLosses: { home: string | null; away: string | null };
}

interface TeamStatsResponse {
  home: TeamSeasonStats | null;
  away: TeamSeasonStats | null;
}

async function fetchTeamStats(
  homeTeamId: number,
  awayTeamId: number,
  leagueId: number
): Promise<TeamStatsResponse> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/get-team-stats?homeTeam=${homeTeamId}&awayTeam=${awayTeamId}&league=${leagueId}`,
    { headers: { "Content-Type": "application/json" } }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch team stats");
  }

  return response.json();
}

export function useTeamStats(
  homeTeamId: number | null | undefined,
  awayTeamId: number | null | undefined,
  leagueId: number | null | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ["team-stats", homeTeamId, awayTeamId, leagueId],
    queryFn: () => fetchTeamStats(homeTeamId!, awayTeamId!, leagueId!),
    enabled: enabled && !!homeTeamId && !!awayTeamId && !!leagueId,
    staleTime: 10 * 60 * 1000, // 10 min cache
    gcTime: 30 * 60 * 1000,
  });
}
