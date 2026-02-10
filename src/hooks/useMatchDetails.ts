import { useState, useEffect, useRef } from "react";

const EDGE_FUNCTION_URL =
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-match-details`;

// In-memory cache to avoid refetching for the same fixtureId
const detailsCache = new Map<string, MatchDetails>();

export interface StatItem {
  type: string;
  home: string | number | null;
  away: string | number | null;
}

export interface PlayerLineup {
  id: number;
  name: string;
  number: number;
  pos: string;
  grid: string | null;
}

export interface TeamLineup {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  formation: string | null;
  startXI: PlayerLineup[];
  substitutes: PlayerLineup[];
  coach: {
    id: number;
    name: string;
    photo: string;
  } | null;
}

export interface MatchEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo: string };
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
  comments: string | null;
}

export interface H2HMatch {
  fixture: {
    id: number;
    date: string;
    venue: { name: string; city: string } | null;
  };
  league: { name: string; country: string; logo: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

export interface OddsValue {
  value: string;
  odd: string;
}

export interface OddsBet {
  id: number;
  name: string;
  values: OddsValue[];
}

export interface MatchDetails {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    venue: { name: string; city: string } | null;
    status: { long: string; short: string; elapsed: number | null };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
  statistics: StatItem[];
  lineups: TeamLineup[];
  events: MatchEvent[];
  odds: OddsBet[];
  h2h: H2HMatch[];
}

interface UseMatchDetailsResult {
  data: MatchDetails | null;
  loading: boolean;
  error: string | null;
}

/**
 * Normalize statistics from API format to flat StatItem[]
 * API returns: [{team: {id, name}, statistics: [{type, value}, ...]}, ...]
 * We need: [{type, home, away}, ...]
 */
function normalizeStatistics(rawStats: any[]): StatItem[] {
  if (!Array.isArray(rawStats) || rawStats.length < 2) return [];

  const homeStats = rawStats[0]?.statistics || [];
  const awayStats = rawStats[1]?.statistics || [];

  // Create a map of stat types to home/away values
  const statsMap = new Map<string, StatItem>();

  homeStats.forEach((stat: any) => {
    if (stat?.type) {
      statsMap.set(stat.type, {
        type: stat.type,
        home: stat.value ?? 0,
        away: 0,
      });
    }
  });

  awayStats.forEach((stat: any) => {
    if (stat?.type) {
      const existing = statsMap.get(stat.type);
      if (existing) {
        existing.away = stat.value ?? 0;
      } else {
        statsMap.set(stat.type, {
          type: stat.type,
          home: 0,
          away: stat.value ?? 0,
        });
      }
    }
  });

  return Array.from(statsMap.values());
}

/**
 * Normalize lineups from API format
 * API returns startXI as [{player: {id, name, number, pos, grid}}]
 * We need: [{id, name, number, pos, grid}]
 */
function normalizeLineups(rawLineups: any[]): TeamLineup[] {
  if (!Array.isArray(rawLineups)) return [];

  return rawLineups.map((lineup: any) => ({
    team: lineup.team || { id: 0, name: "Unknown", logo: "" },
    formation: lineup.formation || null,
    coach: lineup.coach || null,
    startXI: (lineup.startXI || []).map((item: any) => {
      const player = item.player || item;
      return {
        id: player.id || 0,
        name: player.name || "Unknown",
        number: player.number || 0,
        pos: player.pos || "",
        grid: player.grid || null,
      };
    }),
    substitutes: (lineup.substitutes || []).map((item: any) => {
      const player = item.player || item;
      return {
        id: player.id || 0,
        name: player.name || "Unknown",
        number: player.number || 0,
        pos: player.pos || "",
        grid: player.grid || null,
      };
    }),
  }));
}

/**
 * Normalize odds from API format
 * API returns: [{bookmakers: [{bets: [{id, name, values: [{value, odd}]}]}]}]
 * We need: [{id, name, values: [{value, odd}]}]
 */
function normalizeOdds(rawOdds: any[]): OddsBet[] {
  if (!Array.isArray(rawOdds) || rawOdds.length === 0) return [];

  // Get first odds entry (pre-match or live odds)
  const firstOdds = rawOdds[0];
  if (!firstOdds) return [];

  // Check if it's already in the expected format
  if (firstOdds.name && firstOdds.values) {
    return rawOdds as OddsBet[];
  }

  // Extract bets from bookmakers
  const bookmakers = firstOdds.bookmakers || [];
  if (bookmakers.length === 0) return [];

  // Use first bookmaker's bets
  const bets = bookmakers[0]?.bets || [];
  
  return bets.map((bet: any) => ({
    id: bet.id || 0,
    name: bet.name || "Unknown",
    values: (bet.values || []).map((v: any) => ({
      value: v.value || "",
      odd: v.odd || "",
    })),
  }));
}

export function useMatchDetails(fixtureId: string | number | null): UseMatchDetailsResult {
  const [data, setData] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!fixtureId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const id = String(fixtureId);

    // Check cache first
    if (detailsCache.has(id)) {
      setData(detailsCache.get(id)!);
      setLoading(false);
      setError(null);
      return;
    }

    // Abort any ongoing request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${EDGE_FUNCTION_URL}?fixtureId=${id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (!res.ok) {
          setData(null);
          return;
        }

        const json = await res.json().catch(() => null);

        if (!json || typeof json !== "object") {
          setData(null);
          return;
        }

        // Normalize the response with proper data extraction
        const normalized: MatchDetails = {
          fixture: json.fixture ?? null,
          league: json.league ?? null,
          teams: json.teams ?? { home: null, away: null },
          goals: json.goals ?? { home: null, away: null },
          score: json.score ?? { halftime: {}, fulltime: {} },
          statistics: normalizeStatistics(json.statistics || []),
          lineups: normalizeLineups(json.lineups || []),
          events: Array.isArray(json.events) ? json.events : [],
          odds: normalizeOdds(json.odds || []),
          h2h: Array.isArray(json.h2h) ? json.h2h : [],
        };

        detailsCache.set(id, normalized);
        setData(normalized);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(null);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();

    return () => controller.abort();
  }, [fixtureId]);

  return { data, loading, error };
}

// Export a function to clear cache if needed
export function clearMatchDetailsCache() {
  detailsCache.clear();
}
