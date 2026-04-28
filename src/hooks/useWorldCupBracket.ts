import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BracketRound =
  | "Round of 32"
  | "Round of 16"
  | "Quarter-finals"
  | "Semi-finals"
  | "3rd Place Final"
  | "Final";

export interface BracketMatch {
  fixture_id: number | null;
  round: BracketRound;
  date: string | null;
  status: string;
  home: { id: number | null; name: string | null; logo: string | null };
  away: { id: number | null; name: string | null; logo: string | null };
  home_score: number | null;
  away_score: number | null;
  winner: "home" | "away" | null;
  venue: string | null;
}

export interface BracketData {
  bracket: Record<BracketRound, BracketMatch[]>;
  hasData: boolean;
  totalMatches: number;
}

const EMPTY: BracketData = {
  bracket: {
    "Round of 32": [],
    "Round of 16": [],
    "Quarter-finals": [],
    "Semi-finals": [],
    "3rd Place Final": [],
    Final: [],
  },
  hasData: false,
  totalMatches: 0,
};

const CACHE_KEY = "wc2026_bracket_cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export function useWorldCupBracket() {
  const [data, setData] = useState<BracketData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Try cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            if (!cancelled) {
              setData(parsed.data);
              setLoading(false);
              return;
            }
          }
        }
      } catch {
        // ignore cache errors
      }

      try {
        const { data: resp, error: fnError } = await supabase.functions.invoke("get-wc-knockout", {
          method: "GET",
        });

        if (fnError) throw fnError;

        const merged: BracketData = {
          bracket: { ...EMPTY.bracket, ...(resp?.bracket || {}) },
          hasData: !!resp?.hasData,
          totalMatches: resp?.totalMatches ?? 0,
        };

        if (!cancelled) {
          setData(merged);
          setLoading(false);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: merged }));
          } catch {
            // ignore quota errors
          }
        }
      } catch (e) {
        console.error("[useWorldCupBracket]", e);
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...data, loading, error };
}