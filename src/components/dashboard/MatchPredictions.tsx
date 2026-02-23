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
  const displayedTips = filteredTips.slice(0, 3);
  const hasMoreTips = filteredTips.length > 3;

  // Count only today's tips per tier
  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const todayTipCountByTier = (tierId: string) =>
    dbTips.filter((t: any) => t.tier === tierId && t.tip_date === todayDate).length;

  const tabs = [
    { id: "daily", label: "Daily", subtitle: "Free", icon: Sparkles },
    { id: "exclusive", label: "Exclusive", subtitle: "Higher Confidence", icon: Star },
    { id: "premium", label: "Premium", subtitle: "Members Only", icon: Crown }
  ];

  const getTabStyles = (tabId: string, isActive: boolean) => {
    const baseStyles = "relative py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-300 border";
    
    switch (tabId) {
      case "daily":
        return isActive 
          ? cn(baseStyles, "border-white/50 bg-white/15 shadow-[0_0_10px_rgba(255,255,255,0.15)]")
          : cn(baseStyles, "border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40");
      case "exclusive":
        return isActive 
          ? cn(baseStyles, "border-amber-500 bg-amber-500/15 shadow-[0_0_10px_rgba(245,158,11,0.2)]")
          : cn(baseStyles, "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50");
      case "premium":
        return isActive 
          ? cn(baseStyles, "border-fuchsia-500 bg-fuchsia-500/15 shadow-[0_0_10px_rgba(217,70,239,0.2)]")
          : cn(baseStyles, "border-fuchsia-500/30 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/50");
      default:
        return cn(baseStyles, "border-border");
    }
  };

  const getTextColor = (tabId: string) => {
    switch (tabId) {
      case "daily": return "text-white";
      case "exclusive": return "text-amber-400";
      case "premium": return "text-fuchsia-400";
      default: return "text-muted-foreground";
    }
  };

  const getSubtitleColor = (tabId: string) => {
    switch (tabId) {
      case "daily": return "text-white/60";
      case "exclusive": return "text-amber-400/70";
      case "premium": return "text-fuchsia-400/70";
      default: return "text-muted-foreground";
    }
  };

  const getCtaLabel = () => {
    switch (activeTab) {
      case "daily": return "See all Daily AI Predictions";
      case "exclusive": return "See all Pro AI Predictions";
      case "premium": return "See all Premium AI Predictions";
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
          <h2 className="text-sm font-semibold text-primary">Daily AI Predictions</h2>
          <p className="text-[9px] text-muted-foreground"></p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-lg bg-secondary/30">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const count = todayTipCountByTier(tab.id);
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
          <span className="text-primary font-medium">128</span> users unlocked predictions today
        </span>
      </div>

      {/* Tips Content - Limited to 4 */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : displayedTips.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedTips.map((tip) => {
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
            {activeTab === "daily" && <Sparkles className="h-5 w-5 text-primary/50" />}
            {activeTab === "exclusive" && <Star className="h-5 w-5 text-amber-500/50" />}
            {activeTab === "premium" && <Crown className="h-5 w-5 text-fuchsia-500/50" />}
            <p className="text-[10px] text-muted-foreground">
              No {activeTab === "exclusive" ? "Pro" : activeTab} predictions available
            </p>
          </div>
        </Card>
      )}

      {/* Centered See All CTA */}
      {filteredTips.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="default"
            className="px-8 group"
            onClick={() => navigate(TAB_ROUTES[activeTab])}
          >
            <span>{getCtaLabel()}</span>
            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      )}

      <PricingModal 
        open={showPricingModal} 
        onOpenChange={setShowPricingModal} 
        highlightPlan={highlightPlan} 
      />
    </section>
  );
}