import { useQuery } from "@tanstack/react-query";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface NextOpponentData {
  fixture: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeTeamId: number;
    awayTeamId: number;
    homeLogo: string | null;
    awayLogo: string | null;
    league: string;
    leagueLogo: string | null;
    startTime: string;
  } | null;
  opponent: {
    id: number;
    name: string;
    logo: string | null;
    isHome: boolean; // is our player's team playing at home?
  } | null;
  opponentStats: {
    goalsAgainstPerGame: number;   // how many goals they concede per game
    cleanSheetRate: number;        // % of games with clean sheet
    form: string;                  // e.g. "WWDLW"
    played: number;
    wins: number;
    losses: number;
    defenseRating: number;         // 0-100 (higher = stronger defense)
  } | null;
}

async function fetchNextOpponent(teamId: number, leagueId: number): Promise<NextOpponentData> {
  // 1. Get next fixture for this team
  const fixtureRes = await fetch(
    `${SUPABASE_URL}/functions/v1/get-fixtures?team=${teamId}`,
    { headers: { "Content-Type": "application/json" } }
  );
  
  if (!fixtureRes.ok) return { fixture: null, opponent: null, opponentStats: null };
  
  const fixtureData = await fixtureRes.json();
  const fixtures = fixtureData.fixtures || [];
  
  if (fixtures.length === 0) return { fixture: null, opponent: null, opponentStats: null };
  
  const nextFixture = fixtures[0];
  const isHome = nextFixture.homeTeamId === teamId;
  const opponentTeamId = isHome ? nextFixture.awayTeamId : nextFixture.homeTeamId;
  
  const opponent = {
    id: opponentTeamId,
    name: isHome ? nextFixture.awayTeam : nextFixture.homeTeam,
    logo: isHome ? nextFixture.awayLogo : nextFixture.homeLogo,
    isHome,
  };

  // 2. Get opponent team stats (use the fixture's league or fallback)
  const fixtureLeagueId = leagueId; // from player profile
  const season = new Date().getFullYear();
  
  try {
    const statsRes = await fetch(
      `${SUPABASE_URL}/functions/v1/get-team-stats?homeTeam=${opponentTeamId}&awayTeam=${teamId}&league=${fixtureLeagueId}&season=${season}`,
      { headers: { "Content-Type": "application/json" } }
    );
    
    if (!statsRes.ok) {
      return { fixture: nextFixture, opponent, opponentStats: null };
    }
    
    const statsData = await statsRes.json();
    // Opponent is "home" in our call
    const oppStats = statsData.home;
    
    if (!oppStats) {
      return { fixture: nextFixture, opponent, opponentStats: null };
    }

    const played = oppStats.fixtures?.played?.total || 1;
    const goalsAgainst = oppStats.goals?.against?.total?.total || 0;
    const goalsAgainstPerGame = goalsAgainst / played;
    const cleanSheets = oppStats.cleanSheet?.total || 0;
    const cleanSheetRate = Math.round((cleanSheets / played) * 100);
    const wins = oppStats.fixtures?.wins?.total || 0;
    const losses = oppStats.fixtures?.losses?.total || 0;

    // Defense rating: lower goals against = higher rating
    // Average ~1.3 goals/game conceded is "average" (50)
    // < 0.8 = elite defense (80+), > 2.0 = weak (20-)
    const defenseRating = Math.round(Math.min(100, Math.max(5, 
      100 - (goalsAgainstPerGame * 40)
    )));

    return {
      fixture: nextFixture,
      opponent,
      opponentStats: {
        goalsAgainstPerGame: Math.round(goalsAgainstPerGame * 100) / 100,
        cleanSheetRate,
        form: oppStats.form?.slice(0, 5) || "",
        played,
        wins,
        losses,
        defenseRating,
      },
    };
  } catch {
    return { fixture: nextFixture, opponent, opponentStats: null };
  }
}

export function useNextOpponent(teamId: number | null, leagueId: number | null) {
  return useQuery({
    queryKey: ["next-opponent", teamId, leagueId],
    queryFn: () => fetchNextOpponent(teamId!, leagueId!),
    enabled: !!teamId && teamId > 0 && !!leagueId && leagueId > 0,
    staleTime: 10 * 60 * 1000, // 10 min cache
    gcTime: 15 * 60 * 1000,
  });
}
