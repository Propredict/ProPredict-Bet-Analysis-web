import {
  Target,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Flame,
  Sparkles,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TipCard } from "@/components/dashboard/TipCard";

import { useTips } from "@/hooks/useTips";
import { useTipAccuracy } from "@/hooks/useTipAccuracy";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";

export default function BettingTips() {
  const { tips = [], isLoading, refetch } = useTips(false);
  const { data: accuracyData = [] } = useTipAccuracy();

  const { canAccess, getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();

  const dailyAccuracy =
    accuracyData.find((a) => a.tier === "daily")?.accuracy ?? 0;

  const unlockedCount = tips.filter((tip) =>
    canAccess(tip.tier, "tip", tip.id)
  ).length;

  const avgOdds =
    tips.length > 0
      ? (
          tips.reduce((sum, tip) => sum + tip.odds, 0) / tips.length
        ).toFixed(2)
      : "0.00";

  return (
    <div className="section-gap">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          <div>
            <h1 className="font-bold">Betting Tips</h1>
            <p className="text-xs text-muted-foreground">
              Expert curated betting recommendations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-accent/20 text-accent border-accent/30 text-xs"
          >
            <Flame className="h-3 w-3 mr-1" />
            Hot Picks
          </Badge>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div>
              <p className="font-bold">{dailyAccuracy}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <div>
              <p className="font-bold">{avgOdds}</p>
              <p className="text-xs text-muted-foreground">Avg Odds</p>
            </div>
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="font-bold">
                {unlockedCount}/{tips.length}
              </p>
              <p className="text-xs text-muted-foreground">Unlocked</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {isLoading ? (
          <Card className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </Card>
        ) : (
          tips.map((tip) => {
            const isLocked = !canAccess(tip.tier, "tip", tip.id);

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
                  confidence: tip.confidence ?? 75,
                  kickoff: tip.created_at_ts
                    ? new Date(tip.created_at_ts).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "TBD",
                  tier: tip.tier,
                }}
                isLocked={isLocked}
                unlockMethod={getUnlockMethod(tip.tier, "tip", tip.id)}
                isUnlocking={unlockingId === tip.id}
                onUnlockClick={() =>
                  handleUnlock("tip", tip.id, tip.tier)
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}
