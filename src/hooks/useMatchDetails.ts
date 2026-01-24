import { useState, useEffect, useRef } from "react";

const EDGE_FUNCTION_URL =
  "https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/get-match-details";

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
          // Silent fail for any error
          setData(null);
          return;
        }

        const json = await res.json().catch(() => null);

        if (!json || typeof json !== "object") {
          setData(null);
          return;
        }

        // Normalize the response
        const normalized: MatchDetails = {
          fixture: json.fixture ?? null,
          league: json.league ?? null,
          teams: json.teams ?? { home: null, away: null },
          goals: json.goals ?? { home: null, away: null },
          score: json.score ?? { halftime: {}, fulltime: {} },
          statistics: Array.isArray(json.statistics) ? json.statistics : [],
          lineups: Array.isArray(json.lineups) ? json.lineups : [],
          events: Array.isArray(json.events) ? json.events : [],
          odds: Array.isArray(json.odds) ? json.odds : [],
          h2h: Array.isArray(json.h2h) ? json.h2h : [],
        };

        detailsCache.set(id, normalized);
        setData(normalized);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(null); // Silent fail
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
