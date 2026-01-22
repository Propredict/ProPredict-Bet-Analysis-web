import { useState } from "react";
import { Flame, RefreshCw, Target, BarChart3, TrendingUp, Sparkles, Lock, LogIn, Loader2, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function DailyTips() {
  const navigate = useNavigate();
  const { tips, isLoading, refetch } = useTips(false);
  const { canAccess, getUnlockMethod, unlockContent } = useUserPlan();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  // Filter tips to only show daily tier
  const dailyTips = tips.filter((tip) => tip.tier === "daily");

  const unlockedCount = dailyTips.filter((tip) =>
    canAccess("daily", "tip", tip.id)
  ).length;

  const handleUnlock = async (tipId: string) => {
    setUnlockingId(tipId);
    await unlockContent("tip", tipId);
    setUnlockingId(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Flame className="h-7 w-7 text-accent" />
              <h1 className="text-2xl font-bold text-foreground">Daily Tips</h1>
            </div>
            <p className="text-muted-foreground mt-1">AI-curated predictions updated daily</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30">
              <Sparkles className="h-3 w-3 mr-1" />
              Free Access
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
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">78%</p>
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
                <p className="text-2xl font-bold text-foreground">{dailyTips.length}</p>
                <p className="text-xs text-muted-foreground">Today's Tips</p>
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
          ) : dailyTips.length === 0 ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Target className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-accent mb-1">No daily tips available</p>
                <p className="text-sm">Check back later for new predictions</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : (
            dailyTips.map((tip) => {
              const unlockMethod = getUnlockMethod("daily", "tip", tip.id);
              const isLocked = unlockMethod?.type !== "unlocked";
              const isUnlocking = unlockingId === tip.id;

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
                    <span className="text-xs text-muted-foreground">
                      {tip.created_at_ts ? new Date(tip.created_at_ts).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric"
                      }) : ""}
                    </span>
                  </div>

                  {/* Match Title */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-4">
                      {tip.home_team} vs {tip.away_team}
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
                              className="h-full bg-gradient-to-r from-accent to-primary rounded-full"
                              style={{ width: `${tip.confidence ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-accent">{tip.confidence ?? 0}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Unlock Button */}
                    {isLocked && unlockMethod && (
                      <div className="flex items-center gap-2">
                        <Button
                          className={cn(
                            "flex-1 gap-2",
                            unlockMethod.type === "watch_ad" && "bg-primary hover:bg-primary/90 text-primary-foreground",
                            unlockMethod.type === "login_required" && "bg-muted hover:bg-muted/80"
                          )}
                          disabled={isUnlocking}
                          onClick={() => {
                            if (unlockMethod.type === "login_required") {
                              navigate("/login");
                            } else if (unlockMethod.type === "watch_ad") {
                              handleUnlock(tip.id);
                            }
                          }}
                        >
                          {isUnlocking ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Watching ad...
                            </>
                          ) : (
                            <>
                              {unlockMethod.type === "login_required" && <LogIn className="h-4 w-4" />}
                              {unlockMethod.type === "watch_ad" && <Lock className="h-4 w-4" />}
                              {unlockMethod.type === "watch_ad" ? "Watch Ad to Unlock" : "Sign in to Unlock"}
                            </>
                          )}
                        </Button>
                        <Badge className="bg-accent/20 text-accent border-accent/30 px-3 py-2">
                          <Crown className="h-3 w-3 mr-1" />
                          Pro
                        </Badge>
                      </div>
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
