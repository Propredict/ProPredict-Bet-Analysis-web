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
  const { tips, isLoading, refetch } = useTips(false);
  const { data: accuracyData = [] } = useTipAccuracy();

  const { canAccess, getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();

  const allTips = tips ?? [];

  const dailyAccuracy =
    accuracyData.find((a) => a.tier === "daily")?.accuracy ?? 0;

  const unlockedCount = allTips.filter((tip) =>
    canAccess(tip.tier, "tip", tip.id)
  ).length;

  const avgOdds =
    allTips.length > 0
      ? (
          allTips.reduce((sum, tip) => sum + tip.odds, 0) / allTips.length
        ).toFixed(2)
      : "0.00";

  return (
    <div className="section-gap">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Target className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
          <div>
            <h1 className="text-sm sm:text-base font-bold text-foreground">
              Betting Tips
            </h1>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
              Expert curated betting recommendations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <Badge
            variant="outline"
            className="bg-accent/20 text-accent border-accent/30 text-[9px] sm:text-[10px]"
          >
            <Flame className="h-2.5 w-2.5 mr-0.5" />
            Hot Picks
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-6 sm:h-7 px-1.5"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div>
              <p className="font-bold text-sm sm:text-base">
                {dailyAccuracy}%
              </p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">
                Success Rate
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-accent" />
            <div>
              <p className="font-bold text-sm sm:text-base">{avgOdds}</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">
                Avg Odds
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="font-bold text-sm sm:text-base">
                {unlockedCount}/{allTips.length}
              </p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">
                Unlocked
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tips */}
      <div className="space-y-2 sm:space-y-3">
        {isLoading ? (
          <Card className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </Card>
        ) : (
          allTips.map((tip) => {
            const isLocked = !canAccess(tip.tier, "tip", tip.id);
            const unlockMethod = getUnlockMethod(tip.tier, "tip", tip.id);

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
                unlockMethod={unlockMethod}
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
