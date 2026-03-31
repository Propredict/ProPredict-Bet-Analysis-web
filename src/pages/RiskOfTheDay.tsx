import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Target, RefreshCw, BarChart3, TrendingUp, Crown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TipCard } from "@/components/dashboard/TipCard";
import { PricingModal } from "@/components/PricingModal";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { usePlatform } from "@/hooks/usePlatform";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AdSlot from "@/components/ads/AdSlot";

export default function RiskOfTheDay() {
  const navigate = useNavigate();
  const { tips, isLoading, refetch } = useTips(false);
  const { canAccess, getUnlockMethod, plan, isAdmin, refetch: refetchPlan } = useUserPlan();
  const { unlockingId, handleUnlock, handleSecondaryUnlock } = useUnlockHandler();
  const { isAndroidApp } = usePlatform();
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

  const riskTips = tips?.filter((t: any) => t.category === "risk_of_day") || [];
  const unlockedCount = riskTips.filter(tip => canAccess("exclusive", "tip", tip.id)).length;
  const showUpgradeBanner = !isAdmin && plan !== "premium";

  const handleRefresh = () => {
    refetch();
    refetchPlan();
    toast.success("Predictions refreshed");
  };

  return (
    <>
      <Helmet>
        <title>Risk of the Day 🎯 | ProPredict</title>
        <meta name="description" content="Daily high-risk, high-reward football predictions. Bold picks with maximum payout potential." />
      </Helmet>
      <div className="section-gap">
        {/* Header */}
        <div className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-gradient-to-r from-red-500/20 via-orange-500/10 to-transparent border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-md bg-red-500/20">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-sm text-red-400 font-semibold sm:text-lg">🎯 Risk of the Day</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                {isAndroidApp ? "Watch ads to access predictions or upgrade to Premium" : "High-risk, high-reward bold picks"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px] px-1.5 py-0.5">
              🔥 Pro
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="h-6 px-1.5 text-[9px]">
              <RefreshCw className="h-2.5 w-2.5 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Upgrade Banner */}
        {showUpgradeBanner && (
          <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-500/20">
                  <Crown className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[10px] sm:text-xs text-amber-400">Remove Ads & Access Pro AI Predictions</h3>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Subscribe for $3.99/month</p>
                </div>
              </div>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold border-0 h-6 sm:h-7 px-2 text-[9px] sm:text-[10px]" onClick={() => navigate("/get-premium")}>
                Subscribe Now
              </Button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
            <div className="p-1 sm:p-1.5 rounded bg-primary/20">
              <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">{riskTips.length}</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Risky Picks</p>
            </div>
          </Card>
          <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
            <div className="p-1 sm:p-1.5 rounded bg-accent/20">
              <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">5x+</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Avg Odds</p>
            </div>
          </Card>
          <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
            <div className="p-1 sm:p-1.5 rounded bg-primary/20">
              <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
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
                <p>Loading risky picks...</p>
              </div>
            </Card>
          ) : riskTips.length === 0 ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Target className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-warning mb-1">No risky picks available</p>
                <p className="text-sm">Check back later for bold predictions</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : (
            riskTips.map((tip, idx) => {
              const unlockMethod = getUnlockMethod("exclusive", "tip", tip.id);
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
                        kickoff: tip.created_at_ts
                          ? new Date(tip.created_at_ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                          : "",
                        tier: tip.tier,
                        result: tip.result,
                      }}
                      isLocked={isLocked}
                      unlockMethod={unlockMethod}
                      onUnlockClick={() => handleUnlock("tip", tip.id, "exclusive")}
                      onSecondaryUnlock={handleSecondaryUnlock}
                      isUnlocking={isUnlocking}
                    />
                  </div>
                  {(idx + 1) % 5 === 0 && Math.floor((idx + 1) / 5) <= 2 && idx < riskTips.length - 1 && (
                    <AdSlot className="col-span-full" />
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

        <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-4">
          These AI-generated predictions are for informational and entertainment purposes only. No gambling services are provided.
        </p>
      </div>
      <PricingModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} highlightPlan={upgradeHighlight} />
    </>
  );
}
