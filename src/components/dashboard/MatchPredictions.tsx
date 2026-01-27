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
    tier: dbTip.tier as ContentTier
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
    }
  });

  const tipsQuery = useTips(false);
  if (!tipsQuery) return null;
  const { tips: dbTips = [], isLoading } = tipsQuery;
  const tips = dbTips.map(mapDbTipToTip);
  const filteredTips = tips.filter(t => t.tier === activeTab);

  const tabs = [
    { id: "daily", label: "Daily", icon: Sparkles, color: "accent" },
    { id: "exclusive", label: "Pro", icon: Star, color: "primary" },
    { id: "premium", label: "Premium", icon: Crown, color: "warning" }
  ];

  const getTabStyles = (tabId: string, isActive: boolean) => {
    if (!isActive) return "text-muted-foreground hover:text-foreground hover:bg-muted/50";
    
    switch (tabId) {
      case "daily":
        return "bg-accent/20 text-accent border border-accent/30";
      case "exclusive":
        return "bg-primary/20 text-primary border border-primary/30";
      case "premium":
        return "bg-warning/20 text-warning border border-warning/30";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  return (
    <section className="space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-accent/20">
          <TrendingUp className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Daily Tips</h2>
          <p className="text-[9px] text-muted-foreground">AI-powered match predictions</p>
        </div>
      </div>

      {/* Tab Navigation - Enhanced */}
      <Card className="p-1 bg-card/80 backdrop-blur-sm border-border/50">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const count = tips.filter(t => t.tier === tab.id).length;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "relative py-2 sm:py-2.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200",
                  getTabStyles(tab.id, isActive)
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5 mx-auto", isActive && "drop-shadow-sm")} />
                <p className="mt-0.5">{tab.label}</p>
                {count > 0 && (
                  <span className={cn(
                    "text-[8px] opacity-80",
                    isActive ? "font-semibold" : "opacity-60"
                  )}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Social Proof Banner - Subtle */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-primary/5 border border-primary/10">
        <Users className="h-3 w-3 text-primary/70" />
        <span className="text-[9px] text-muted-foreground">
          <span className="text-primary font-medium">128</span> users unlocked tips today
        </span>
      </div>

      {/* Tips Content */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filteredTips.length > 0 ? (
        <div className="space-y-2">
          {filteredTips.map(tip => {
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
        <Card className="empty-state-compact bg-card/50 border-border/50">
          <div className="flex flex-col items-center gap-1">
            {activeTab === "daily" && <Sparkles className="h-5 w-5 text-accent/50" />}
            {activeTab === "exclusive" && <Star className="h-5 w-5 text-primary/50" />}
            {activeTab === "premium" && <Crown className="h-5 w-5 text-warning/50" />}
            <p className="text-[10px] text-muted-foreground">
              No {activeTab} tips available
            </p>
          </div>
        </Card>
      )}

      <PricingModal 
        open={showPricingModal} 
        onOpenChange={setShowPricingModal} 
        highlightPlan={highlightPlan} 
      />
    </section>
  );
}
