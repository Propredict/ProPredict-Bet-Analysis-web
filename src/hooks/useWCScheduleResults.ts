import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GROUP_MATCHES } from "@/data/worldCup2026";

// Parse "Jun 11" + "21:00" CET → YYYY-MM-DD (UTC date of the kickoff).
const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};
function toUtcDate(date: string, time: string): string | null {
  try {
    const [mon, day] = date.split(" ");
    const [hh, mm] = time.split(":").map((x) => parseInt(x, 10));
    const m = MONTHS[mon];
    if (m == null) return null;
    const ms = Date.UTC(2026, m, parseInt(day, 10), hh - 2, mm || 0);
    return new Date(ms).toISOString().split("T")[0];
  } catch {
    return null;
  }
}

const ALIASES: Record<string, string> = {
  czechia: "czech", "czech republic": "czech",
  turkiye: "turkey", türkiye: "turkey",
  "korea republic": "korea", "south korea": "korea",
  usa: "unitedstates", "united states": "unitedstates",
  "bosnia and herzegovina": "bosnia", "bosnia & herzegovina": "bosnia",
  "ivory coast": "ivorycoast", "cote d ivoire": "ivorycoast",
  "dr congo": "drcongo", "congo dr": "drcongo",
};
export function norm(s: string): string {
  const base = (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (ALIASES[base]) return ALIASES[base];
  const first = base.split(" ")[0] ?? "";
  return ALIASES[first] ?? first;
}

export interface WCScheduleResult {
  homeScore: number;
  awayScore: number;
  status: string;
  finished: boolean;
}

export function useWCScheduleResults() {
  return useQuery({
    queryKey: ["wc-schedule-results"],
    queryFn: async (): Promise<Map<string, WCScheduleResult>> => {
      const now = Date.now();
      // Include past dates AND today (so live/HT scores show up in
      // Matches tab as soon as the match kicks off, not only after FT).
      const todayStr = new Date(now).toISOString().split("T")[0];
      const dates = new Set<string>();
      for (const m of GROUP_MATCHES) {
        const d = toUtcDate(m.date, m.time);
        if (!d) continue;
        if (d <= todayStr) dates.add(d);
      }
      if (dates.size === 0) return new Map();

      const results = await Promise.all(
        Array.from(dates).map((d) =>
          supabase.functions.invoke("get-fixtures-by-date", { body: { date: d } }),
        ),
      );
      const out = new Map<string, WCScheduleResult>();
      for (const r of results) {
        const fixtures = (r.data?.fixtures ?? []) as Array<{
          homeTeam: string; awayTeam: string;
          homeScore: number | null; awayScore: number | null;
          status: string; statusShort?: string;
        }>;
        for (const f of fixtures) {
          if (f.homeScore == null || f.awayScore == null) continue;
          const key = `${norm(f.homeTeam)}|${norm(f.awayTeam)}`;
          const keyRev = `${norm(f.awayTeam)}|${norm(f.homeTeam)}`;
          const val: WCScheduleResult = {
            homeScore: f.homeScore,
            awayScore: f.awayScore,
            status: f.statusShort || f.status,
            finished: f.status === "finished" || f.statusShort === "FT",
          };
          if (!out.has(key)) out.set(key, val);
          if (!out.has(keyRev)) {
            out.set(keyRev, {
              ...val,
              homeScore: f.awayScore,
              awayScore: f.homeScore,
            });
          }
        }
      }
      return out;
    },
    // Live matches: refresh every 60s so Matches tab scores update during games.
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function lookupWCResult(
  map: Map<string, WCScheduleResult> | undefined,
  home: string,
  away: string,
): WCScheduleResult | null {
  if (!map) return null;
  return map.get(`${norm(home)}|${norm(away)}`) ?? null;
}
