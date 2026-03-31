import { useQuery } from "@tanstack/react-query";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface PlayerProfile {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    photo: string;
    nationality: string;
    age: number | null;
    height: string | null;
    weight: string | null;
    birth: { date: string | null; place: string | null; country: string | null };
    injured: boolean;
  };
  team: { id: number; name: string; logo: string };
  league: { id: number; name: string; logo: string; country: string; season: number };
  stats: {
    appearances: number;
    lineups: number;
    minutes: number;
    position: string;
    rating: string | null;
    captain: boolean;
    goals: number;
    assists: number;
    saves: number | null;
    conceded: number | null;
    shots: { total: number; on: number };
    passes: { total: number; key: number; accuracy: number };
    tackles: { total: number; blocks: number; interceptions: number };
    duels: { total: number; won: number };
    dribbles: { attempts: number; success: number };
    fouls: { drawn: number; committed: number };
    cards: { yellow: number; yellowred: number; red: number };
    penalty: { won: number; scored: number; missed: number; saved: number };
  };
  allStats: Array<{
    team: { id: number; name: string; logo: string };
    league: { name: string; logo: string };
    appearances: number;
    goals: number;
    assists: number;
  }>;
  transfers: Array<{
    date: string;
    type: string;
    teams: {
      from: { id: number; name: string; logo: string };
      to: { id: number; name: string; logo: string };
    };
  }>;
  trophies: Array<{
    league: string;
    country: string;
    season: string;
    place: string;
  }>;
  sidelined: Array<{
    type: string;
    start: string;
    end: string;
  }>;
  careerTeams: Array<{
    team: { id: number; name: string; logo: string };
    seasons: number[];
  }>;
  availableSeasons: number[];
}

async function fetchPlayerProfile(playerId: number): Promise<PlayerProfile | null> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/get-player-profile?player=${playerId}`,
    { headers: { "Content-Type": "application/json" } }
  );
  if (!res.ok) return null;
  return res.json();
}

export function usePlayerProfile(playerId: number | null) {
  return useQuery({
    queryKey: ["player-profile", playerId],
    queryFn: () => fetchPlayerProfile(playerId!),
    enabled: !!playerId && playerId > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
