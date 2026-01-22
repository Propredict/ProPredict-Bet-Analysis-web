import { useState } from "react";
import { Crown, RefreshCw, Target, BarChart3, TrendingUp, Sparkles, Lock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function PremiumTips() {
  const navigate = useNavigate();
  const { tips, isLoading, refetch } = useTips(false);
  const { canAccess, getUnlockMethod, plan } = useUserPlan();

  // Filter tips to only show premium tier
  const premiumTips = tips.filter((tip) => tip.tier === "premium");

  const unlockedCount = premiumTips.filter((tip) =>
    canAccess("premium", "tip", tip.id)
  ).length;

  const showUpgradeBanner = plan !== "premium";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Crown className="h-7 w-7 text-warning" />
              <h1 className="text-2xl font-bold text-foreground">Premium Tips</h1>
            </div>
            <p className="text-muted-foreground mt-1">Our highest confidence picks with detailed analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-warning/20 text-warning border-warning/30">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Premium Upgrade Banner */}
        {showUpgradeBanner && (
          <Card className="p-6 bg-gradient-to-r from-warning/20 via-accent/20 to-primary/20 border-warning/30">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-gradient-to-br from-warning/30 to-accent/30">
                <Crown className="h-10 w-10 text-warning" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Unlock Premium Predictions</h2>
                <p className="text-muted-foreground mt-1">
                  Get access to our highest confidence picks with detailed analysis
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-warning" />
                  Highest confidence
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-warning" />
                  No ads
                </span>
              </div>
              <Button
                className="bg-gradient-to-r from-warning to-accent hover:opacity-90 text-white border-0 px-8"
                onClick={() => navigate("/get-premium")}
              >
                Subscribe for $5.99/month
              </Button>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">85%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{premiumTips.length}</p>
                <p className="text-xs text-muted-foreground">Total Tips</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{unlockedCount}</p>
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
                <p>Loading tips...</p>
              </div>
            </Card>
          ) : premiumTips.length === 0 ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Target className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-warning mb-1">No premium tips available</p>
                <p className="text-sm">Check back later for new predictions</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : (
            premiumTips.map((tip) => {
              const unlockMethod = getUnlockMethod("premium", "tip", tip.id);
              const isLocked = unlockMethod?.type !== "unlocked";

              return (
                <Card key={tip.id} className="bg-card border-border overflow-hidden">
                  {/* Match Header */}
                  <div className="p-4 bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs">⚽</span>
                      </div>
                      <Badge variant="outline" className="bg-muted text-foreground">
                        {tip.league}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {tip.created_at_ts ? new Date(tip.created_at_ts).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric"
                        }) : ""}
                      </span>
                      <Badge className="bg-warning/20 text-warning border-warning/30">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    </div>
                  </div>

                  {/* Match Title */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-4">
                      {tip.home_team} vs {tip.away_team} - {tip.league}
                    </h3>

                    {/* Prediction/Odds/Confidence row */}
                    <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Prediction</p>
                        {isLocked ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            <span className="text-sm">Locked</span>
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-foreground">{tip.prediction}</p>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Odds</p>
                        <p className={cn("text-sm font-medium", isLocked ? "text-muted-foreground" : "text-foreground")}>
                          {isLocked ? "--" : `@${tip.odds.toFixed(2)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-warning to-accent rounded-full"
                              style={{ width: `${tip.confidence ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-warning">{tip.confidence ?? 0}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Subscribe Button for locked premium content */}
                    {isLocked && (
                      <Button
                        className="w-full gap-2 bg-gradient-to-r from-warning to-accent hover:opacity-90 text-white border-0"
                        onClick={() => navigate("/get-premium")}
                      >
                        <Crown className="h-4 w-4" />
                        Subscribe to Unlock
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
