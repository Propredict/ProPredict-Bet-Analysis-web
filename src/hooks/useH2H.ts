import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface H2HMatch {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string };
  };
  league: {
    id: number;
    name: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    fulltime: { home: number | null; away: number | null };
    halftime: { home: number | null; away: number | null };
  };
}

interface H2HSeason {
  season: number;
  matches: H2HMatch[];
}

interface H2HResponse {
  team1: { id: number; name: string };
  team2: { id: number; name: string };
  summary: {
    team1Wins: number;
    draws: number;
    team2Wins: number;
    totalMatches: number;
  };
  seasons: H2HSeason[];
}

async function fetchH2H(team1Id: number, team2Id: number): Promise<H2HResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const response = await fetch(`${supabaseUrl}/functions/v1/league-h2h?team1=${team1Id}&team2=${team2Id}&last=20`, {
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch H2H data");
  }

  return response.json();
}

export function useH2H(team1Id: number | null, team2Id: number | null) {
  return useQuery({
    queryKey: ["h2h", team1Id, team2Id],
    queryFn: () => fetchH2H(team1Id!, team2Id!),
    enabled: !!team1Id && !!team2Id && team1Id !== team2Id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export type { H2HResponse, H2HSeason, H2HMatch };
