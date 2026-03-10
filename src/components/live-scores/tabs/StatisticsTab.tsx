import { StatItem, MatchEvent } from "@/hooks/useMatchDetails";
import { cn } from "@/lib/utils";
import { Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClickablePlayer } from "@/components/ClickablePlayer";

interface StatisticsTabProps {
  statistics: StatItem[];
  events?: MatchEvent[];
  loading: boolean;
  homeTeam?: string;
  awayTeam?: string;
}

export function StatisticsTab({ statistics, events = [], loading, homeTeam, awayTeam }: StatisticsTabProps) {
  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex justify-between items-center mb-2">
              <div className="h-4 w-8 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-4 w-8 bg-muted rounded" />
            </div>
            <div className="h-2 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  // Helper functions
  const parseValue = (val: string | number | null): number => {
    if (val === null || val === undefined) return 0;
    const str = String(val).replace("%", "");
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const formatValue = (val: string | number | null): string => {
    if (val === null || val === undefined) return "0";
    return String(val);
  };

  // Priority order for stats display
  const priorityStats = [
    "Shots on Goal", "Shots on Target",
    "Shots off Goal", "Shots off Target",
    "Total Shots", "Shots",
    "Blocked Shots",
    "Ball Possession", "Possession",
    "Corner Kicks", "Corners",
    "Fouls",
    "Offsides",
    "Yellow Cards",
    "Red Cards",
    "Goalkeeper Saves",
    "Total passes", "Passes",
    "Passes accurate",
    "Passes %"
  ];

  const sortedStats = [...statistics].sort((a, b) => {
    const aIdx = priorityStats.findIndex(p => 
      a.type?.toLowerCase() === p.toLowerCase() ||
      a.type?.toLowerCase().includes(p.toLowerCase())
    );
    const bIdx = priorityStats.findIndex(p => 
      b.type?.toLowerCase() === p.toLowerCase() ||
      b.type?.toLowerCase().includes(p.toLowerCase())
    );
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  // Get event icon with size variants
  const getEventIcon = (event: MatchEvent, size: "sm" | "md" = "sm") => {
    const iconSize = size === "md" ? "text-lg" : "text-base";
    if (event.type === "Goal") {
      return <span className={iconSize}>⚽</span>;
    }
    if (event.type === "Card" && event.detail === "Yellow Card") {
      return <span className={cn("rounded-[2px] inline-block", size === "md" ? "w-3.5 h-[18px]" : "w-3 h-4", "bg-amber-400")} />;
    }
    if (event.type === "Card" && event.detail === "Red Card") {
      return <span className={cn("rounded-[2px] inline-block", size === "md" ? "w-3.5 h-[18px]" : "w-3 h-4", "bg-destructive")} />;
    }
    if (event.type === "subst") {
      return <RefreshCw className={cn(size === "md" ? "w-4 h-4" : "w-3.5 h-3.5", "text-primary")} />;
    }
    return null;
  };

  const hasStats = statistics && statistics.length > 0;
  const hasEvents = events && events.length > 0;

  if (!hasStats && !hasEvents) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">Statistics not available for this match</p>
      </div>
    );
  }

  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => a.time.elapsed - b.time.elapsed);

  return (
    <div className="max-h-[450px] overflow-y-auto">
      {/* Match Events Timeline */}
      {hasEvents && (
        <div className="px-4 pt-4 pb-3 border-b border-border/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Match Events
            </div>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1">
              <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
              Live
            </Badge>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Central timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/50 -translate-x-1/2" />

            <div className="space-y-0">
              {sortedEvents.slice(0, 12).map((event, idx) => {
                const isHome = event.team?.name === homeTeam;

                return (
                  <div key={idx} className="relative flex items-center min-h-[44px]">
                    {/* Home side (left) */}
                    <div className={cn("flex-1 flex items-center gap-2 pr-3", isHome ? "justify-end" : "justify-end opacity-0 pointer-events-none")}>
                      {isHome && (
                        <>
                          {event.assist?.name && event.assist?.id ? (
                            <ClickablePlayer playerId={event.assist.id}>
                              <span className="text-[10px] text-muted-foreground hover:text-primary transition-colors hidden sm:inline">
                                {event.assist.name}
                              </span>
                            </ClickablePlayer>
                          ) : event.assist?.name ? (
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">{event.assist.name}</span>
                          ) : null}
                          <ClickablePlayer playerId={event.player?.id}>
                            <span className="text-xs font-medium text-foreground hover:text-primary transition-colors truncate max-w-[120px] sm:max-w-[160px]">
                              {event.player?.name}
                            </span>
                          </ClickablePlayer>
                          {getEventIcon(event, "md")}
                        </>
                      )}
                    </div>

                    {/* Center minute marker */}
                    <div className="relative z-10 flex items-center justify-center w-9 h-9 shrink-0">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2",
                        event.type === "Goal"
                          ? "bg-primary/20 border-primary text-primary"
                          : event.type === "Card"
                            ? event.detail === "Red Card"
                              ? "bg-destructive/20 border-destructive text-destructive"
                              : "bg-amber-400/20 border-amber-400 text-amber-400"
                            : "bg-muted/50 border-border text-muted-foreground"
                      )}>
                        {event.time.elapsed}'
                      </div>
                    </div>

                    {/* Away side (right) */}
                    <div className={cn("flex-1 flex items-center gap-2 pl-3", !isHome ? "justify-start" : "justify-start opacity-0 pointer-events-none")}>
                      {!isHome && (
                        <>
                          {getEventIcon(event, "md")}
                          <ClickablePlayer playerId={event.player?.id}>
                            <span className="text-xs font-medium text-foreground hover:text-primary transition-colors truncate max-w-[120px] sm:max-w-[160px]">
                              {event.player?.name}
                            </span>
                          </ClickablePlayer>
                          {event.assist?.name && event.assist?.id ? (
                            <ClickablePlayer playerId={event.assist.id}>
                              <span className="text-[10px] text-muted-foreground hover:text-primary transition-colors hidden sm:inline">
                                {event.assist.name}
                              </span>
                            </ClickablePlayer>
                          ) : event.assist?.name ? (
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">{event.assist.name}</span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Section */}
      {hasStats && (
        <div className="p-4 space-y-4">
          {sortedStats.map((stat, idx) => {
            const homeVal = parseValue(stat.home);
            const awayVal = parseValue(stat.away);
            const maxVal = Math.max(homeVal, awayVal) || 1;
            const homePercent = (homeVal / maxVal) * 100;
            const awayPercent = (awayVal / maxVal) * 100;

            return (
              <div key={idx} className="space-y-1.5">
                {/* Values and Label Row */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground w-12">
                    {formatValue(stat.home)}
                  </span>
                  <span className="text-xs text-muted-foreground text-center flex-1 uppercase tracking-wide">
                    {stat.type}
                  </span>
                  <span className="text-sm font-bold text-foreground w-12 text-right">
                    {formatValue(stat.away)}
                  </span>
                </div>

                {/* Dual Progress Bars */}
                <div className="flex gap-1">
                  {/* Home bar - grows from right to left */}
                  <div className="flex-1 flex justify-end h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${homePercent}%` }}
                    />
                  </div>
                  {/* Away bar - grows from left to right */}
                  <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${awayPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}