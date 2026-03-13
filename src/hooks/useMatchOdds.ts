import { useState, useEffect, useRef } from "react";
import { OddsBet } from "./useMatchDetails";

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-match-odds`;

// In-memory cache
const oddsCache = new Map<string, OddsBet[]>();

interface UseMatchOddsResult {
  odds: OddsBet[];
  loading: boolean;
}

function normalizeOdds(rawOdds: any[]): OddsBet[] {
  if (!Array.isArray(rawOdds) || rawOdds.length === 0) return [];

  const firstOdds = rawOdds[0];
  if (!firstOdds) return [];

  if (firstOdds.name && firstOdds.values) {
    return rawOdds as OddsBet[];
  }

  const bookmakers = firstOdds.bookmakers || [];
  if (bookmakers.length === 0) return [];

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

export function useMatchOdds(fixtureId: string | number | null, enabled: boolean): UseMatchOddsResult {
  const [odds, setOdds] = useState<OddsBet[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!fixtureId || !enabled) return;

    const id = String(fixtureId);

    if (oddsCache.has(id)) {
      setOdds(oddsCache.get(id)!);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchOdds = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}?fixtureId=${id}`, {
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          setOdds([]);
          return;
        }

        const json = await res.json().catch(() => null);
        const normalized = normalizeOdds(json?.odds || []);
        oddsCache.set(id, normalized);
        setOdds(normalized);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setOdds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOdds();
    return () => controller.abort();
  }, [fixtureId, enabled]);

  return { odds, loading };
}
