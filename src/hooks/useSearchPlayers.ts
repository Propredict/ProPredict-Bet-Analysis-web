import { useQuery } from "@tanstack/react-query";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface PlayerSearchResult {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  photo: string;
  nationality: string;
  age: number | null;
  team: { id: number; name: string; logo: string };
  league: { name: string; logo: string };
  position: string;
  appearances: number;
  goals: number;
  assists: number;
}

async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/search-players?search=${encodeURIComponent(query)}`,
    { headers: { "Content-Type": "application/json" } }
  );
  if (!res.ok) return [];
  return res.json();
}

export function useSearchPlayers(query: string) {
  return useQuery({
    queryKey: ["search-players", query],
    queryFn: () => searchPlayers(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
