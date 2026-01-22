import { Target, RefreshCw, TrendingUp, BarChart3, Flame, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TipCard } from "@/components/dashboard/TipCard";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";

export default function BettingTips() {
  const { tips, isLoading, refetch } = useTips(false);
  const { canAccess, getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();

  // Show all tips as betting tips
  const allTips = tips;

  const unlockedCount = allTips.filter((tip) =>
    canAccess(tip.tier, "tip", tip.id)
  ).length;

  // Calculate average odds
  const avgOdds = allTips.length > 0 
    ? (allTips.reduce((sum, tip) => sum + tip.odds, 0) / allTips.length).toFixed(2)
    : "0.00";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Target className="h-7 w-7 text-accent" />
              <h1 className="text-2xl font-bold text-foreground">Betting Tips</h1>
            </div>
            <p className="text-muted-foreground mt-1">Expert curated betting recommendations</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30">
              <Flame className="h-3 w-3 mr-1" />
              Hot Picks
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">76%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{avgOdds}</p>
                <p className="text-xs text-muted-foreground">Avg Odds</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{unlockedCount}/{allTips.length}</p>
                <p className="text-xs text-muted-foreground">Unlocked</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tips List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading betting tips...</p>
              </div>
            </Card>
          ) : allTips.length === 0 ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Target className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-accent mb-1">No betting tips available</p>
                <p className="text-sm">Check back later for new recommendations</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : (
            allTips.map((tip) => {
              const isLocked = !canAccess(tip.tier, "tip", tip.id);
              const unlockMethod = getUnlockMethod(tip.tier, "tip", tip.id);

              // Map database fields to TipCard expected format
              const mappedTip = {
                id: tip.id,
                homeTeam: tip.home_team,
                awayTeam: tip.away_team,
                league: tip.league,
                prediction: tip.prediction,
                odds: tip.odds,
                confidence: tip.confidence ?? 75,
                kickoff: tip.created_at_ts ? new Date(tip.created_at_ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBD",
                tier: tip.tier,
              };

              return (
                <TipCard
                  key={tip.id}
                  tip={mappedTip}
                  isLocked={isLocked}
                  unlockMethod={unlockMethod}
                  isUnlocking={unlockingId === tip.id}
                  onUnlockClick={() => handleUnlock("tip", tip.id, tip.tier)}
                />
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
