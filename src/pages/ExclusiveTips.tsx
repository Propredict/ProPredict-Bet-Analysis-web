import { Star, RefreshCw, Target, BarChart3, TrendingUp, Crown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TipCard } from "@/components/dashboard/TipCard";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useNavigate } from "react-router-dom";

export default function ExclusiveTips() {
  const navigate = useNavigate();
  const { tips, isLoading, refetch } = useTips(false);
  const { canAccess, getUnlockMethod, plan } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();

  // Filter tips to only show exclusive tier
  const exclusiveTips = tips.filter((tip) => tip.tier === "exclusive");

  const unlockedCount = exclusiveTips.filter((tip) =>
    canAccess("exclusive", "tip", tip.id)
  ).length;

  const showUpgradeBanner = plan === "free";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Star className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Pro Tips</h1>
            </div>
            <p className="text-muted-foreground mt-1">Premium predictions with higher confidence</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
              <Star className="h-3 w-3 mr-1" />
              Pro
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Upgrade Banner */}
        {showUpgradeBanner && (
          <Card className="p-4 bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/20">
                  <Crown className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Remove Ads & Unlock All Tips</h3>
                  <p className="text-sm text-muted-foreground">Subscribe for $3.99/month</p>
                </div>
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => navigate("/get-premium")}
              >
                Subscribe Now
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
                <p className="text-2xl font-bold text-foreground">82%</p>
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
                <p className="text-2xl font-bold text-foreground">{exclusiveTips.length}</p>
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
          ) : exclusiveTips.length === 0 ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Target className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-primary mb-1">No pro tips available</p>
                <p className="text-sm">Check back later for new predictions</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : (
            exclusiveTips.map((tip) => {
              const unlockMethod = getUnlockMethod("exclusive", "tip", tip.id);
              const isLocked = unlockMethod?.type !== "unlocked";
              const isUnlocking = unlockingId === tip.id;

              return (
                <TipCard
                  key={tip.id}
                  tip={{
                    id: tip.id,
                    homeTeam: tip.home_team,
                    awayTeam: tip.away_team,
                    league: tip.league,
                    prediction: tip.prediction,
                    odds: tip.odds,
                    confidence: tip.confidence ?? 0,
                    kickoff: tip.created_at_ts
                      ? new Date(tip.created_at_ts).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      : "",
                    tier: tip.tier,
                  }}
                  isLocked={isLocked}
                  unlockMethod={unlockMethod}
                  onUnlockClick={() => handleUnlock("tip", tip.id, "exclusive")}
                  isUnlocking={isUnlocking}
                />
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
