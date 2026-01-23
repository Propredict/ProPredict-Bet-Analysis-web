import { useEffect, useRef } from "react";
import { Match } from "@/hooks/useLiveScores";
import { toast } from "@/hooks/use-toast";

export function useLiveAlerts(matches: Match[]) {
  const prevScores = useRef<Map<string, string>>(new Map());
  const initialized = useRef(false);

  useEffect(() => {
    if (!matches || matches.length === 0) return;

    // INIT – zapamti početne score-ove
    if (!initialized.current) {
      matches.forEach((m) => {
        prevScores.current.set(m.id, `${m.homeScore ?? 0}-${m.awayScore ?? 0}`);
      });
      initialized.current = true;
      return;
    }

    // CHECK
    matches.forEach((m) => {
      if (m.status !== "live" && m.status !== "halftime") return;

      const prev = prevScores.current.get(m.id);
      const curr = `${m.homeScore ?? 0}-${m.awayScore ?? 0}`;

      if (prev && prev !== curr) {
        toast({
          title: "⚽ GOAL!",
          description: `${m.homeTeam} ${curr} ${m.awayTeam}`,
        });
      }

      prevScores.current.set(m.id, curr);
    });
  }, [matches]);
}
