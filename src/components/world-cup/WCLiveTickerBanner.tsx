import { Radio } from "lucide-react";
import { useWCTodayFixtures } from "@/hooks/useWCTodayFixtures";
import { teamFlag } from "@/lib/wcTeamFlags";

interface Props {
  onClick?: () => void;
}

/**
 * Sticky LIVE NOW banner shown above the WC2026 portal tabs.
 * Only renders when at least one WC match is currently live (or at halftime).
 * Clicking jumps the user to the Matches tab.
 */
export default function WCLiveTickerBanner({ onClick }: Props) {
  const { data } = useWCTodayFixtures();
  const fixtures = data?.fixtures ?? [];
  const live = fixtures.filter((f) => f.status === "live" || f.status === "halftime");

  if (live.length === 0) return null;

  return (
    <button
      onClick={onClick}
      className="w-full group relative overflow-hidden border-y border-destructive/40 bg-gradient-to-r from-destructive/15 via-destructive/5 to-destructive/15 hover:from-destructive/25 hover:via-destructive/10 hover:to-destructive/25 transition-colors"
      aria-label="View live World Cup matches"
    >
      <div className="flex items-center gap-3 px-3 py-1.5 overflow-x-auto scrollbar-thin">
        <div className="shrink-0 flex items-center gap-1.5 pr-2 border-r border-destructive/30">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">
            Live Now
          </span>
        </div>

        <div className="flex items-center gap-4 min-w-max">
          {live.map((f) => {
            const minuteLabel = f.status === "halftime" ? "HT" : `${f.minute ?? 0}'`;
            return (
              <div key={f.id} className="flex items-center gap-2 text-[11px]">
                <span className="font-medium text-foreground/90 flex items-center gap-1">
                  <span aria-hidden>{teamFlag(f.homeTeam)}</span>
                  {f.homeTeam}
                </span>
                <span className="font-bold tabular-nums text-destructive">
                  {f.homeScore ?? 0} – {f.awayScore ?? 0}
                </span>
                <span className="font-medium text-foreground/90 flex items-center gap-1">
                  {f.awayTeam}
                  <span aria-hidden>{teamFlag(f.awayTeam)}</span>
                </span>
                <span className="text-[9px] font-semibold text-destructive/80 px-1.5 py-0.5 rounded bg-destructive/10 border border-destructive/30">
                  {minuteLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div className="ml-auto shrink-0 hidden sm:flex items-center gap-1 text-[10px] text-destructive/80 group-hover:text-destructive">
          <Radio className="h-3 w-3" />
          View
        </div>
      </div>
    </button>
  );
}