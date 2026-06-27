import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WCTodayFixture } from "./useWCTodayFixtures";

export interface WCYesterdayAIPick {
  match_id: string;
  home_team: string;
  away_team: string;
  match_date: string | null;
  home_win: number;
  draw: number;
  away_win: number;
  confidence: number;
  predicted_score: string | null;
  prediction: string;
  analysis: string | null;
}

export interface WCFinishedItem {
  fixture: WCTodayFixture;
  pick: WCYesterdayAIPick | null;
  pickedSide: "home" | "draw" | "away";
  actualSide: "home" | "draw" | "away";
  isWin: boolean;
  /** Finished fixtures are evaluated immediately at FT. */
  resultReady: boolean;
}

function yyyymmddBelgrade(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
}

function side(h: number, d: number, a: number): "home" | "draw" | "away" {
  if (h >= d && h >= a) return "home";
  if (a >= h && a >= d) return "away";
  return "draw";
}

function getStoredMarketPick(
  prediction?: string | null,
  analysis?: string | null,
  predictedScore?: string | null,
  probs?: { home?: number | null; draw?: number | null; away?: number | null } | null,
) {
  const pred = (prediction || "").toLowerCase();
  const text = `${pred} ${analysis || ""}`.toLowerCase();
  // IMPORTANT: the Finished card hardcodes the goals line to 2.5 in the UI.
  // So we MUST evaluate WIN against the 2.5 line only, regardless of which
  // line is mentioned in the stored prediction/analysis text. Otherwise a
  // stored "Over 1.5" pick would pass a 0-2 result while the card displays
  // "Over 2.5" (which loses).
  const goalsDirMatch = pred.match(/\b(over|under)\b/) || text.match(/\b(over|under)\b/);
  const bttsYes = /btts[^.]*\byes\b|\byes\s+btts\b|both teams to score[^.]*yes|over\/btts favored|btts favored|\bgg\b/.test(text);
  const bttsNo = /btts[^.]*\bno\b|\bno\s+btts\b|both teams to score[^.]*no|\bng\b/.test(text);
  // Track whether each market came from explicit text or was derived from
  // predicted_score. Finished results use the same two user-visible markets
  // as the card: Over/Under and BTTS. 1X2 and exact score never decide WIN.
  const goalsExplicit = !!goalsDirMatch;
  let goalsResolved: { dir: "over" | "under"; line: number } | null = goalsDirMatch
    ? { dir: goalsDirMatch[1].toLowerCase() as "over" | "under", line: 2.5 }
    : null;
  const bttsExplicit = bttsYes || bttsNo;
  let bttsResolved: "yes" | "no" | null = bttsYes ? "yes" : bttsNo ? "no" : null;
  if ((!goalsResolved || !bttsResolved) && predictedScore) {
    const m = predictedScore.match(/(\d+)\s*[-–:]\s*(\d+)/);
    if (m) {
      const ph = parseInt(m[1], 10);
      const pa = parseInt(m[2], 10);
      if (!goalsResolved) {
        goalsResolved = { dir: ph + pa >= 3 ? "over" : "under", line: 2.5 };
      }
      if (!bttsResolved) {
        bttsResolved = ph >= 1 && pa >= 1 ? "yes" : "no";
      }
    }
  }
  // Coherence pass — mirror the rule used in the UI card so the WIN check
  // grades the exact line shown to the user.
  if (bttsResolved === "no") {
    goalsResolved = { dir: "under", line: 2.5 };
  }
  return {
    goals: goalsResolved,
    btts: bttsResolved,
    goalsExplicit,
    bttsExplicit,
  };
}

/**
 * Loads yesterday's finished WC fixtures + the matching AI picks that were
 * stored on that date, and computes Win/Loss vs the actual result.
 */
