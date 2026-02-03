import { Fragment } from "react";
import { Helmet } from "react-helmet-async";
import { Star, RefreshCw, Target, BarChart3, TrendingUp, Crown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TipCard } from "@/components/dashboard/TipCard";
import { SidebarAd, InContentAd } from "@/components/ads/EzoicAd";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ExclusiveTips() {
  const navigate = useNavigate();
  const {
    tips,
    isLoading,
    refetch
  } = useTips(false);
  const {
    canAccess,
    getUnlockMethod,
    plan,
    isAdmin,
    refetch: refetchPlan
  } = useUserPlan();
  const {
    unlockingId,
    handleUnlock,
    handleSecondaryUnlock
  } = useUnlockHandler();
  
  // Get today's date in Belgrade timezone (YYYY-MM-DD)
  const todayBelgrade = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Belgrade",
  });
  
  const exclusiveTips = tips.filter(tip => tip.tier === "exclusive" && tip.tip_date === todayBelgrade);
  const unlockedCount = exclusiveTips.filter(tip => canAccess("exclusive", "tip", tip.id)).length;
  const showUpgradeBanner = !isAdmin && plan !== "premium";

  const handleRefresh = () => {
    refetch();
    refetchPlan();
    toast.success("Tips refreshed");
  };

  return <>
    <Helmet>
      <title>Pro Tips – ProPredict</title>
      <meta
        name="description"
        content="Pro-level AI sports tips with higher confidence predictions. For entertainment and informational purposes only."
      />
    </Helmet>
    <div className="section-gap">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-md bg-amber-500/20">
            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xs font-semibold sm:text-lg text-amber-400">Exclusive Tips</h1>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Unlock tips by watching ads or go Premium for exclusive access</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0.5">
            <Star className="h-2.5 w-2.5 mr-0.5" />
            Pro
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-6 px-1.5 text-[9px]">
            <RefreshCw className="h-2.5 w-2.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Upgrade Banner */}
      {showUpgradeBanner && <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/20">
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[10px] sm:text-xs text-amber-400">Remove Ads & Unlock All Tips</h3>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Subscribe for $3.99/month</p>
              </div>
            </div>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold border-0 h-6 sm:h-7 px-2 text-[9px] sm:text-[10px]" onClick={() => navigate("/get-premium")}>
              Subscribe Now
            </Button>
          </div>
        </div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-primary/20">
            <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">82%</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Win Rate</p>
          </div>
        </Card>
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-accent/20">
            <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">{exclusiveTips.length}</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Total Tips</p>
          </div>
        </Card>
        <Card className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-card border-border rounded-md">
          <div className="p-1 sm:p-1.5 rounded bg-primary/20">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-foreground">{unlockedCount}</p>
            <p className="text-[8px] sm:text-[9px] text-muted-foreground">Unlocked</p>
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
        ) : exclusiveTips.length === 0 ? (
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Target className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-primary mb-1">No pro tips available</p>
              <p className="text-sm">Check back later for new predictions</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        ) : (
          exclusiveTips.map((tip, index) => {
            const unlockMethod = getUnlockMethod("exclusive", "tip", tip.id);
            const isLocked = unlockMethod?.type !== "unlocked";
            const isUnlocking = unlockingId === tip.id;
            // Show ads after every 3rd card
            const showAdAfter = (index + 1) % 3 === 0 && index < exclusiveTips.length - 1;
            return (
              <Fragment key={tip.id}>
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
                  onUnlockClick={() => handleUnlock("tip", tip.id, "exclusive")}
                  onSecondaryUnlock={handleSecondaryUnlock}
                  isUnlocking={isUnlocking} 
                />
                {showAdAfter && <InContentAd />}
              </Fragment>
            );
          })
        )}
      </div>
      
      {/* Sidebar Ad */}
      <SidebarAd className="mt-4" />
    </div>
  </>;
}
