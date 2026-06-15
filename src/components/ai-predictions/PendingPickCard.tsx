import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Lock, Clock } from "lucide-react";

interface Props {
  league: string | null;
  homeTeam: string;
  awayTeam: string;
  matchTimestamp: string | null;
}

/**
 * Pending Pick Card — shown for matches that don't yet have an AI prediction.
 * Predictions are generated ~3h before kickoff so that final lineups, odds,
 * and form data deliver maximum accuracy. Until then we show this placeholder
 * with a live countdown — and never expose any number that could later change.
 */
export function PendingPickCard({ league, homeTeam, awayTeam, matchTimestamp }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const kickoff = matchTimestamp ? new Date(matchTimestamp).getTime() : null;
  const unlockAt = kickoff ? kickoff - 3 * 60 * 60 * 1000 : null;

  const unlockLabel = unlockAt
    ? new Date(unlockAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    : null;

  let countdown: string | null = null;
  if (unlockAt) {
    const diff = unlockAt - now;
    if (diff > 0) {
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      countdown = h > 0 ? `Ready in ${h}h ${m}m` : `Ready in ${m}m`;
    } else {
      countdown = "Generating now…";
    }
  }

  const kickoffLabel = kickoff
    ? new Date(kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    : null;

  return (
    <Card className="bg-[#0a1628] border-[#1e3a5f]/40 overflow-hidden rounded">
      <CardContent className="p-0">
        <div className="px-2 md:px-3 py-1.5 md:py-2 flex items-center justify-between">
          <div className="flex items-center gap-1 md:gap-1.5 text-[9px] md:text-[10px] text-muted-foreground">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px] md:text-[9px] px-1 md:px-1.5 py-0.5 rounded">
              <Bot className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5" />
              AI
            </Badge>
            <span className="truncate max-w-[120px] md:max-w-none">{league || "League"}</span>
            {kickoffLabel && (
              <>
                <span>•</span>
                <span className="whitespace-nowrap">{kickoffLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm md:text-base font-semibold text-foreground truncate">
              {homeTeam} <span className="text-muted-foreground font-normal">vs</span> {awayTeam}
            </div>
          </div>
        </div>

        <div className="mx-3 mb-3 rounded-md border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-transparent to-primary/[0.04] px-3 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] md:text-xs font-semibold text-foreground">
              AI Pick Unlocks {unlockLabel ? `at ${unlockLabel}` : "soon"}
            </span>
          </div>
          <p className="text-[10px] md:text-[11px] text-muted-foreground leading-snug">
            Locked until ~3h before kickoff. Our model waits for final lineups
            and latest odds so the pick is the most accurate it can be — and
            never changes once published.
          </p>
          {countdown && (
            <div className="mt-2 flex items-center gap-1 text-[10px] md:text-[11px] text-primary/90">
              <Clock className="w-3 h-3" />
              <span>{countdown}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Detect placeholder rows that haven't been enriched yet. */
export function isPendingPlaceholder(p: {
  analysis?: string | null;
  prediction?: string | null;
  confidence?: number | null;
}): boolean {
  const a = (p.analysis ?? "").toString();
  return /^Pending regeneration/i.test(a);
}