import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Crown, RefreshCw, Target, BarChart3, TrendingUp, Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TipCard } from "@/components/dashboard/TipCard";
import { PricingModal } from "@/components/PricingModal";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AdSlot from "@/components/ads/AdSlot";
import { AffiliateBanner1xBet } from "@/components/dashboard/AffiliateBanner1xBet";
import { AffiliateBannerMelbet } from "@/components/dashboard/AffiliateBannerMelbet";
import { FreeUserUpsellModal } from "@/components/FreeUserUpsellModal";
import { formatKickoff, formatKickoffParts } from "@/lib/formatKickoff";

export default function PremiumTips() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    tips,
    isLoading,
    refetch
  } = useTips(false);
  const {
    canAccess,
    getUnlockMethod,
    plan,
    refetch: refetchPlan
  } = useUserPlan();
  const {
    unlockingId,
    handleUnlock
  } = useUnlockHandler();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const planRequired = searchParams.get("plan_required");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeHighlight, setUpgradeHighlight] = useState<"basic" | "premium" | undefined>();

  // Highlight scroll from push notification
  useEffect(() => {
    if (!highlightId) return;
    const scrollToTip = () => {
      const el = document.getElementById(`tip-${highlightId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("push-highlight");
      setTimeout(() => el.classList.remove("push-highlight"), 4000);
    };
    setTimeout(scrollToTip, 400);
  }, [highlightId]);

  // Plan required upgrade modal from push notification
  useEffect(() => {
    if (!planRequired) return;
    if (planRequired === "premium" && plan !== "premium") {
      setUpgradeHighlight("premium");
      setUpgradeModalOpen(true);
    } else if (planRequired === "pro" && plan === "free") {
      setUpgradeHighlight("basic");
      setUpgradeModalOpen(true);
    }
  }, [planRequired, plan]);

  // Get today's date in Belgrade timezone (YYYY-MM-DD)
  const todayBelgrade = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Belgrade",
  });
  
  const premiumTips = tips.filter(tip => tip.tier === "premium" && tip.tip_date === todayBelgrade && (!tip.category || tip.category === "standard" || (tip.category as string) === "ai_premium"));
  const unlockedCount = premiumTips.filter(tip => canAccess("premium", "tip", tip.id)).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchPlan()]);
      toast({
        title: "Data refreshed",
        description: "Premium Predictions have been updated.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return <>
    <FreeUserUpsellModal />
    <Helmet>
      <title>Access Premium Predictions – ProPredict</title>
      <meta
        name="description"
        content="Premium predictions with highest confidence analysis. For entertainment and informational purposes only."
      />
    </Helmet>
    <div className="section-gap">
      {/* Sponsored: Melbet affiliate banner at top */}
      <div className="mb-4">
        <AffiliateBannerMelbet />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-gradient-to-r from-fuchsia-500/20 via-pink-500/10 to-transparent border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.15)]">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-md bg-fuchsia-500/20">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-sm text-fuchsia-400 font-semibold sm:text-lg">Access Premium Predictions</h1>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">Subscribe to view all premium predictions</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            className="bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white font-medium border-0 gap-1 h-6 sm:h-7 text-[10px] sm:text-xs px-2"
            onClick={() => navigate("/get-premium")}
          >
            <Sparkles className="h-3 w-3" />
            Subscribe
          </Button>
        </div>
      </div>

      {/* Description */}
      <Card className="p-3 bg-gradient-to-r from-fuchsia-500/15 via-pink-500/10 to-transparent border-fuchsia-500/20">
        <p className="text-[10px] sm:text-xs text-foreground/80 leading-relaxed">
          Access Premium Predictions represent our highest-confidence predictions, combining advanced match analysis and expert insights. These predictions are limited and carefully selected for maximum quality.
        </p>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-primary/20">
            <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">85%</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Accuracy</p>
          </div>
        </Card>
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-accent/20">
            <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">{premiumTips.length}</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Total Predictions</p>
          </div>
        </Card>
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-primary/20">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">{unlockedCount}</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Available</p>
          </div>
        </Card>
      </div>

      {/* Tips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {isLoading ? <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Loading tips...</p>
            </div>
          </Card> : premiumTips.length === 0 ? <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Target className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-warning mb-1">Fresh Premium picks drop daily</p>
              <p className="text-sm">New Premium predictions are generated every morning at 7:00 AM CET.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card> : premiumTips.map((tip, idx) => {
        const unlockMethod = getUnlockMethod("premium", "tip", tip.id);
        const isLocked = unlockMethod?.type !== "unlocked";
        const isUnlocking = unlockingId === tip.id;
        return <React.Fragment key={tip.id}>
          <div id={`tip-${tip.id}`}>
          <TipCard tip={{
          id: tip.id,
          homeTeam: tip.home_team,
          awayTeam: tip.away_team,
          league: tip.league,
          prediction: tip.prediction,
          odds: tip.odds,
          confidence: tip.confidence ?? 0,
          kickoff: formatKickoff((tip as any).match_date, (tip as any).match_time, tip.created_at_ts), kickoffDate: formatKickoffParts((tip as any).match_date, (tip as any).match_time, tip.created_at_ts).date, kickoffTime: formatKickoffParts((tip as any).match_date, (tip as any).match_time, tip.created_at_ts).time,
          tier: tip.tier,
          result: tip.result,
          finalResult: (tip as any).final_result ?? null,
        }} isLocked={isLocked} unlockMethod={unlockMethod} onUnlockClick={() => handleUnlock("tip", tip.id, "premium")} isUnlocking={isUnlocking} />
          </div>
          {(idx + 1) % 5 === 0 && Math.floor((idx + 1) / 5) <= 2 && idx < premiumTips.length - 1 && (
              <AdSlot className="col-span-full" />
          )}
        </React.Fragment>;
      })}
      </div>

      {/* Compliance Disclaimer */}
      <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-4">
        These AI-generated predictions are for informational and entertainment purposes only. No gambling services are provided.
      </p>
      {/* Sponsored: 1xBet affiliate banner – web only */}
      <div className="mt-4">
        <AffiliateBanner1xBet />
      </div>

    </div>
    <PricingModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} highlightPlan={upgradeHighlight} />
  </>;
}
