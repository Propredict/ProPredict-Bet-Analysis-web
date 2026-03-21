import { TrendingUp, Target, Activity, Zap } from "lucide-react";
import { useGlobalWinRate } from "@/hooks/useGlobalWinRate";
import { useAIPredictionStats } from "@/hooks/useAIPredictionStats";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ icon: Icon, label, value, suffix = "", accent = false }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-background/60 backdrop-blur border border-border/50">
      <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-lg md:text-xl font-bold text-foreground tabular-nums">
        {value}{suffix}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
    </div>
  );
}

export function DashboardHero() {
  const { data: winRate, isLoading: winLoading } = useGlobalWinRate();
  const { stats: aiStats, loading: aiLoading } = useAIPredictionStats();
  const { predictions, loading: predLoading } = useAIPredictions("today");

  const isLoading = winLoading || aiLoading || predLoading;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-primary/25 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative p-5 md:p-6 space-y-4">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Dashboard Overview</h2>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={TrendingUp}
            label="Win Rate"
            value={winRate?.accuracy ?? 0}
            suffix="%"
            accent
          />
          <StatCard
            icon={Activity}
            label="Today's Matches"
            value={predictions.length}
          />
          <StatCard
            icon={Target}
            label="AI Accuracy"
            value={aiStats.accuracy}
            suffix="%"
            accent
          />
          <StatCard
            icon={Zap}
            label="Won / Lost"
            value={`${aiStats.won}/${aiStats.lost}`}
          />
        </div>
      </div>
    </div>
  );
}
