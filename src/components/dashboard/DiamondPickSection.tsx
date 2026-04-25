import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gem, Lock, Loader2, Play, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { PricingModal } from "@/components/PricingModal";

export function DiamondPickSection() {
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
  const diamondPick = dbTips.find((t: any) => t.tip_date === todayDate && t.category === "diamond_pick");

  if (!diamondPick) return null;

  const isUnlocked = canAccess(diamondPick.tier as any, "tip", diamondPick.id);
  const isUnlocking = unlockingId === diamondPick.id;

  return (
    <section className="space-y-3">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-extrabold text-foreground flex items-center justify-center gap-2">
          Diamond Pick <Gem className="h-5 w-5 text-cyan-300" />
        </h2>
        <p className="text-xs text-muted-foreground">Hand-picked best of the day • Highest conviction</p>
      </div>

      <Card className="relative p-4 border-2 border-cyan-400/40 rounded-xl bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.2)]">
        <Badge className="absolute top-3 right-3 text-[10px] font-bold border-0 bg-cyan-500/20 text-cyan-300">
          DIAMOND
        </Badge>

        <div className="space-y-2">
          <p className="text-sm font-bold text-cyan-300">
            {diamondPick.home_team} vs {diamondPick.away_team}
          </p>
          <p className="text-[10px] text-muted-foreground">{diamondPick.league}</p>

          {!isUnlocked ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-xs blur-sm select-none">Premium Pick</span>
              </div>
              {diamondPick.confidence && (
                <p className="text-xs text-cyan-300 font-bold">Confidence: {diamondPick.confidence}%</p>
              )}
              <Button
                size="sm"
                className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                onClick={() => handleUnlock("tip", diamondPick.id, diamondPick.tier as any)}
                disabled={isUnlocking}
              >
                {isUnlocking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                Watch Ad to Unlock
              </Button>
              <button
                onClick={() => navigate("/diamond-pick")}
                className="block w-full text-center text-[11px] text-cyan-300/80 hover:text-cyan-300 font-semibold transition-colors"
              >
                See all Diamond Picks →
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-foreground">{diamondPick.prediction}</p>
              {diamondPick.confidence && (
                <p className="text-xs text-cyan-300 font-bold">Confidence: {diamondPick.confidence}%</p>
              )}
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                onClick={() => navigate("/diamond-pick")}
              >
                <Eye className="h-3.5 w-3.5 mr-1" /> See all Diamond Picks
              </Button>
            </div>
          )}
        </div>
      </Card>

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </section>
  );
}