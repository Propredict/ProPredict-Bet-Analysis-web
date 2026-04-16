import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Lock, Eye, Loader2, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { PricingModal } from "@/components/PricingModal";
import { PicksCategoryModal } from "./PicksCategoryModal";

export function TodaysTopPicks() {
  const navigate = useNavigate();
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium">();
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const { canAccess } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler({
    onUpgradeBasic: () => { setHighlightPlan("basic"); setShowPricingModal(true); },
    onUpgradePremium: () => { setHighlightPlan("premium"); setShowPricingModal(true); },
  });

  const tipsQuery = useTips(false);
  if (!tipsQuery) return null;
  const { tips: dbTips = [], isLoading } = tipsQuery;

  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const todayTips = dbTips.filter((t: any) => t.tip_date === todayDate);

  const freePick = todayTips.find((t: any) => t.tier === "daily");
  const proPick = todayTips.find((t: any) => t.tier === "exclusive");
  const premiumPick = todayTips.find((t: any) => t.tier === "premium");

  const picks = [
    {
      label: "FREE", tier: "daily" as const, pick: freePick,
      accent: "text-green-400", border: "border-green-500/40", glow: "shadow-[0_0_15px_rgba(34,197,94,0.2)]",
      bg: "bg-green-500/10", badgeBg: "bg-green-500/20 text-green-400",
      locked: false,
    },
    {
      label: "PRO", tier: "exclusive" as const, pick: proPick,
      accent: "text-amber-400", border: "border-amber-500/40", glow: "shadow-[0_0_15px_rgba(245,158,11,0.25)]",
      bg: "bg-amber-500/10", badgeBg: "bg-amber-500/20 text-amber-400",
      locked: true,
    },
    {
      label: "PREMIUM", tier: "premium" as const, pick: premiumPick,
      accent: "text-purple-400", border: "border-purple-500/40", glow: "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
      bg: "bg-purple-500/10", badgeBg: "bg-purple-500/20 text-purple-400",
      locked: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-extrabold text-foreground flex items-center justify-center gap-2">
          Today's Top Picks <Flame className="h-5 w-5 text-orange-500" />
        </h2>
        <p className="text-xs text-muted-foreground">Hand-picked best value predictions for today</p>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {picks.map(({ label, tier, pick, accent, border, glow, bg, badgeBg, locked }) => {
          if (!pick) return null;
          const isUnlocked = canAccess(tier, "tip", pick.id);
          const isLocked = locked && !isUnlocked;
          const isUnlocking = unlockingId === pick.id;

          return (
            <Card key={tier} className={cn("relative p-4 border-2 rounded-xl", border, glow, bg)}>
              <Badge className={cn("absolute top-3 right-3 text-[10px] font-bold border-0", badgeBg)}>
                {label}
              </Badge>

              <div className="space-y-2">
                <p className={cn("text-sm font-bold", accent)}>
                  {pick.home_team} vs {pick.away_team}
                </p>
                <p className="text-[10px] text-muted-foreground">{pick.league}</p>

                {isLocked ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      <span className="text-xs blur-sm select-none">Over 2.5 Goals</span>
                    </div>

                    {tier === "exclusive" ? (
                      <div className="space-y-1.5">
                        <Button
                          size="sm"
                          className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                          onClick={() => handleUnlock("tip", pick.id, tier)}
                          disabled={isUnlocking}
                        >
                          {isUnlocking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                          Watch Ad to Unlock
                        </Button>
                        <button
                          onClick={() => navigate("/get-premium")}
                          className="block w-full text-center text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors"
                        >
                          or unlock with Pro
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                        onClick={() => navigate("/get-premium")}
                      >
                        Get Premium
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{pick.prediction}</span>
                      {pick.confidence && (
                        <span className={cn("text-xs font-bold", accent)}>{pick.confidence}%</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn("w-full text-xs border", border, accent)}
                      onClick={() => navigate("/daily-analysis")}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> View Pick
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* View All CTA */}
      {todayTips.length > 0 && (
        <button
          onClick={() => setShowCategoryModal(true)}
          className="block w-full text-center text-sm font-bold text-primary hover:text-primary/80 transition-colors py-2"
        >
          View All Today's Picks →
        </button>
      )}

      <PicksCategoryModal open={showCategoryModal} onOpenChange={setShowCategoryModal} />
      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </section>
  );
}
