import { useEffect, useRef } from "react";
import { Match } from "@/hooks/useLiveScores";
import { toast } from "sonner";

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
          
          toast.custom(
            () => (
              <div className="flex items-start gap-3 bg-[#1a0a0a] border border-red-500/50 rounded-lg p-4 shadow-2xl shadow-red-500/20 animate-scale-in min-w-[300px]">
                <div className="relative flex-shrink-0">
                  <span className="inline-block h-4 w-4 rounded-full bg-red-500 animate-ping absolute" />
                  <span className="inline-block h-4 w-4 rounded-full bg-red-500 relative" />
                </div>
                <div className="flex-1">
                  <p className="text-red-400 font-black text-sm uppercase tracking-wider mb-1">
                    ⚽ GOAL
                  </p>
                  <p className="text-white font-semibold text-base">
                    {scoringTeam} scores!
                  </p>
                  <p className="text-white/80 text-sm mt-1">
                    {m.homeTeam} <span className="font-bold text-red-400">{currHomeScore}</span> – <span className="font-bold text-red-400">{currAwayScore}</span> {m.awayTeam}
                  </p>
                  {m.minute && (
                    <p className="text-white/50 text-xs mt-1">{m.minute}'</p>
                  )}
                </div>
              </div>
            ),
            {
              duration: 5000,
              position: "top-right",
            }
          );
        }

        // 🟥 RED CARD DETECTION
        if (currRedCards > prev.redCards) {
          toast.custom(
            () => (
              <div className="flex items-start gap-3 bg-[#1a0505] border border-red-600/60 rounded-lg p-4 shadow-2xl shadow-red-600/20 animate-scale-in min-w-[280px]">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🟥</span>
                </div>
                <div className="flex-1">
                  <p className="text-red-500 font-black text-sm uppercase tracking-wider mb-1">
                    RED CARD
                  </p>
                  <p className="text-white/90 text-sm">
                    {m.homeTeam} vs {m.awayTeam}
                  </p>
                  {m.minute && (
                    <p className="text-white/50 text-xs mt-1">{m.minute}'</p>
                  )}
                </div>
              </div>
            ),
            {
              duration: 5000,
              position: "top-right",
            }
          );
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
  const events = (match as any).events;
  if (Array.isArray(events)) {
    return events.filter((e: any) => e.type === "redcard" || e.type === "red_card").length;
  }
  return 0;
}
