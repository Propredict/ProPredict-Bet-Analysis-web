import { Brain, RefreshCw, Target, BarChart3, TrendingUp, Sparkles, Loader2, Activity, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/dashboard/AIPredictionCard";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";

export default function AIPredictions() {
  const { tips, isLoading, refetch } = useTips(false);
  const { canAccess, getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();

  // Show all tips with AI predictions
  const aiTips = tips.filter((tip) => tip.ai_prediction);

  const unlockedCount = aiTips.filter((tip) =>
    canAccess(tip.tier, "tip", tip.id)
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Brain className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Predictions</h1>
                <p className="text-muted-foreground">AI-powered match analysis and predictions</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <Activity className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">3</p>
                <p className="text-xs text-muted-foreground">Live Now</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">85%</p>
                <p className="text-xs text-muted-foreground">Overall Accuracy</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{aiTips.length}</p>
                <p className="text-xs text-muted-foreground">Active Predictions</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <BarChart3 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">1.2K</p>
                <p className="text-xs text-muted-foreground">Matches Analyzed</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Predictions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Today's Predictions</h2>
            </div>
            <Badge variant="outline" className="bg-success/20 text-success border-success/30">
              {unlockedCount} Unlocked
            </Badge>
          </div>

          {isLoading ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading AI predictions...</p>
              </div>
            </Card>
          ) : aiTips.length === 0 ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Brain className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-foreground font-medium mb-1">No AI predictions available</p>
                <p className="text-sm">Check back later for new analysis</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              {aiTips.map((tip) => {
                const isLocked = !canAccess(tip.tier, "tip", tip.id);
                const unlockMethod = getUnlockMethod(tip.tier, "tip", tip.id);

                // Map database fields to AIPredictionCard expected format
                const mappedPrediction = {
                  id: tip.id,
                  homeTeam: tip.home_team,
                  awayTeam: tip.away_team,
                  league: tip.league,
                  prediction: tip.prediction,
                  odds: tip.odds,
                  confidence: tip.confidence ?? 75,
                  kickoff: tip.created_at_ts 
                    ? new Date(tip.created_at_ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : "TBD",
                  tier: tip.tier,
                  aiAnalysis: tip.ai_prediction ?? undefined,
                };

                return (
                  <AIPredictionCard
                    key={tip.id}
                    prediction={mappedPrediction}
                    isLocked={isLocked}
                    unlockMethod={unlockMethod}
                    isUnlocking={unlockingId === tip.id}
                    onUnlockClick={() => handleUnlock("tip", tip.id, tip.tier)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
