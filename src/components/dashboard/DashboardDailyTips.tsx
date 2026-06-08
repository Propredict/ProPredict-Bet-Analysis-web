import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTips } from "@/hooks/useTips";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { TipCard, type Tip } from "./TipCard";

function mapDbTipToTip(dbTip: any): Tip {
  return {
    id: dbTip.id,
    homeTeam: dbTip.home_team,
    awayTeam: dbTip.away_team,
    league: dbTip.league,
    prediction: dbTip.prediction,
    odds: dbTip.odds,
    confidence: dbTip.confidence ?? 0,
    kickoff: dbTip.created_at_ts ? new Date(dbTip.created_at_ts).toLocaleDateString() : "",
    tier: dbTip.tier as ContentTier,
    result: dbTip.result as Tip["result"],
    finalResult: (dbTip as any).final_result ?? null,
  };
}

/**
 * Android-only Daily Tips section — mirrors the Web "Daily Tips" block
 * inside MatchPredictions so the dashboard stays in sync across platforms.
 */
export function DashboardDailyTips() {
  const navigate = useNavigate();
  const { canAccess, getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();

  const tipsQuery = useTips(false);
  if (!tipsQuery) return null;
  const { tips: dbTips = [], isLoading } = tipsQuery;

  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const dailyTips = dbTips
    .filter(
      (t: any) =>
        t.tip_date === todayDate &&
        (t.tier === "daily" || t.tier === "free") &&
        t.category !== "risk_of_day" &&
        t.category !== "diamond_pick",
    )
    .map(mapDbTipToTip)
    .slice(0, 2);

  if (!isLoading && dailyTips.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 sm:p-4 space-y-3">
        <div className="text-center space-y-1">
          <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Daily Tips
          </h3>
          <p className="text-[11px] text-muted-foreground">Open access · everyday value</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dailyTips.map((tip) => {
              const isLocked = !canAccess(tip.tier, "tip", tip.id);
              const unlockMethod = getUnlockMethod(tip.tier, "tip", tip.id);
              return (
                <TipCard
                  key={tip.id}
                  tip={tip}
                  isLocked={isLocked}
                  unlockMethod={unlockMethod}
                  isUnlocking={unlockingId === tip.id}
                  onUnlockClick={() => handleUnlock("tip", tip.id, tip.tier)}
                />
              );
            })}
          </div>
        )}

        <div className="flex justify-center pt-1">
          <Button
            size="sm"
            className="px-5 group bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-xs border-0 rounded-full"
            onClick={() => navigate("/daily-analysis")}
          >
            <span>See all Daily Tips</span>
            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}