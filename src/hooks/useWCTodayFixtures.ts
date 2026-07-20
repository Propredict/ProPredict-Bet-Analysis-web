import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WCTodayFixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "live" | "upcoming" | "finished" | "halftime";
  statusShort: string;
  minute: number | null;
  startTime: string | null;
  venue: string | null;
  round: string | null;
}

interface Resp {
  fixtures: WCTodayFixture[];
  count: number;
  date: string;
}

const WC_TODAY_FIXTURES_CACHE_KEY = "propredict_wc_today_fixtures_cache_v1";
const WC_TODAY_FIXTURES_CACHE_TTL = 18 * 60 * 60 * 1000;

function readCachedFixtures(): Resp | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(WC_TODAY_FIXTURES_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { savedAt?: number; data?: Resp };
    if (!parsed?.data || !Array.isArray(parsed.data.fixtures)) return undefined;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > WC_TODAY_FIXTURES_CACHE_TTL) return undefined;
    return parsed.data;
  } catch {
    return undefined;
  }
}

function writeCachedFixtures(data: Resp) {
  if (typeof window === "undefined" || !data.fixtures?.length) return;
  try {
    window.localStorage.setItem(
      WC_TODAY_FIXTURES_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), data }),
    );
  } catch {
    // Ignore storage errors in Android WebView/private mode.
  }
}

export function useWCTodayFixtures() {
  return useQuery({
    queryKey: ["wc-today-fixtures"],
    queryFn: async (): Promise<Resp> => {
      const cached = readCachedFixtures();
      // Use POST with a tiny cache-buster so Android WebView/CDN never serves
      // an old empty GET response on first app open.
      const { data, error } = await supabase.functions.invoke("get-wc-today", {
        method: "POST",
        body: { _ts: Date.now() },
      });
      if (error) {
        if (cached?.fixtures?.length) return cached;
        throw error;
      }
      const fresh = (data ?? { fixtures: [], count: 0, date: "" }) as Resp;
      if (fresh.fixtures?.length) {
        writeCachedFixtures(fresh);
        return fresh;
      }
      // Server says no fixtures today — trust it. Do NOT fall back to a
      // stale cache, otherwise finished/old matches keep showing as "LIVE".
      try { window.localStorage.removeItem(WC_TODAY_FIXTURES_CACHE_KEY); } catch { /* ignore */ }
      return fresh;
    },
    // Use cached data for instant paint, but strip any live/halftime status
    // so a stale cache can never render a match as currently LIVE.
    initialData: () => {
      const c = readCachedFixtures();
      if (!c) return undefined;
      return {
        ...c,
        fixtures: c.fixtures.map((f) =>
          f.status === "live" || f.status === "halftime"
            ? { ...f, status: "finished" as const }
            : f,
        ),
      };
    },
    // Keep 30s only while a WC match is actually live. Outside live windows,
    // polling every 5min protects the API-Football daily quota without hiding
    // current data because we keep the local/DB fallback cached.
    refetchInterval: (query) => {
      const fixtures = ((query.state.data as Resp | undefined)?.fixtures ?? []);
      const hasLive = fixtures.some((f) => f.status === "live" || f.status === "halftime");
      return hasLive ? 30_000 : 5 * 60_000;
    },
    staleTime: 60_000,
    retry: 1,
    // Critical for Android: when the app is resumed (e.g. from a push
    // notification tap), force a fresh fetch instead of serving an empty
    // cached result. Without this, the WC tab can briefly render
    // "No matches today" until the user pulls/reopens the app.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}