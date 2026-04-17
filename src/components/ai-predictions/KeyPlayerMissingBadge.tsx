import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, UserX } from "lucide-react";
import type { MissingPlayer } from "@/hooks/useAIPredictions";
import { cn } from "@/lib/utils";

interface KeyPlayerMissingBadgeProps {
  homeMissing?: MissingPlayer[] | null;
  awayMissing?: MissingPlayer[] | null;
  homeImpact?: number | null;
  awayImpact?: number | null;
  homeTeam: string;
  awayTeam: string;
  lineupConfirmed?: boolean | null;
  className?: string;
}

const ROLE_LABEL: Record<MissingPlayer["role"], string> = {
  scorer: "Top Scorer",
  assist: "Top Assist",
  gk: "Starting GK",
  key: "Key Player",
};

export function KeyPlayerMissingBadge({
  homeMissing,
  awayMissing,
  homeImpact,
  awayImpact,
  homeTeam,
  awayTeam,
  lineupConfirmed,
  className,
}: KeyPlayerMissingBadgeProps) {
  const [open, setOpen] = useState(false);

  // Only show "important" missing players (importance >= 15 means scorer/gk/assist)
  const homeKey = (homeMissing || []).filter((p) => p.importance >= 15);
  const awayKey = (awayMissing || []).filter((p) => p.importance >= 15);
  const totalKey = homeKey.length + awayKey.length;

  if (totalKey === 0) return null;

  // Decide severity color: high (50+ combined impact) → red, medium → amber
  const maxImpact = Math.max(homeImpact || 0, awayImpact || 0);
  const severity = maxImpact >= 50 ? "high" : maxImpact >= 25 ? "medium" : "low";

  const colorClass =
    severity === "high"
      ? "bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25"
      : severity === "medium"
        ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
        : "bg-orange-500/15 text-orange-300 border-orange-500/40 hover:bg-orange-500/25";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] md:text-[9px] font-semibold transition-colors cursor-pointer",
            colorClass,
            className,
          )}
        >
          <AlertTriangle className="w-2.5 h-2.5 md:w-3 md:h-3" />
          <span>
            {totalKey} Key {totalKey === 1 ? "Player" : "Players"} Out
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 bg-[#0a1628] border-[#1e3a5f]/60 text-white"
        align="end"
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-[#1e3a5f]/40">
          <UserX className="w-3.5 h-3.5 text-amber-400" />
          <h4 className="text-xs font-semibold">Missing Key Players</h4>
          {lineupConfirmed && (
            <Badge className="ml-auto bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[8px] px-1 py-0 rounded">
              Confirmed XI
            </Badge>
          )}
        </div>

        {homeKey.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-medium text-muted-foreground mb-1">
              {homeTeam}
            </p>
            <ul className="space-y-1">
              {homeKey.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-[10px]">
                  <span className="text-red-400 mt-0.5">●</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium">{p.name}</span>
                    <span className="text-muted-foreground ml-1">
                      — {ROLE_LABEL[p.role]}
                    </span>
                    {p.reason && (
                      <span className="block text-[9px] text-muted-foreground/70 mt-0.5">
                        {p.reason}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {awayKey.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">
              {awayTeam}
            </p>
            <ul className="space-y-1">
              {awayKey.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-[10px]">
                  <span className="text-red-400 mt-0.5">●</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium">{p.name}</span>
                    <span className="text-muted-foreground ml-1">
                      — {ROLE_LABEL[p.role]}
                    </span>
                    {p.reason && (
                      <span className="block text-[9px] text-muted-foreground/70 mt-0.5">
                        {p.reason}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-2 pt-2 border-t border-[#1e3a5f]/40 text-[9px] text-muted-foreground/70">
          Confidence has been adjusted based on missing players.
        </p>
      </PopoverContent>
    </Popover>
  );
}
