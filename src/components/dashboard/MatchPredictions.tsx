import { useState } from "react";
import { TrendingUp, Sparkles, Star, Crown, Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { TipCard, type Tip } from "./TipCard";
import { PricingModal } from "@/components/PricingModal";
import { useTips } from "@/hooks/useTips";

type TabType = "daily" | "exclusive" | "premium";

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
  };
}

export function MatchPredictions() {
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium">();

  const { canAccess, getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler({
    onUpgradeBasic: () => {
      setHighlightPlan("basic");
      setShowPricingModal(true);
    },
    onUpgradePremium: () => {
      setHighlightPlan("premium");
      setShowPricingModal(true);
    },
  });

  const tipsQuery = useTips(false);

  if (!tipsQuery) return null;

  const { tips: dbTips = [], isLoading } = tipsQuery;

  const tips = dbTips.map(mapDbTipToTip);
  const filteredTips = tips.filter((t) => t.tier === activeTab);

  const tabs = [
    { id: "daily", label: "Daily", icon: Sparkles },
    { id: "exclusive", label: "Pro", icon: Star },
    { id: "premium", label: "Premium", icon: Crown },
  ];

  return (
    <section className="space-y-1.5 sm:space-y-2">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-xs sm:text-sm font-semibold">Match Predictions</h2>
      </div>

      <Card className="p-0.5">
        <div className="grid grid-cols-3 gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs",
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <tab.icon className="h-3 w-3 mx-auto" />
              <p className="mt-0.5">{tab.label}</p>
            </button>
          ))}
        </div>
      </Card>

      <div className="bg-primary/10 border border-primary/20 rounded-md py-1 px-2 text-center">
        <div className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] text-primary">
          <Users className="h-3 w-3" />
          <span>Users unlocked tips today</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredTips.length > 0 ? (
        <div className="space-y-1.5 sm:space-y-2">
          {filteredTips.map((tip) => {
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
      ) : (
        <Card className="p-4 text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground">No {activeTab} predictions available</p>
        </Card>
      )}

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </section>
  );
}
