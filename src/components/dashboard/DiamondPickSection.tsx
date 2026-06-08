import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gem, Lock, Eye, Crown, Star } from "lucide-react";
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

  const tipsQuery = useTips(false);
  if (!tipsQuery) return null;
  const { tips: dbTips = [] } = tipsQuery;

  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const diamondPick = dbTips.find((t: any) => t.tip_date === todayDate && t.category === "diamond_pick");

  if (!diamondPick) return null;

  const isUnlocked = canAccess(diamondPick.tier as any, "tip", diamondPick.id);

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
          <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">{diamondPick.league}</p>
          <p className="text-lg font-extrabold text-white text-center leading-tight">
            {diamondPick.home_team} vs {diamondPick.away_team}
          </p>
          <div className="flex items-center justify-center gap-2 py-1 border-y border-cyan-400/20">
            <Star className="h-3 w-3 text-cyan-300 fill-cyan-300" />
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-[0.2em]">Prediction</span>
            <Star className="h-3 w-3 text-cyan-300 fill-cyan-300" />
          </div>

          {!isUnlocked ? (
            <div className="space-y-2 pt-1">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  <span className="text-sm font-bold text-white blur-sm select-none">Premium Pick</span>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                onClick={() => { setHighlightPlan("premium"); setShowPricingModal(true); }}
              >
                <Crown className="h-3.5 w-3.5 mr-1" /> Get Premium
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
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-bold text-white text-center">{diamondPick.prediction}</p>
              </div>
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