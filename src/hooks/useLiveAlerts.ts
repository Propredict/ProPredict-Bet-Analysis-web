import { useEffect, useRef } from "react";
import { Match } from "@/hooks/useLiveScores";
import { toast } from "@/hooks/use-toast";

export function useLiveAlerts(matches: Match[]) {
  const prevRef = useRef<Map<string, string>>(new Map());
  const initialized = useRef(false);

  useEffect(() => {
    console.log("🟢 useLiveAlerts EFFECT", matches.length);

    if (!matches.length) return;

    // INIT
    if (!initialized.current) {
      console.log("🟡 Initializing scores");
      matches.forEach((m) => {
        prevRef.current.set(m.id, `${m.homeScore ?? 0}-${m.awayScore ?? 0}`);
      });
      initialized.current = true;
      return;
    }

    // CHECK
    matches.forEach((m) => {
      if (m.status !== "live" && m.status !== "halftime") return;

      const prev = prevRef.current.get(m.id);
      const curr = `${m.homeScore ?? 0}-${m.awayScore ?? 0}`;

      console.log("⚽ CHECK", m.homeTeam, prev, "→", curr);

      if (prev && prev !== curr) {
        console.log("🔥 GOAL DETECTED", m.homeTeam, m.awayTeam);

        toast({
          title: "⚽ GOAL!",
          description: `${m.homeTeam} ${curr} ${m.awayTeam}`,
        });
      }

      prevRef.current.set(m.id, curr);
    });
  }, [matches]);
}
