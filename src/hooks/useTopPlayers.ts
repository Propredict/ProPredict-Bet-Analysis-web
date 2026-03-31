import { useQuery } from "@tanstack/react-query";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface TopPlayerEntry {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  photo: string;
  nationality: string;
  age: number;
  team: { id: number; name: string; logo: string };
  league: { id: number; name: string; logo: string; country: string };
  stats: {
    appearances: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    rating: string | null;
    position: string;
  };
}

export interface TopPlayersLeague {
  league: { id: number; name: string; logo: string; country: string };
  players: TopPlayerEntry[];
}

export interface TopPlayersResponse {
  type: string;
  season: string;
  results: TopPlayersLeague[];
}

type TopPlayerType = "topscorers" | "topassists" | "topyellowcards" | "topredcards";

async function fetchTopPlayers(type: TopPlayerType): Promise<TopPlayersResponse | null> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/get-top-players?type=${type}`,
    { headers: { "Content-Type": "application/json" } }
  );
  if (!res.ok) return null;
  return res.json();
}

export function useTopPlayers(type: TopPlayerType) {
  return useQuery({
    queryKey: ["top-players", type],
    queryFn: () => fetchTopPlayers(type),
    staleTime: 30 * 60 * 1000, // 30 min cache
    gcTime: 60 * 60 * 1000,
  });
}
