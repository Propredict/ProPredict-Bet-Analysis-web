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
  /** Result evaluation only "locks in" 3h after match ended.
   *  Until then the card shows the original prediction with a
   *  "Result pending" badge — never a WIN/LOSS yet. */
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

      const [fxYesterday, fxToday, predRes] = await Promise.all([
        supabase.functions.invoke("get-wc-today", { body: { date: yesterday } }),
        supabase.functions.invoke("get-wc-today", { body: { date: today } }),
        supabase
          .from("ai_predictions")
          .select(
            "match_id, home_team, away_team, match_date, home_win, draw, away_win, confidence, predicted_score, prediction, analysis",
          )
          .ilike("league", "%world cup%")
          .in("match_date", [yesterday, today])
          .limit(64),
      ]);

      const allFx: WCTodayFixture[] = [
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
      const fixtures: WCTodayFixture[] = allFx.filter(
        (f: WCTodayFixture) => f.status === "finished",
      );
      const unmatchedPicks = picks.filter(
        (p) =>
          !fixtures.some(
            (f) =>
              (norm(f.homeTeam) === norm(p.home_team) && norm(f.awayTeam) === norm(p.away_team)) ||
              (norm(f.homeTeam) === norm(p.away_team) && norm(f.awayTeam) === norm(p.home_team)),
          ),
      );
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
            if (c && c.home_score !== null && c.away_score !== null) {
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
          if (found) {
            const { p, swapped } = found;
            const hw = swapped ? p.away_win : p.home_win;
            const aw = swapped ? p.home_win : p.away_win;
            pickedSide = side(hw, p.draw, aw);
            const totalGoals = f.homeScore! + f.awayScore!;
            const bttsActual = f.homeScore! >= 1 && f.awayScore! >= 1;
            const analysis = (p.analysis || "").toLowerCase();
            const pred = (p.prediction || "").toLowerCase();
            // Goals market hit (Over/Under 1.5/2.5/3.5)
            const goalsMatch = analysis.match(/(over|under)\s*(1\.?5|2\.?5|3\.?5)/);
            if (goalsMatch) {
              const dir = goalsMatch[1];
              const line = parseFloat(goalsMatch[2].replace(/(\d)(\d)/, "$1.$2"));
              if (dir === "over" && totalGoals > line) marketHit = true;
              if (dir === "under" && totalGoals < line) marketHit = true;
            }
            // BTTS market hit
            if (/btts[^.]*\byes\b|both teams to score[^.]*yes/.test(analysis)) {
              if (bttsActual) marketHit = true;
            } else if (/btts[^.]*\bno\b|both teams to score[^.]*no/.test(analysis)) {
              if (!bttsActual) marketHit = true;
            }
            // Exact predicted score hit
            if (p.predicted_score) {
              const m = p.predicted_score.match(/(\d+)\s*[-–:]\s*(\d+)/);
              if (m) {
                const ph = parseInt(m[1], 10);
                const pa = parseInt(m[2], 10);
                const ah = swapped ? f.awayScore! : f.homeScore!;
                const aa = swapped ? f.homeScore! : f.awayScore!;
                if (ph === ah && pa === aa) marketHit = true;
              }
            }
            // Generic prediction string (over25, btts_yes, etc.)
            if (/over.?2\.?5/.test(pred) && totalGoals >= 3) marketHit = true;
            if (/under.?2\.?5/.test(pred) && totalGoals <= 2) marketHit = true;
            if (/btts.?yes|gg/.test(pred) && bttsActual) marketHit = true;
            if (/btts.?no|ng/.test(pred) && !bttsActual) marketHit = true;
          }
          return {
            fixture: f,
            pick: found?.p ?? null,
            pickedSide,
            actualSide,
            isWin: !!found && (pickedSide === actualSide || marketHit),
          };
        })
        .filter((item) => item.isWin);
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}