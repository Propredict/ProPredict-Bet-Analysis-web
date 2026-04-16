import { useState } from "react";
import { Target, Lock, Loader2, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { PricingModal } from "@/components/PricingModal";

export function RiskOfTheDaySection() {
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium">();

  const { canAccess } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler({
    onUpgradeBasic: () => { setHighlightPlan("basic"); setShowPricingModal(true); },
    onUpgradePremium: () => { setHighlightPlan("premium"); setShowPricingModal(true); },
  });

  const tipsQuery = useTips(false);
  if (!tipsQuery) return null;
  const { tips: dbTips = [] } = tipsQuery;

  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const riskPick = dbTips.find((t: any) => t.tip_date === todayDate && t.category === "risk_of_day");

  if (!riskPick) return null;

  const isUnlocked = canAccess(riskPick.tier as any, "tip", riskPick.id);
  const isUnlocking = unlockingId === riskPick.id;

  return (
    <section className="space-y-3">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-extrabold text-foreground flex items-center justify-center gap-2">
          Risk of the Day <Target className="h-5 w-5 text-red-500" />
        </h2>
        <p className="text-xs text-muted-foreground">High odds • High reward</p>
      </div>

      <Card className="relative p-4 border-2 border-red-500/40 rounded-xl bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent shadow-[0_0_20px_rgba(239,68,68,0.2)]">
        <Badge className="absolute top-3 right-3 text-[10px] font-bold border-0 bg-red-500/20 text-red-400">
          HIGH RISK
        </Badge>

        <div className="space-y-2">
          <p className="text-sm font-bold text-red-400">
            {riskPick.home_team} vs {riskPick.away_team}
          </p>
          <p className="text-[10px] text-muted-foreground">{riskPick.league}</p>

          {!isUnlocked ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-xs blur-sm select-none">Correct Score 2-1</span>
              </div>
              {riskPick.odds && (
                <p className="text-xs text-red-400 font-bold">Odds: {riskPick.odds}</p>
              )}
              <Button
                size="sm"
                className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                onClick={() => handleUnlock("tip", riskPick.id, riskPick.tier as any)}
                disabled={isUnlocking}
              >
                {isUnlocking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                Watch Ad to Unlock
              </Button>
            </div>
          ) : (
            <div className="pt-1">
              <p className="text-xs font-semibold text-foreground">{riskPick.prediction}</p>
              {riskPick.odds && (
                <p className="text-xs text-red-400 font-bold mt-1">Odds: {riskPick.odds}</p>
              )}
            </div>
          )}
        </div>
      </Card>

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </section>
  );
}
