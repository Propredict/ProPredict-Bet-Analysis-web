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

      const [fxRes, predRes] = await Promise.all([
        supabase.functions.invoke("get-wc-today", { body: { date: yesterday } }),
        supabase
          .from("ai_predictions")
          .select(
            "match_id, home_team, away_team, match_date, home_win, draw, away_win, confidence, predicted_score, prediction, analysis",
          )
          .ilike("league", "%world cup%")
          .eq("match_date", yesterday)
          .limit(64),
      ]);

      const fixtures: WCTodayFixture[] = (fxRes.data?.fixtures ?? []).filter(
        (f: WCTodayFixture) => f.status === "finished",
      );
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

      return fixtures
        .filter((f) => f.homeScore !== null && f.awayScore !== null)
        .map((f): WCFinishedItem => {
          const found = findPick(f.homeTeam, f.awayTeam);
          const actualSide = side(f.homeScore!, 0, f.awayScore!) === "home"
            ? (f.homeScore! > f.awayScore! ? "home" : "draw")
            : f.awayScore! > f.homeScore! ? "away" : "draw";
          let pickedSide: "home" | "draw" | "away" = "draw";
          if (found) {
            const { p, swapped } = found;
            const hw = swapped ? p.away_win : p.home_win;
            const aw = swapped ? p.home_win : p.away_win;
            pickedSide = side(hw, p.draw, aw);
          }
          return {
            fixture: f,
            pick: found?.p ?? null,
            pickedSide,
            actualSide,
            isWin: !!found && pickedSide === actualSide,
          };
        });
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}