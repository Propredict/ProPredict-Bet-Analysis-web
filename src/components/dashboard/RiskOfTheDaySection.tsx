import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, Lock, Loader2, Play, Eye, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { PricingModal } from "@/components/PricingModal";

export function RiskOfTheDaySection() {
  const navigate = useNavigate();
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
          Risk of the Day <Target className="h-5 w-5 text-primary" />
        </h2>
        <p className="text-xs text-muted-foreground">High odds • High reward</p>
      </div>

      <Card className="relative rounded-xl border-2 border-primary/65 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-lg shadow-primary/15">
        <Badge className="absolute top-3 right-3 text-[10px] font-bold border-0 bg-primary/20 text-blue-600">
          HIGH RISK
        </Badge>

        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">{riskPick.league}</p>
          <p className="text-lg font-extrabold text-primary-foreground text-center leading-tight">
            {riskPick.home_team} vs {riskPick.away_team}
          </p>
          <div className="flex items-center justify-center gap-2 py-1 border-y border-primary/20">
            <Star className="h-3 w-3 text-blue-600 fill-blue-600" />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">Prediction</span>
            <Star className="h-3 w-3 text-blue-600 fill-blue-600" />
          </div>

          {!isUnlocked ? (
            <div className="space-y-2 pt-1">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  <span className="text-sm font-bold text-primary-foreground blur-sm select-none">Correct Score 2-1</span>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-blue-700 text-primary-foreground text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(0,148,230,0.3)]"
                onClick={() => handleUnlock("tip", riskPick.id, riskPick.tier as any)}
                disabled={isUnlocking}
              >
                {isUnlocking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                Watch Ad to Unlock / Otključaj posle reklame
              </Button>
              <button
                onClick={() => navigate("/risk-of-the-day")}
                className="block w-full text-center text-[11px] text-blue-600/80 hover:text-blue-600 font-semibold transition-colors"
              >
                See all Risk Picks / Pogledaj sve Risk Picks →
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="flex flex-col items-center gap-1 rounded-lg border border-success/45 bg-success/10 px-3 py-2">
                <p className="text-center text-sm font-extrabold text-success">{riskPick.prediction}</p>
              </div>
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-primary to-primary hover:from-blue-700 hover:to-blue-700 text-primary-foreground text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(0,148,230,0.4)]"
                onClick={() => navigate("/risk-of-the-day")}
              >
                <Eye className="h-3.5 w-3.5 mr-1" /> See all Risk Picks / Pogledaj sve Risk Picks
              </Button>
            </div>
          )}
        </div>
      </Card>

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </section>
  );
}
