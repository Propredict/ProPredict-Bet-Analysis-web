import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ChevronRight, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { cn } from "@/lib/utils";
import { formatMatchTime } from "@/utils/formatMatchTime";

const QUALITY_LEAGUES: Record<string, number> = {
  "Premier League": 1, "Championship": 2, "La Liga": 3, "Bundesliga": 4,
  "Serie A": 5, "Ligue 1": 6, "Eredivisie": 7, "Primeira Liga": 8,
  "Serie B": 9, "2. Bundesliga": 10, "Segunda División": 11, "Ligue 2": 12,
};

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
    <section className="space-y-3">
      <div className="space-y-1 text-center">
        <h2 className="flex items-center justify-center gap-2 text-xl font-black tracking-tight text-sidebar sm:text-2xl">
          <Eye className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
          Top 30 AI Picks
        </h2>
        <p className="text-[11px] text-muted-foreground">In-depth AI analysis for top matches</p>
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-md">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-base font-black text-sidebar sm:text-lg">Highest confidence today</h3>
          </div>
          <button
            onClick={() => navigate("/match-previews")}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            View All <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {topMatches.map((match) => {
          const hw = match.home_win ?? 0;
          const aw = match.away_win ?? 0;
          const favored = hw >= aw ? match.home_team : match.away_team;
          const favoredPct = Math.max(hw, aw);

          return (
            <div
              key={match.match_id}
              onClick={() => navigate(`/match-preview/${match.match_id}`, { state: { unlocked: true } })}
              className="flex cursor-pointer items-center gap-2 border-b border-border/70 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-secondary/40 sm:px-4"
            >
              <span className="hidden w-12 shrink-0 text-xs font-bold text-muted-foreground sm:inline">
                {formatMatchTime((match as any).match_timestamp, match.match_time, (match as any).match_date)}
              </span>
              <span className="hidden w-28 shrink-0 truncate text-[11px] font-bold uppercase text-primary lg:inline">
                {match.league}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-extrabold uppercase text-sidebar">
                {match.home_team} <span className="text-muted-foreground">vs</span> {match.away_team}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-md border border-success/50 bg-success/10 px-2 py-1 text-[11px] font-extrabold text-success sm:text-xs",
                  isFree && "blur-sm select-none",
                )}
              >
                {favored}
              </span>
              <span
                className={cn(
                  "hidden shrink-0 rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-primary sm:inline",
                  isFree && "blur-sm select-none",
                )}
              >
                {favoredPct}%
              </span>
            </div>
          );
        })}

        <div className="border-t border-border px-3 py-3">
          <Button
            size="sm"
            className="w-full rounded-lg bg-primary text-xs font-bold text-primary-foreground"
            onClick={() => navigate("/match-previews")}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            <span className="truncate">See all Top 30 AI Picks / Pogledaj sve Top 30 AI Picks</span>
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default DashboardMatchPreviews;
