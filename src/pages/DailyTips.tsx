import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { Flame, RefreshCw, Target, BarChart3, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TipCard } from "@/components/dashboard/TipCard";
import { PricingModal } from "@/components/PricingModal";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { usePlatform } from "@/hooks/usePlatform";
import { toast } from "sonner";
import AdSlot from "@/components/ads/AdSlot";

export default function DailyTips() {
  const {
    tips,
    isLoading,
    refetch
  } = useTips(false);
  const {
    plan,
    canAccess,
    getUnlockMethod,
    refetch: refetchPlan
  } = useUserPlan();
  const {
    unlockingId,
    handleUnlock
  } = useUnlockHandler();
  const { isAndroidApp } = usePlatform();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const planRequired = searchParams.get("plan_required");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeHighlight, setUpgradeHighlight] = useState<"basic" | "premium" | undefined>();

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

  // Get today's date in Belgrade timezone (YYYY-MM-DD)
  const todayBelgrade = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Belgrade",
  });
  
  const dailyTips = tips.filter(tip => tip.tier === "daily" && tip.tip_date === todayBelgrade);
  const unlockedCount = dailyTips.filter(tip => canAccess("daily", "tip", tip.id)).length;

  const handleRefresh = () => {
    refetch();
    refetchPlan();
    toast.success("Tips refreshed");
  };

  // Render tips without ads
  const renderTips = () => {
    return dailyTips.map((tip, idx) => {
      const unlockMethod = getUnlockMethod("daily", "tip", tip.id);
      const isLocked = unlockMethod?.type !== "unlocked";
      const isUnlocking = unlockingId === tip.id;
      
      return (
        <React.Fragment key={tip.id}>
          <div id={`tip-${tip.id}`}>
          <TipCard
            tip={{
              id: tip.id,
              homeTeam: tip.home_team,
              awayTeam: tip.away_team,
              league: tip.league,
              prediction: tip.prediction,
              odds: tip.odds,
              confidence: tip.confidence ?? 0,
              kickoff: tip.created_at_ts ? new Date(tip.created_at_ts).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric"
              }) : "",
              tier: tip.tier,
              result: tip.result
            }}
            isLocked={isLocked} 
            unlockMethod={unlockMethod} 
            onUnlockClick={() => handleUnlock("tip", tip.id, "daily")} 
            isUnlocking={isUnlocking} 
          />
          </div>
          {(idx + 1) % 5 === 0 && Math.floor((idx + 1) / 5) <= 2 && idx < dailyTips.length - 1 && (
            <div className="col-span-full">
              <AdSlot />
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  return <>
    <Helmet>
      <title>Daily AI Picks – ProPredict</title>
      <meta
        name="description"
        content="Daily AI-powered sports predictions and match insights. Free analysis for informational and entertainment purposes."
      />
    </Helmet>
    <div className="section-gap">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-semibold text-primary">Daily AI Picks</h1>
            {isAndroidApp && (
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Watch ads to access predictions or go Premium for full access</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1.5 py-0.5">
            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
            Free
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-6 px-1.5 text-[9px]">
            <RefreshCw className="h-2.5 w-2.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Description */}
      <Card className="p-3 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border-primary/20">
        <p className="text-[10px] sm:text-xs text-foreground/80 leading-relaxed">
          Daily AI Picks provide carefully selected match predictions for today, based on form, statistics, and AI analysis. These picks are updated daily and are designed for quick insights into the most promising matches.
        </p>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-primary/20">
            <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">78%</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Win Rate</p>
          </div>
        </Card>
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-accent/20">
            <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">{dailyTips.length}</p>
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
        {isLoading ? (
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Loading tips...</p>
            </div>
          </Card>
        ) : dailyTips.length === 0 ? (
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Target className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-accent mb-1">No daily AI picks available</p>
              <p className="text-sm">Check back later for new predictions</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        ) : (
          renderTips()
        )}
      </div>

      {/* Compliance Disclaimer */}
      <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-4">
        These AI-generated predictions are for informational and entertainment purposes only. No betting or gambling services are provided.
      </p>
    </div>
    <PricingModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} highlightPlan={upgradeHighlight} />
  </>;
}