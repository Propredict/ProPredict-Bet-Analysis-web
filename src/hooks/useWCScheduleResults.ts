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

interface FixturesByDateResponse {
  fixtures?: Array<{
    homeTeam: string; awayTeam: string;
    homeScore: number | null; awayScore: number | null;
    status: string; statusShort?: string;
  }>;
  count?: number;
  error?: unknown;
}

function matchLooksFinished(matchDate?: string | null, matchTime?: string | null, matchTimestamp?: string | null): boolean {
  const kickoffMs = matchTimestamp
    ? new Date(matchTimestamp).getTime()
    : matchDate && matchTime
      ? new Date(`${matchDate}T${matchTime.slice(0, 5)}:00Z`).getTime()
      : matchDate
        ? new Date(matchDate).getTime()
        : NaN;
  if (!Number.isFinite(kickoffMs)) return true;
  return Date.now() - kickoffMs >= 110 * 60_000;
}

function writeResult(
  out: Map<string, WCScheduleResult>,
  home: string,
  away: string,
  val: WCScheduleResult,
) {
  const key = `${norm(home)}|${norm(away)}`;
  const keyRev = `${norm(away)}|${norm(home)}`;
  if (!out.has(key)) out.set(key, val);
  if (!out.has(keyRev)) {
    out.set(keyRev, {
      ...val,
      homeScore: val.awayScore,
      awayScore: val.homeScore,
    });
  }
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

      const dateList = Array.from(dates).sort();
      const out = new Map<string, WCScheduleResult>();

      // Fast path: when check-goals/update jobs already stored scores in
      // Supabase, render those immediately instead of waiting on API-Football
      // retries/quotas. This is what keeps Overview from staying at 0-0-0.
      const { data: wcPreds } = await supabase
        .from("ai_predictions")
        .select("match_id, home_team, away_team, match_date, match_time, match_timestamp")
        .ilike("league", "%world cup%")
        .in("match_date", dateList)
        .limit(96);

      if ((wcPreds ?? []).length > 0) {
        const { data: cachedScores } = await supabase
          .from("match_scores_cache")
          .select("match_id, home_score, away_score")
          .in("match_id", (wcPreds ?? []).map((p) => p.match_id));

        for (const p of wcPreds ?? []) {
          const score = (cachedScores ?? []).find((s) => s.match_id === p.match_id);
          if (score?.home_score == null || score.away_score == null) continue;
          const finished = matchLooksFinished(p.match_date, p.match_time, p.match_timestamp);
          writeResult(out, p.home_team, p.away_team, {
            homeScore: score.home_score,
            awayScore: score.away_score,
            status: finished ? "FT" : "LIVE",
            finished,
          });
        }

        if (out.size > 0) return out;
      }

      const invokeDate = async (d: string) => {
        let last: Awaited<ReturnType<typeof supabase.functions.invoke>> | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, attempt === 1 ? 450 : 1100));
          }
          last = await supabase.functions.invoke("get-fixtures-by-date", {
            body: { date: d, league: 1, bust: attempt },
          });
          const payload = last.data as FixturesByDateResponse | null;
          const count = Number(payload?.count ?? 0);
          const hasError = !!last.error || !!payload?.error;
          // API-Football intermittently returns an empty league=1 response when
          // many dates are requested at once. Retry empty past dates so already
          // played fixtures never show only kickoff time in Match Schedule.
          if (!hasError && count > 0) return last;
        }
        return last;
      };

      const results: Awaited<ReturnType<typeof supabase.functions.invoke>>[] = [];
      for (let i = 0; i < dateList.length; i += 3) {
        const chunk = dateList.slice(i, i + 3);
        const chunkResults = await Promise.all(chunk.map(invokeDate));
        results.push(...chunkResults.filter((r): r is Awaited<ReturnType<typeof supabase.functions.invoke>> => !!r));
      }
      for (const r of results) {
        const fixtures = ((r.data as FixturesByDateResponse | null)?.fixtures ?? []);
        for (const f of fixtures) {
          if (f.homeScore == null || f.awayScore == null) continue;
          // Skip youth / women / reserve / club fixtures that share country
          // names with senior national teams (e.g. "Algeria U20", "Portuguesa",
          // "Argentino de Merlo"). Without this they normalize to the same
          // first-word key as the real WC fixture and override it.
          const junkRegex = /\b(U1[5-9]|U2[0-3]|U-?17|U-?19|U-?20|U-?21|U-?23|Reserves?|Women|Wom|Youth|Olymp)\b|\sW\b|\sII\b/i;
          if (junkRegex.test(f.homeTeam) || junkRegex.test(f.awayTeam)) continue;
          // Drop obvious club names that share prefixes with countries
          // (Portuguesa, Colombe, Argentino…, Austria Wien, Argentinos Jr.)
          const clubRegex = /(Portuguesa|Colombe|Argentino|Argentinos|Austria Wien|Austria Klagenfurt|Austria Lustenau|Jordan FC|Congo Brazza)/i;
          if (clubRegex.test(f.homeTeam) || clubRegex.test(f.awayTeam)) continue;
          const val: WCScheduleResult = {
            homeScore: f.homeScore,
            awayScore: f.awayScore,
            status: f.statusShort || f.status,
            finished: f.status === "finished" || f.statusShort === "FT",
          };
          writeResult(out, f.homeTeam, f.awayTeam, val);
        }
      }

      const missingPreds = (wcPreds ?? []).filter((p) => !out.has(`${norm(p.home_team)}|${norm(p.away_team)}`));
      if (missingPreds.length > 0) {
        const { data: cachedScores } = await supabase
          .from("match_scores_cache")
          .select("match_id, home_score, away_score")
          .in("match_id", missingPreds.map((p) => p.match_id));

        for (const p of missingPreds) {
          const score = (cachedScores ?? []).find((s) => s.match_id === p.match_id);
          if (score?.home_score == null || score.away_score == null) continue;
          const finished = matchLooksFinished(p.match_date, p.match_time, p.match_timestamp);
          writeResult(out, p.home_team, p.away_team, {
            homeScore: score.home_score,
            awayScore: score.away_score,
            status: finished ? "FT" : "LIVE",
            finished,
          });
        }
      }
      return out;
    },
    // Only poll aggressively when a live/HT match is present. Otherwise the
    // scores are already resolved (in match_scores_cache) and we don't need
    // to burn API-Football quota — 10 minutes is plenty for FT corrections.
    staleTime: 60_000,
    refetchInterval: (query) => {
      const map = query.state.data as Map<string, WCScheduleResult> | undefined;
      if (!map || map.size === 0) return 2 * 60_000;
      let hasLive = false;
      for (const v of map.values()) {
        if (!v.finished) { hasLive = true; break; }
      }
      return hasLive ? 60_000 : 10 * 60_000;
    },
    refetchOnWindowFocus: false,
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
