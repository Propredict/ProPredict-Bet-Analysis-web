import { useEffect, useRef } from "react";
import { Match } from "@/hooks/useLiveScores";
import { toast } from "@/hooks/use-toast";

interface MatchSnapshot {
  homeScore: number;
  awayScore: number;
  redCards: number;
}

export function useLiveAlerts(matches: Match[]) {
  const prevSnapshots = useRef<Map<string, MatchSnapshot>>(new Map());
  const initialized = useRef(false);

  useEffect(() => {
    if (!matches || matches.length === 0) return;

    // INIT – store initial snapshots without triggering alerts
    if (!initialized.current) {
      matches.forEach((m) => {
        prevSnapshots.current.set(m.id, {
          homeScore: m.homeScore ?? 0,
          awayScore: m.awayScore ?? 0,
          redCards: countRedCards(m),
        });
      });
      initialized.current = true;
      return;
    }

    // CHECK – compare current vs previous for live matches only
    matches.forEach((m) => {
      if (m.status !== "live" && m.status !== "halftime") return;

      const prev = prevSnapshots.current.get(m.id);
      const currHomeScore = m.homeScore ?? 0;
      const currAwayScore = m.awayScore ?? 0;
      const currRedCards = countRedCards(m);

      if (prev) {
        // ⚽ GOAL DETECTION
        if (prev.homeScore !== currHomeScore || prev.awayScore !== currAwayScore) {
          const scoringTeam = prev.homeScore !== currHomeScore ? m.homeTeam : m.awayTeam;
          toast({
            title: "⚽ GOAL!",
            description: `${scoringTeam} scores! ${m.homeTeam} ${currHomeScore} – ${currAwayScore} ${m.awayTeam}`,
            duration: 4000,
          });
        }

        // 🟥 RED CARD DETECTION
        if (currRedCards > prev.redCards) {
          toast({
            title: "🟥 Red Card!",
            description: `${m.homeTeam} vs ${m.awayTeam}${m.minute ? ` (${m.minute}')` : ""}`,
            duration: 4000,
          });
        }
      }

      // Update snapshot
      prevSnapshots.current.set(m.id, {
        homeScore: currHomeScore,
        awayScore: currAwayScore,
        redCards: currRedCards,
      });
    });
  }, [matches]);
}

// Helper to count red cards from match (if events exist)
function countRedCards(match: Match): number {
  // If match has events array, count red cards
  const events = (match as any).events;
  if (Array.isArray(events)) {
    return events.filter((e: any) => e.type === "redcard" || e.type === "red_card").length;
  }
  return 0;
}
