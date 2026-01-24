import { StatItem, MatchEvent } from "@/hooks/useMatchDetails";
import { cn } from "@/lib/utils";

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
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-4 w-8 bg-muted rounded" />
            </div>
            <div className="h-2 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!statistics || statistics.length === 0) {
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

  const parseValue = (val: string | number | null): number => {
    if (val === null || val === undefined) return 0;
    const str = String(val).replace("%", "");
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const formatValue = (val: string | number | null): string => {
    if (val === null || val === undefined) return "—";
    return String(val);
  };

  // Filter and show key stats first
  const priorityStats = [
    "Shots on Target", "Shots off Target", "Total Shots", "Blocked Shots",
    "Ball Possession", "Corner Kicks", "Fouls", "Offsides",
    "Yellow Cards", "Red Cards", "Passes accurate", "Passes %"
  ];

  const sortedStats = [...statistics].sort((a, b) => {
    const aIdx = priorityStats.findIndex(p => a.type?.toLowerCase().includes(p.toLowerCase()));
    const bIdx = priorityStats.findIndex(p => b.type?.toLowerCase().includes(p.toLowerCase()));
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <div className="max-h-[400px] overflow-y-auto">
      {/* Match Events (if any) */}
      {events.length > 0 && (
        <div className="px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Match Events
          </div>
          <div className="space-y-2">
            {events.slice(0, 5).map((event, idx) => {
              const isHome = event.team?.name === homeTeam;
              const isGoal = event.type === "Goal";
              const isCard = event.type === "Card";

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    isHome ? "justify-start" : "justify-end flex-row-reverse"
                  )}
                >
                  <span className="text-muted-foreground w-8">{event.time.elapsed}'</span>
                  <span className="flex items-center gap-1.5">
                    {isGoal && <span className="text-emerald-400">⚽</span>}
                    {isCard && event.detail === "Yellow Card" && <span className="w-2.5 h-3.5 bg-yellow-400 rounded-sm" />}
                    {isCard && event.detail === "Red Card" && <span className="w-2.5 h-3.5 bg-red-500 rounded-sm" />}
                    <span className={cn(isGoal && "font-medium text-foreground")}>
                      {event.player?.name}
                    </span>
                    {event.assist?.name && (
                      <span className="text-muted-foreground">({event.assist.name})</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="p-4 space-y-4">
        {sortedStats.map((stat, idx) => {
          const homeVal = parseValue(stat.home);
          const awayVal = parseValue(stat.away);
          const total = homeVal + awayVal || 1;
          const homePercent = (homeVal / total) * 100;
          const awayPercent = (awayVal / total) * 100;

          return (
            <div key={idx} className="space-y-1.5">
              {/* Values and Label */}
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-foreground min-w-[40px]">
                  {formatValue(stat.home)}
                </span>
                <span className="text-xs text-muted-foreground text-center flex-1 px-2">
                  {stat.type}
                </span>
                <span className="font-semibold text-foreground min-w-[40px] text-right">
                  {formatValue(stat.away)}
                </span>
              </div>

              {/* Progress Bars */}
              <div className="flex gap-1 h-2">
                {/* Home bar (grows from right to left) */}
                <div className="flex-1 flex justify-end">
                  <div
                    className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
                    style={{ width: `${homePercent}%` }}
                  />
                </div>
                {/* Away bar (grows from left to right) */}
                <div className="flex-1">
                  <div
                    className="h-full bg-orange-500 rounded-r-full transition-all duration-500"
                    style={{ width: `${awayPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
