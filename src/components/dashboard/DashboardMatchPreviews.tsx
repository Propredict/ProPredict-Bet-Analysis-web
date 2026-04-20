import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ChevronRight, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { cn } from "@/lib/utils";

const QUALITY_LEAGUES: Record<string, number> = {
  "Premier League": 1, "Championship": 2, "La Liga": 3, "Bundesliga": 4,
  "Serie A": 5, "Ligue 1": 6, "Eredivisie": 7, "Primeira Liga": 8,
  "Serie B": 9, "2. Bundesliga": 10, "Segunda División": 11, "Ligue 2": 12,
};

export function DashboardMatchPreviews() {
  const navigate = useNavigate();
  const { predictions, loading } = useAIPredictions("today");

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
    <Card className="bg-card/80 border-border/50 overflow-hidden">
      <CardContent className="p-3 md:p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-violet-500/15">
              <Eye className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-semibold text-foreground">Top 30 AI Picks</h2>
              <p className="text-[9px] md:text-[10px] text-muted-foreground">In-depth AI analysis for top matches</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[9px] md:text-[10px] border-violet-500/40 text-violet-400 cursor-pointer hover:bg-violet-500/10"
            onClick={() => navigate("/match-previews")}
          >
            View all
          </Badge>
        </div>

        {/* Match Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          {topMatches.map((match) => {
            const hw = match.home_win ?? 0;
            const aw = match.away_win ?? 0;
            const favored = hw >= aw ? match.home_team : match.away_team;
            const favoredPct = Math.max(hw, aw);

            return (
              <div
                key={match.match_id}
                className="bg-background/60 border border-border/40 rounded-lg p-2.5 md:p-3 cursor-pointer hover:border-violet-500/40 transition-colors group"
                onClick={() => navigate(`/match-preview/${match.match_id}`, { state: { unlocked: true } })}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[8px] md:text-[9px] text-muted-foreground truncate max-w-[100px]">
                    {match.league}
                  </span>
                  <span className="text-[8px] md:text-[9px] text-muted-foreground">
                    {match.match_time?.slice(0, 5)}
                  </span>
                </div>

                <h3 className="text-[10px] md:text-xs font-semibold text-foreground mb-2 line-clamp-1">
                  {match.home_team} vs {match.away_team}
                </h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-2.5 w-2.5 text-violet-400" />
                    <span className="text-[9px] md:text-[10px] text-muted-foreground truncate max-w-[80px]">
                      {favored}
                    </span>
                  </div>
                  <Badge className={cn(
                    "text-[8px] md:text-[9px] px-1.5 py-0 border-0 font-bold rounded",
                    favoredPct >= 70 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                  )}>
                    {favoredPct}%
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex justify-center pt-1">
          <Button
            size="sm"
            className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white text-xs px-6 rounded-full"
            onClick={() => navigate("/match-previews")}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            See all Top 30 AI Picks
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default DashboardMatchPreviews;
