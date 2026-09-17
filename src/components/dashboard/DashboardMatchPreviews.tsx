import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ChevronRight, Sparkles, Trophy, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { cn } from "@/lib/utils";
import { formatMatchTime } from "@/utils/formatMatchTime";

const QUALITY_LEAGUES: Record<string, number> = {
  "Premier League": 1, "Championship": 2, "La Liga": 3, "Bundesliga": 4,
  "Serie A": 5, "Ligue 1": 6, "Eredivisie": 7, "Primeira Liga": 8,
  "Serie B": 9, "2. Bundesliga": 10, "Segunda División": 11, "Ligue 2": 12,
};

/* Mini decorative bar chart (image-2 style header cards) */
function MiniBarChart() {
  const bars = [30, 46, 60, 40, 70, 90, 54];
  return (
    <div className="flex h-12 items-end gap-1.5" aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-3 rounded-t-md bg-primary/15"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

/* Big header stat card — "TOP 30 AI PICKS" (image-2 top card) */
function HeaderStatCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border-2 border-primary/25 bg-card p-3 text-left shadow-md transition-all hover:border-primary/50 hover:shadow-lg sm:gap-4 sm:p-4"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-14 sm:w-14">
        <Trophy className="h-6 w-6 sm:h-7 sm:w-7" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-black uppercase tracking-tight text-sidebar sm:text-xl">
          Top 30 AI Picks
        </h3>
        <p className="truncate text-[11px] text-muted-foreground sm:text-sm">
          Best AI picks with highest confidence
        </p>
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary sm:text-[11px]">
          <Star className="h-3 w-3 fill-current" /> Top rated matches
        </span>
      </div>
      <div className="hidden shrink-0 lg:block">
        <MiniBarChart />
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5 sm:h-9 sm:w-9">
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

/* Confidence bar with % (image-2 rows) */
function ConfidenceBar({ value, blurred }: { value: number; blurred: boolean }) {
  return (
    <div className="hidden w-28 shrink-0 items-center gap-2 sm:flex">
      <div
        className={cn(
          "h-1.5 flex-1 overflow-hidden rounded-full bg-muted/30",
          blurred && "blur-[3px] select-none",
        )}
      >
        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${value}%` }} />
      </div>
      <span
        className={cn(
          "text-xs font-bold tabular-nums text-foreground",
          blurred && "blur-[3px] select-none",
        )}
      >
        {value}%
      </span>
    </div>
  );
}

export function DashboardMatchPreviews() {
  const navigate = useNavigate();
  const { predictions, loading } = useAIPredictions("today");
  const { plan } = useUserPlan();
  const isFree = plan === "free";

  const topMatches = useMemo(() => {
    if (!predictions.length) return [];
    return [...predictions]
      .filter(p => (p.confidence ?? 0) >= 75)
      .filter(p => !(p.confidence === 50 && (p.analysis || "").toLowerCase().includes("pending")))
      .sort((a, b) => {
        const pa = QUALITY_LEAGUES[a.league || ""] ?? 99;
        const pb = QUALITY_LEAGUES[b.league || ""] ?? 99;
        if (pa !== pb) return pa - pb;
        return (b.confidence ?? 0) - (a.confidence ?? 0);
      })
      .slice(0, 4);
  }, [predictions]);

  if (loading || topMatches.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Image-2 style header stat card */}
      <HeaderStatCard onClick={() => navigate("/match-previews")} />

      <div className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-md">
        {/* Card header */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-black text-sidebar sm:text-lg">Top 30 AI Picks</h3>
              <p className="truncate text-[11px] text-muted-foreground">
                Highest confidence picks · Updated daily
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/match-previews")}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
          >
            View All <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Rows */}
        {topMatches.map((match) => {
          const hw = match.home_win ?? 0;
          const aw = match.away_win ?? 0;
          const favored = hw >= aw ? match.home_team : match.away_team;
          const favoredPct = Math.max(hw, aw);

          return (
            <div
              key={match.match_id}
              onClick={() => navigate(`/match-preview/${match.match_id}`, { state: { unlocked: true } })}
              className="flex cursor-pointer items-center gap-2 border-b border-border/70 px-3 py-3 transition-colors last:border-b-0 hover:bg-secondary/40 sm:gap-3 sm:px-4"
            >
              <span className="hidden w-11 shrink-0 text-xs font-bold text-muted-foreground sm:inline">
                {formatMatchTime((match as any).match_timestamp, match.match_time, (match as any).match_date)}
              </span>
              <span className="hidden w-32 shrink-0 truncate text-[11px] font-semibold text-muted-foreground lg:inline">
                {match.league}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-extrabold uppercase text-sidebar">
                {match.home_team} <span className="text-muted-foreground">vs</span> {match.away_team}
              </span>

              <span className="hidden shrink-0 items-center gap-1 text-[11px] font-black uppercase tracking-wide text-primary md:inline-flex">
                <Star className="h-3 w-3 fill-current" /> Top Pick
              </span>

              <span
                className={cn(
                  "shrink-0 rounded-md border border-success/50 bg-success/10 px-2 py-1 text-[11px] font-extrabold text-success sm:text-xs",
                  isFree && "blur-[3px] select-none",
                )}
              >
                {favored}
              </span>

              <ConfidenceBar value={favoredPct} blurred={isFree} />
              {isFree && (
                <span className="shrink-0 text-xs font-bold tabular-nums text-primary blur-[3px] select-none sm:hidden">
                  {favoredPct}%
                </span>
              )}

              <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
            </div>
          );
        })}

        <div className="border-t border-border p-3 sm:p-4">
          <Button
            size="sm"
            className="h-10 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90"
            onClick={() => navigate("/match-previews")}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            <span className="truncate">See all Top 30 Picks / Pogledaj sve Top 30 AI Picks</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default DashboardMatchPreviews;
