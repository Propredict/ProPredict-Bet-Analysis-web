import { useState, Fragment } from "react";
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
import { InlineListAd } from "@/components/ads/EzoicAd";

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
    result: dbTip.result as Tip["result"]
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
    { id: "daily", label: "Daily", subtitle: "Free", icon: Sparkles },
    { id: "exclusive", label: "Exclusive", subtitle: "Higher Confidence", icon: Star },
    { id: "premium", label: "Premium", subtitle: "Members Only", icon: Crown }
  ];

  const getTabStyles = (tabId: string, isActive: boolean) => {
    const baseStyles = "relative py-2.5 px-4 rounded-lg text-xs font-semibold transition-all duration-300 border-l-2 bg-card/50";
    
    switch (tabId) {
      case "daily":
        return isActive 
          ? cn(baseStyles, "border-l-primary bg-primary/10")
          : cn(baseStyles, "border-l-transparent hover:bg-primary/5");
      case "exclusive":
        return isActive 
          ? cn(baseStyles, "border-l-amber-500 bg-amber-500/10")
          : cn(baseStyles, "border-l-transparent hover:bg-amber-500/5");
      case "premium":
        return isActive 
          ? cn(baseStyles, "border-l-fuchsia-500 bg-fuchsia-500/10")
          : cn(baseStyles, "border-l-transparent hover:bg-fuchsia-500/5");
      default:
        return cn(baseStyles, "border-l-transparent");
    }
  };

  const getTextColor = (tabId: string) => {
    switch (tabId) {
      case "daily": return "text-primary";
      case "exclusive": return "text-amber-400";
      case "premium": return "text-fuchsia-400";
      default: return "text-muted-foreground";
    }
  };

  const getSubtitleColor = (tabId: string) => {
    switch (tabId) {
      case "daily": return "text-muted-foreground";
      case "exclusive": return "text-amber-400/70";
      case "premium": return "text-fuchsia-400/70";
      default: return "text-muted-foreground";
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
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
        <div className="p-1.5 rounded-md bg-primary/20">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-primary">Daily Tips</h2>
          <p className="text-[9px] text-muted-foreground">Unlock tips by watching ads or go Premium for exclusive access</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-lg bg-secondary/30">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const count = tips.filter(t => t.tier === tab.id).length;
          const textColor = getTextColor(tab.id);
          const subtitleColor = getSubtitleColor(tab.id);
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={getTabStyles(tab.id, isActive)}
            >
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1.5">
                  <tab.icon className={cn("h-3.5 w-3.5", textColor)} />
                  <span className={cn("font-semibold", textColor)}>{tab.label}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50",
                    textColor
                  )}>
                    {count}
                  </span>
                </div>
                <span className={cn("text-[9px]", subtitleColor)}>{tab.subtitle}</span>
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
          {displayedTips.map((tip, index) => {
            const isLocked = !canAccess(tip.tier, "tip", tip.id);
            const unlockMethod = getUnlockMethod(tip.tier, "tip", tip.id);
            // Show ads after every 3rd card for Daily & Pro tabs only (not Premium)
            const showAdAfter = activeTab !== "premium" && (index + 1) % 3 === 0 && index < displayedTips.length - 1;
            return (
              <Fragment key={tip.id}>
                <TipCard
                  tip={tip}
                  isLocked={isLocked}
                  unlockMethod={unlockMethod}
                  isUnlocking={unlockingId === tip.id}
                  onUnlockClick={() => handleUnlock("tip", tip.id, tip.tier)}
                />
                {showAdAfter && <InlineListAd />}
              </Fragment>
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
            {activeTab === "daily" && <Sparkles className="h-5 w-5 text-primary/50" />}
            {activeTab === "exclusive" && <Star className="h-5 w-5 text-amber-500/50" />}
            {activeTab === "premium" && <Crown className="h-5 w-5 text-fuchsia-500/50" />}
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