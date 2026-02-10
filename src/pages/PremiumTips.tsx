import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Crown, RefreshCw, Target, BarChart3, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TipCard } from "@/components/dashboard/TipCard";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AdSlot from "@/components/ads/AdSlot";

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
  
  // Get today's date in Belgrade timezone (YYYY-MM-DD)
  const todayBelgrade = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Belgrade",
  });
  
  const premiumTips = tips.filter(tip => tip.tier === "premium" && tip.tip_date === todayBelgrade);
  const unlockedCount = premiumTips.filter(tip => canAccess("premium", "tip", tip.id)).length;
  const showUpgradeBanner = plan !== "premium";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchPlan()]);
      toast({
        title: "Data refreshed",
        description: "Premium AI Picks have been updated.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return <>
    <Helmet>
      <title>Premium AI Picks – ProPredict</title>
      <meta
        name="description"
        content="Premium AI-powered sports predictions with highest confidence analysis. For entertainment and informational purposes only."
      />
    </Helmet>
    <div className="section-gap">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-gradient-to-r from-fuchsia-500/20 via-pink-500/10 to-transparent border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.15)]">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-md bg-fuchsia-500/20">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-sm text-fuchsia-400 font-semibold sm:text-lg">Premium AI Picks</h1>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">Our highest-confidence AI predictions</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge className="bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 text-[9px] px-1.5 py-0.5">
            <Crown className="h-2.5 w-2.5 mr-0.5" />
            Premium
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing || isLoading}
            className="h-6 px-1.5 text-[9px]"
          >
            <RefreshCw className={`h-2.5 w-2.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Description */}
      <Card className="p-3 bg-gradient-to-r from-fuchsia-500/15 via-pink-500/10 to-transparent border-fuchsia-500/20">
        <p className="text-[10px] sm:text-xs text-foreground/80 leading-relaxed">
          Premium AI Picks represent our highest-confidence predictions, combining AI models, in-depth match analysis, and expert insights. These picks are limited and carefully selected for maximum quality.
        </p>
      </Card>

      {/* Premium Upgrade Banner */}
      {showUpgradeBanner && <Card className="p-3 sm:p-4 bg-gradient-to-r from-fuchsia-500/20 via-purple-500/15 to-fuchsia-500/10 border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.1)]">
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
            <div className="p-2 sm:p-3 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-pink-500/30">
              <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-fuchsia-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Access Premium AI Predictions</h2>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                Access our highest-confidence AI predictions
              </p>
            </div>
            <div className="flex items-center gap-3 text-[9px] sm:text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Sparkles className="h-3 w-3 text-fuchsia-400" />
                Highest confidence
              </span>
              <span className="flex items-center gap-0.5">
                <Sparkles className="h-3 w-3 text-fuchsia-400" />
                No ads
              </span>
            </div>
            <Button className="bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0 h-7 px-4 text-[10px] sm:text-xs" onClick={() => navigate("/get-premium")}>
              Upgrade to Premium – €5.99/month
            </Button>
          </div>
        </Card>}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-primary/20">
            <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">85%</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Win Rate</p>
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
              <p className="text-warning mb-1">No premium AI picks available</p>
              <p className="text-sm">Check back later for new predictions</p>
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
          <TipCard tip={{
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
        }} isLocked={isLocked} unlockMethod={unlockMethod} onUnlockClick={() => handleUnlock("tip", tip.id, "premium")} isUnlocking={isUnlocking} />
          {(idx + 1) % 5 === 0 && Math.floor((idx + 1) / 5) <= 2 && idx < premiumTips.length - 1 && (
            <div className="col-span-full">
              <AdSlot />
            </div>
          )}
        </React.Fragment>;
      })}
      </div>

      {/* Compliance Disclaimer */}
      <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-4">
        These AI-generated predictions are for informational and entertainment purposes only. No betting or gambling services are provided.
      </p>
    </div>
  </>;
}
