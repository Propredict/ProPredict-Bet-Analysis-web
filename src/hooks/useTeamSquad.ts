import { useQuery } from "@tanstack/react-query";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface SquadPlayer {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string;
  photo: string;
}

export interface TeamSquadResponse {
  team: { id: number; name: string; logo: string } | null;
  players: SquadPlayer[];
}

async function fetchTeamSquad(teamId: number): Promise<TeamSquadResponse> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/get-team-squad?team=${teamId}`,
    { headers: { "Content-Type": "application/json" } }
  );
  if (!res.ok) return { team: null, players: [] };
  return res.json();
}

export function useTeamSquad(teamId: number | null) {
  return useQuery({
    queryKey: ["team-squad", teamId],
    queryFn: () => fetchTeamSquad(teamId!),
    enabled: !!teamId && teamId > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
