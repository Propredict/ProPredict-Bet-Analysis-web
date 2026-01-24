import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type LeagueStatsType = "standings" | "scorers" | "assists" | "fixtures" | "rounds";

export interface TeamStanding {
  rank: number;
  team: {
    id: number;
    name: string;
    logo: string;
  };
  points: number;
  goalsDiff: number;
  form: string[];
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
  home?: any;
  away?: any;
  description?: string;
}

export interface PlayerStats {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    photo: string;
    nationality: string;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  games: {
    appearances: number;
    minutes: number;
  };
  goals: number;
  assists: number;
  penalties?: number;
}

export interface FixtureData {
  id: number;
  date: string;
  timestamp: number;
  status: {
    short: string;
    long: string;
    elapsed: number | null;
  };
  round: string;
  home: {
    id: number;
    name: string;
    logo: string;
    goals: number | null;
  };
  away: {
    id: number;
    name: string;
    logo: string;
    goals: number | null;
  };
}

export interface StandingsResponse {
  type: "standings";
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  standings: TeamStanding[];
}

export interface ScorersResponse {
  type: "scorers";
  players: PlayerStats[];
}

export interface AssistsResponse {
  type: "assists";
  players: PlayerStats[];
}

export interface FixturesResponse {
  type: "fixtures";
  fixtures: FixtureData[];
}

export interface RoundsResponse {
  type: "rounds";
  rounds: string[];
}

type LeagueStatsResponse = 
  | StandingsResponse 
  | ScorersResponse 
  | AssistsResponse 
  | FixturesResponse 
  | RoundsResponse;

async function fetchLeagueStats(
  leagueId: string,
  type: LeagueStatsType,
  season: string = "2024"
): Promise<LeagueStatsResponse | null> {
  if (!leagueId || leagueId === "all") {
    return null;
  }

  const { data, error } = await supabase.functions.invoke("league-stats", {
    body: null,
    method: "GET",
  });

  // Use direct fetch since we need query params
  const response = await fetch(
    `https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/league-stats?league=${leagueId}&season=${season}&type=${type}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${type}: ${response.statusText}`);
  }

  return response.json();
}

export function useLeagueStandings(leagueId: string, season: string = "2024") {
  return useQuery({
    queryKey: ["league-stats", "standings", leagueId, season],
    queryFn: () => fetchLeagueStats(leagueId, "standings", season),
    enabled: !!leagueId && leagueId !== "all",
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useLeagueScorers(leagueId: string, season: string = "2024") {
  return useQuery({
    queryKey: ["league-stats", "scorers", leagueId, season],
    queryFn: () => fetchLeagueStats(leagueId, "scorers", season),
    enabled: !!leagueId && leagueId !== "all",
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useLeagueAssists(leagueId: string, season: string = "2024") {
  return useQuery({
    queryKey: ["league-stats", "assists", leagueId, season],
    queryFn: () => fetchLeagueStats(leagueId, "assists", season),
    enabled: !!leagueId && leagueId !== "all",
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useLeagueFixtures(leagueId: string, season: string = "2024") {
  return useQuery({
    queryKey: ["league-stats", "fixtures", leagueId, season],
    queryFn: () => fetchLeagueStats(leagueId, "fixtures", season),
    enabled: !!leagueId && leagueId !== "all",
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useLeagueRounds(leagueId: string, season: string = "2024") {
  return useQuery({
    queryKey: ["league-stats", "rounds", leagueId, season],
    queryFn: () => fetchLeagueStats(leagueId, "rounds", season),
    enabled: !!leagueId && leagueId !== "all",
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
