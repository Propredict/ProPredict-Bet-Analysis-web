import { Flame, RefreshCw, Target, BarChart3, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TipCard } from "@/components/dashboard/TipCard";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { toast } from "sonner";

export default function DailyTips() {
  const {
    tips,
    isLoading,
    refetch
  } = useTips(false);
  const {
    canAccess,
    getUnlockMethod,
    refetch: refetchPlan
  } = useUserPlan();
  const { handleUnlock } = useUnlockHandler();
  const dailyTips = tips.filter(tip => tip.tier === "daily");
  const unlockedCount = dailyTips.filter(tip => canAccess("daily")).length;

  const handleRefresh = () => {
    refetch();
    refetchPlan();
    toast.success("Tips refreshed");
  };

  return <div className="section-gap">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-md bg-amber-500/20">
            <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xs text-foreground sm:text-lg font-semibold">Daily Tips</h1>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">AI-curated predictions updated daily</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0.5">
            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
            Free
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-6 px-1.5 text-[9px]">
            <RefreshCw className="h-2.5 w-2.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-primary/20">
            <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">78%</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Win Rate</p>
          </div>
        </Card>
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-accent/20">
            <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">{dailyTips.length}</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Today's Tips</p>
          </div>
        </Card>
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-primary/20">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">{unlockedCount}</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Unlocked</p>
          </div>
        </Card>
      </div>

      {/* Tips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {isLoading ? <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Loading tips...</p>
            </div>
          </Card> : dailyTips.length === 0 ? <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Target className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-accent mb-1">No daily tips available</p>
              <p className="text-sm">Check back later for new predictions</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card> : dailyTips.map(tip => {
        const unlockMethod = getUnlockMethod("daily");
        const isLocked = unlockMethod?.type !== "unlocked";
        return <TipCard key={tip.id} tip={{
          id: tip.id,
          homeTeam: tip.home_team,
          awayTeam: tip.away_team,
          league: tip.league,
          prediction: tip.prediction,
          odds: tip.odds,
          confidence: tip.confidence ?? 0,
          kickoff: tip.created_at_ts ? new Date(tip.created_at_ts).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric"
          }) : "",
          tier: tip.tier
        }} isLocked={isLocked} unlockMethod={unlockMethod} onUnlockClick={() => handleUnlock("tip", tip.id, "daily")} />;
      })}
      </div>
    </div>;
}
