import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Sparkles, Star, Crown, Users, Loader2, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const TAB_ROUTES: Record<TabType, string> = {
  daily: "/daily-tips",
  exclusive: "/exclusive-tips",
  premium: "/premium-tips"
};

export function MatchPredictions() {
  const navigate = useNavigate();
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
  const displayedTips = filteredTips.slice(0, 4);
  const hasMoreTips = filteredTips.length > 4;

  const tabs = [
    { id: "daily", label: "Daily", icon: Sparkles },
    { id: "exclusive", label: "Pro", icon: Star },
    { id: "premium", label: "Premium", icon: Crown }
  ];

  const getTabStyles = (tabId: string, isActive: boolean) => {
    const baseStyles = "relative py-3 px-3 rounded-xl text-xs font-semibold transition-all duration-300 border-2 shadow-md";
    
    // Each tier always shows its color - stronger when active, subtle when inactive
    switch (tabId) {
      case "daily":
        return isActive 
          ? cn(baseStyles, "bg-gradient-to-br from-amber-500/25 via-orange-500/20 to-yellow-500/25 border-amber-500/60 text-amber-400 shadow-amber-500/25")
          : cn(baseStyles, "bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-yellow-500/10 border-amber-500/30 text-amber-400/70 hover:border-amber-500/50 hover:text-amber-400");
      case "exclusive":
        return isActive 
          ? cn(baseStyles, "bg-gradient-to-br from-violet-500/25 via-purple-500/20 to-indigo-500/25 border-violet-500/60 text-violet-400 shadow-violet-500/25")
          : cn(baseStyles, "bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10 border-violet-500/30 text-violet-400/70 hover:border-violet-500/50 hover:text-violet-400");
      case "premium":
        return isActive 
          ? cn(baseStyles, "bg-gradient-to-br from-yellow-500/25 via-amber-500/20 to-orange-500/25 border-yellow-500/60 text-yellow-400 shadow-yellow-500/30 glow-warning")
          : cn(baseStyles, "bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-orange-500/10 border-yellow-500/30 text-yellow-400/70 hover:border-yellow-500/50 hover:text-yellow-400");
      default:
        return cn(baseStyles, "bg-card border-border text-muted-foreground");
    }
  };

  const getCtaLabel = () => {
    switch (activeTab) {
      case "daily": return "See all Daily tips";
      case "exclusive": return "See all Pro tips";
      case "premium": return "See all Premium tips";
    }
  };

  return (
    <section className="space-y-4">
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

      {/* Tab Navigation - Card-like styling */}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const count = tips.filter(t => t.tier === tab.id).length;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={getTabStyles(tab.id, isActive)}
            >
              <div className="flex flex-col items-center gap-1">
                <tab.icon className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isActive && "scale-110 drop-shadow-lg"
                )} />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-background/20" : "bg-muted/50"
                  )}>
                    {count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Social Proof Banner */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-primary/5 border border-primary/10">
        <Users className="h-3 w-3 text-primary/70" />
        <span className="text-[9px] text-muted-foreground">
          <span className="text-primary font-medium">128</span> users unlocked tips today
        </span>
      </div>

      {/* Tips Content - Limited to 4 */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : displayedTips.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayedTips.map(tip => {
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
          
          {/* See All CTA */}
          {(hasMoreTips || filteredTips.length > 0) && (
            <Button
              variant="outline"
              className="w-full mt-3 border-border/50 hover:border-primary/50 hover:bg-primary/5 group"
              onClick={() => navigate(TAB_ROUTES[activeTab])}
            >
              <span>{getCtaLabel()}</span>
              <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Button>
          )}
        </div>
      ) : (
        <Card className="empty-state-compact bg-card/50 border-border/50">
          <div className="flex flex-col items-center gap-1">
            {activeTab === "daily" && <Sparkles className="h-5 w-5 text-amber-500/50" />}
            {activeTab === "exclusive" && <Star className="h-5 w-5 text-violet-500/50" />}
            {activeTab === "premium" && <Crown className="h-5 w-5 text-yellow-500/50" />}
            <p className="text-[10px] text-muted-foreground">
              No {activeTab === "exclusive" ? "Pro" : activeTab} tips available
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