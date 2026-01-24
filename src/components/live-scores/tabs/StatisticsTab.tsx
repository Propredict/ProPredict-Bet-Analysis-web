import { StatItem, MatchEvent } from "@/hooks/useMatchDetails";
import { cn } from "@/lib/utils";
import { Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  // Get event icon
  const getEventIcon = (event: MatchEvent) => {
    if (event.type === "Goal") {
      return <span className="text-base">⚽</span>;
    }
    if (event.type === "Card" && event.detail === "Yellow Card") {
      return <span className="w-3 h-4 bg-amber-400 rounded-sm inline-block" />;
    }
    if (event.type === "Card" && event.detail === "Red Card") {
      return <span className="w-3 h-4 bg-destructive rounded-sm inline-block" />;
    }
    if (event.type === "subst") {
      return <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />;
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

  return (
    <div className="max-h-[450px] overflow-y-auto">
      {/* Match Events Section */}
      {hasEvents && (
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Match Events
            </div>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1">
              <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
              Live
            </Badge>
          </div>
          <div className="space-y-2">
            {events.slice(0, 6).map((event, idx) => {
              const isHome = event.team?.name === homeTeam;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-3 text-sm py-1.5",
                    !isHome && "flex-row-reverse"
                  )}
                >
                  <span className="text-xs text-muted-foreground w-8 shrink-0">
                    {event.time.elapsed}'
                  </span>
                  <span className="flex items-center gap-2">
                    {getEventIcon(event)}
                    <span className="font-medium text-foreground">
                      {event.player?.name}
                    </span>
                    {event.assist?.name && (
                      <span className="text-muted-foreground text-xs">
                        ({event.assist.name})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
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
                  <span className="text-xs text-muted-foreground text-center flex-1">
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