export function useWCYesterdayResults() {
  return useQuery({
    queryKey: ["wc-yesterday-results"],
    queryFn: async (): Promise<WCFinishedItem[]> => {
      const yesterday = yyyymmddBelgrade(-1);
      const today = yyyymmddBelgrade(0);
      const twoDaysAgo = yyyymmddBelgrade(-2);

      const [fxTwo, fxYesterday, fxToday, predRes] = await Promise.all([
        supabase.functions.invoke("get-wc-today", { body: { date: twoDaysAgo } }),
        supabase.functions.invoke("get-wc-today", { body: { date: yesterday } }),
        supabase.functions.invoke("get-wc-today", { body: { date: today } }),
        supabase
          .from("ai_predictions")
          .select(
            "match_id, home_team, away_team, match_date, home_win, draw, away_win, confidence, predicted_score, prediction, analysis",
          )
          .ilike("league", "%world cup%")
          .in("match_date", [twoDaysAgo, yesterday, today])
          .limit(64),
      ]);

      const allFx: WCTodayFixture[] = [
        ...(fxTwo.data?.fixtures ?? []),
        ...(fxYesterday.data?.fixtures ?? []),
        ...(fxToday.data?.fixtures ?? []),
      ];
      const picks = (predRes.data ?? []) as WCYesterdayAIPick[];

      // Tolerant name normalizer — handles "Czechia" vs "Czech Republic",
      // "Türkiye" vs "Turkey", "Korea Republic" vs "South Korea", "USA" vs
      // "United States", "Bosnia & Herzegovina" vs "Bosnia and Herzegovina",
      // accents, punctuation, and extra whitespace.
      const ALIASES: Record<string, string> = {
        czechia: "czech", "czech republic": "czech",
        turkiye: "turkey", türkiye: "turkey",
        "korea republic": "korea", "south korea": "korea", "republic of korea": "korea",
        usa: "unitedstates", us: "unitedstates", "united states": "unitedstates",
        "bosnia and herzegovina": "bosnia", "bosnia & herzegovina": "bosnia",
        "ivory coast": "ivorycoast", "cote d ivoire": "ivorycoast", "côte d ivoire": "ivorycoast",
        "dr congo": "drcongo", "congo dr": "drcongo",
        "democratic republic of the congo": "drcongo",
        "democratic republic of congo": "drcongo",
        "congo democratic republic": "drcongo",
        "congo kinshasa": "drcongo", "rd congo": "drcongo",
      };
      const norm = (s: string) => {
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
      };
      const findPick = (home: string, away: string) => {
        const h = norm(home);
        const a = norm(away);
        const direct = picks.find(
          (p) => norm(p.home_team) === h && norm(p.away_team) === a,
        );
        if (direct) return { p: direct, swapped: false };
        const rev = picks.find(
          (p) => norm(p.home_team) === a && norm(p.away_team) === h,
        );
        if (rev) return { p: rev, swapped: true };
        return null;
      };

      // Determine which picks didn't match an API WC fixture, then fall back
      // to /fixtures?date=... (no league filter) to recover scores for
      // friendlies/qualifiers (e.g. Australia vs Türkiye).
      // Include every fixture whose API status is "finished". Finished cards
      // are evaluated immediately at FT: wins are shown, losses are hidden.
      const fixtures: WCTodayFixture[] = allFx.filter(
        (f: WCTodayFixture) => f.status === "finished",
      );
      // A pick is "unmatched" only when NO fixture (live, scheduled, or
      // finished) was found for it in the WC fetch. Picks whose match is
      // live/scheduled MUST NOT fall through to the cache fallback, or a
      // live score will be mis-rendered as a final FT result.
      const hasAnyFixture = (p: WCYesterdayAIPick) =>
        allFx.some(
          (f) =>
            (norm(f.homeTeam) === norm(p.home_team) && norm(f.awayTeam) === norm(p.away_team)) ||
            (norm(f.homeTeam) === norm(p.away_team) && norm(f.awayTeam) === norm(p.home_team)),
        );
      const unmatchedPicks = picks.filter((p) => !hasAnyFixture(p));
      if (unmatchedPicks.length > 0) {
        const dates = Array.from(new Set(unmatchedPicks.map((p) => p.match_date).filter(Boolean))) as string[];
        const extraResults = await Promise.all(
          dates.map((d) =>
            supabase.functions.invoke("get-fixtures-by-date", { body: { date: d } }),
          ),
        );
        const extras: WCTodayFixture[] = extraResults.flatMap(
          (r) => (r.data?.fixtures ?? []) as WCTodayFixture[],
        );
        for (const p of unmatchedPicks) {
          const match = extras.find(
            (f) =>
              f.status === "finished" &&
              ((norm(f.homeTeam) === norm(p.home_team) && norm(f.awayTeam) === norm(p.away_team)) ||
                (norm(f.homeTeam) === norm(p.away_team) && norm(f.awayTeam) === norm(p.home_team))),
          );
          if (match) fixtures.push(match);
        }

        // Final fallback: look up actual score in match_scores_cache by
        // ai_predictions.match_id for picks still without a fixture (e.g.
        // synthetic WC entries not present in the football API at all).
        const stillUnmatched = unmatchedPicks.filter(
          (p) =>
            !fixtures.some(
              (f) =>
                (norm(f.homeTeam) === norm(p.home_team) && norm(f.awayTeam) === norm(p.away_team)) ||
                (norm(f.homeTeam) === norm(p.away_team) && norm(f.awayTeam) === norm(p.home_team)),
            ),
        );
        if (stillUnmatched.length > 0) {
          const ids = stillUnmatched.map((p) => p.match_id);
          const { data: cache } = await supabase
            .from("match_scores_cache")
            .select("match_id, home_score, away_score")
            .in("match_id", ids);
          for (const p of stillUnmatched) {
            const c = (cache ?? []).find((r) => r.match_id === p.match_id);
            // Only treat the cached score as a final result if the pick's
            // kickoff date is strictly before today (Europe/Belgrade) AND
            // enough time has passed since kickoff that the match must be
            // over (kickoff + 110 min). Without the time guard, a LIVE
            // match (e.g. Canada vs Qatar 1-0 at 22') whose kickoff date
            // is "yesterday" in Belgrade timezone would be rendered as
            // FT WIN using its live score from match_scores_cache.
            const isPastDate = !!p.match_date && p.match_date < today;
            const ko = p.match_date ? new Date(p.match_date).getTime() : NaN;
            const likelyEnded = isFinite(ko)
              ? Date.now() - ko >= 110 * 60_000
              : true;
            if (
              isPastDate &&
              likelyEnded &&
              c &&
              c.home_score !== null &&
              c.away_score !== null
            ) {
              fixtures.push({
                id: p.match_id,
                homeTeam: p.home_team,
                awayTeam: p.away_team,
                homeLogo: null,
                awayLogo: null,
                homeScore: c.home_score,
                awayScore: c.away_score,
                status: "finished",
                statusShort: "FT",
                minute: 90,
                startTime: p.match_date,
                venue: null,
                round: null,
              } as unknown as WCTodayFixture);
            }
          }
        }
      }

      return fixtures
        .filter((f) => f.homeScore !== null && f.awayScore !== null)
        .map((f): WCFinishedItem => {
          const found = findPick(f.homeTeam, f.awayTeam);
          const actualSide = side(f.homeScore!, 0, f.awayScore!) === "home"
            ? (f.homeScore! > f.awayScore! ? "home" : "draw")
            : f.awayScore! > f.homeScore! ? "away" : "draw";
          let pickedSide: "home" | "draw" | "away" = "draw";
          let marketHit = false;
          // As soon as API marks FT, evaluate the locked pick immediately.
          // The top AI Picks list can still keep the card for 3h, but the
          // Finished section must show WIN immediately or hide losses.
          const resultReady = true;
          if (found) {
            const { p, swapped } = found;
            const hw = swapped ? p.away_win : p.home_win;
            const aw = swapped ? p.home_win : p.away_win;
            pickedSide = side(hw, p.draw, aw);
            const totalGoals = f.homeScore! + f.awayScore!;
            const bttsActual = f.homeScore! >= 1 && f.awayScore! >= 1;
            const storedMarket = getStoredMarketPick(p.prediction, p.analysis, p.predicted_score, {
              home: hw,
              draw: p.draw,
              away: aw,
            });
            // Evaluation rule: WIN only when at least one displayed market
            // hits — Over/Under OR BTTS. Home/Away/Draw and exact score are
            // ignored for the Finished WIN badge.
            const goalsHit = storedMarket.goals
              ? (storedMarket.goals.dir === "over" && totalGoals > storedMarket.goals.line) ||
                (storedMarket.goals.dir === "under" && totalGoals < storedMarket.goals.line)
              : false;
            const bttsHit =
              storedMarket.btts === "yes"
                ? bttsActual
                : storedMarket.btts === "no"
                  ? !bttsActual
                  : false;
            if (storedMarket.goals || storedMarket.btts) {
              // Any displayed market hit wins; if both miss, it is not a WIN.
              marketHit = goalsHit || bttsHit;
              return {
                fixture: f,
                pick: p,
                pickedSide,
                actualSide,
                isWin: marketHit,
                resultReady,
              };
            }
          }
          return {
            fixture: f,
            pick: found?.p ?? null,
            pickedSide,
            actualSide,
            // WIN rule: a correct 1X2 (home/away/draw) pick is NOT enough on
            // its own. The prediction only counts as WIN when at least one
            // market — Over/Under or BTTS — hits.
            isWin: !!found && marketHit,
            resultReady,
          };
        });
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}