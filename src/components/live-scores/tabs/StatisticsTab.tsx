import { StatItem } from "@/hooks/useMatchDetails";
import { Progress } from "@/components/ui/progress";

interface StatisticsTabProps {
  statistics: StatItem[];
  loading: boolean;
  homeTeam?: string;
  awayTeam?: string;
}

export function StatisticsTab({ statistics, loading, homeTeam, awayTeam }: StatisticsTabProps) {
  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Loading statistics…
      </div>
    );
  }

  if (!statistics || statistics.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Statistics not available for this match
      </div>
    );
  }

  const parseValue = (val: string | number | null): number => {
    if (val === null || val === undefined) return 0;
    const str = String(val).replace("%", "");
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  return (
    <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
      {/* Team headers */}
      <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
        <span>{homeTeam || "Home"}</span>
        <span>{awayTeam || "Away"}</span>
      </div>

      {statistics.map((stat, idx) => {
        const homeVal = parseValue(stat.home);
        const awayVal = parseValue(stat.away);
        const total = homeVal + awayVal || 1;
        const homePercent = (homeVal / total) * 100;

        const isPercentage = String(stat.home).includes("%") || String(stat.away).includes("%");

        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{stat.home ?? "-"}</span>
              <span className="text-xs text-muted-foreground">{stat.type}</span>
              <span className="font-medium">{stat.away ?? "-"}</span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-primary rounded-l-full transition-all"
                style={{ width: `${homePercent}%` }}
              />
              <div
                className="absolute right-0 top-0 h-full bg-accent rounded-r-full transition-all"
                style={{ width: `${100 - homePercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
