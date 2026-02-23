import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Flame,
  Sparkles,
  Loader2,
  Calendar,
  Star,
  Crown,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TipCard } from "@/components/dashboard/TipCard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useTips } from "@/hooks/useTips";
import { useTipAccuracy } from "@/hooks/useTipAccuracy";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";

type TabType = "daily" | "exclusive" | "premium";

export default function BettingTips() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  
  const { tips = [], isLoading, refetch } = useTips(false);
  const { data: accuracyData = [] } = useTipAccuracy();

  const { canAccess, getUnlockMethod, refetch: refetchPlan } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();

  const handleRefresh = () => {
    refetch();
    refetchPlan();
    toast.success("AI Picks refreshed");
  };

  const dailyAccuracy =
    accuracyData.find((a) => a.tier === "daily")?.accuracy ?? 0;

  const unlockedCount = tips.filter((tip) =>
    canAccess(tip.tier, "tip", tip.id)
  ).length;

  const avgOdds =
    tips.length > 0
      ? (
          tips.reduce((sum, tip) => sum + tip.odds, 0) / tips.length
        ).toFixed(2)
      : "0.00";

  const dailyCount = tips.filter(t => t.tier === "daily").length;
  const exclusiveCount = tips.filter(t => t.tier === "exclusive").length;
  const premiumCount = tips.filter(t => t.tier === "premium").length;

  const filteredTips = tips.filter(tip => tip.tier === activeTab);
  const displayedTips = filteredTips.slice(0, 4);
  const hasMore = filteredTips.length > 4;

  const getFullPageRoute = (tab: TabType) => {
    switch (tab) {
      case "daily": return "/daily-tips";
      case "exclusive": return "/exclusive-tips";
      case "premium": return "/premium-tips";
    }
  };

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case "daily": return "Daily";
      case "exclusive": return "Pro";
      case "premium": return "Premium";
    }
  };

  const tabs = [
    { id: "daily" as TabType, label: "Daily", icon: Calendar, count: dailyCount },
    { id: "exclusive" as TabType, label: "Pro", icon: Star, count: exclusiveCount },
    { id: "premium" as TabType, label: "Premium", icon: Crown, count: premiumCount }
  ];

  const getTabStyles = (tabId: string, isActive: boolean) => {
    const baseStyles = "relative py-3 px-3 rounded-xl text-xs font-semibold transition-all duration-300 border-2 shadow-md";
    
    switch (tabId) {
      case "daily":
        return isActive 
          ? cn(baseStyles, "bg-gradient-to-br from-primary/25 via-primary/20 to-primary/25 border-primary/60 text-primary shadow-primary/25")
          : cn(baseStyles, "bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 border-primary/30 text-primary/70 hover:border-primary/50 hover:text-primary");
      case "exclusive":
        return isActive 
          ? cn(baseStyles, "bg-gradient-to-br from-amber-500/25 via-yellow-500/20 to-amber-500/25 border-amber-500/60 text-amber-400 shadow-amber-500/25")
          : cn(baseStyles, "bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10 border-amber-500/30 text-amber-400/70 hover:border-amber-500/50 hover:text-amber-400");
      case "premium":
        return isActive 
          ? cn(baseStyles, "bg-gradient-to-br from-fuchsia-500/25 via-pink-500/20 to-fuchsia-500/25 border-fuchsia-500/60 text-fuchsia-400 shadow-fuchsia-500/30")
          : cn(baseStyles, "bg-gradient-to-br from-fuchsia-500/10 via-pink-500/5 to-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400/70 hover:border-fuchsia-500/50 hover:text-fuchsia-400");
      default:
        return cn(baseStyles, "bg-card border-border text-muted-foreground");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-accent/20">
            <Target className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-semibold text-foreground">AI Picks</h1>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">AI-powered match predictions</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="bg-accent/20 text-accent border-accent/30 text-[9px] sm:text-[10px] px-2 py-0.5"
          >
            <Flame className="h-3 w-3 mr-1" />
            Hot Predictions
          </Badge>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div>
              <p className="font-bold text-sm">{dailyAccuracy}%</p>
              <p className="text-[10px] text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <div>
              <p className="font-bold text-sm">{avgOdds}</p>
              <p className="text-[10px] text-muted-foreground">Avg Value</p>
            </div>
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="font-bold text-sm">
                {unlockedCount}/{tips.length}
              </p>
              <p className="text-[10px] text-muted-foreground">Available</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          
          return (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={getTabStyles(tab.id, isActive)}
            >
              <div className="flex flex-col items-center gap-1">
                <tab.icon className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isActive && "scale-110 drop-shadow-lg"
                )} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-background/20" : "bg-muted/50"
                  )}>
                    {tab.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tips Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredTips.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {displayedTips.map((tip) => {
              const isLocked = !canAccess(tip.tier, "tip", tip.id);

              return (
                <TipCard
                  key={tip.id}
                  tip={{
                    id: tip.id,
                    homeTeam: tip.home_team,
                    awayTeam: tip.away_team,
                    league: tip.league,
                    prediction: tip.prediction,
                    odds: tip.odds,
                    confidence: tip.confidence ?? 75,
                    kickoff: tip.created_at_ts
                      ? new Date(tip.created_at_ts).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "TBD",
                    tier: tip.tier,
                    result: tip.result,
                  }}
                  isLocked={isLocked}
                  unlockMethod={getUnlockMethod(tip.tier, "tip", tip.id)}
                  isUnlocking={unlockingId === tip.id}
                  onUnlockClick={() =>
                    handleUnlock("tip", tip.id, tip.tier)
                  }
                />
              );
            })}
          </div>
          
          {hasMore && (
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => navigate(getFullPageRoute(activeTab))}
                className="gap-2"
              >
                See all {getTabLabel(activeTab)} AI Picks
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card className="empty-state-compact bg-card/50 border-border/50">
          <div className="flex flex-col items-center gap-2">
            {activeTab === "daily" && <Calendar className="h-6 w-6 text-primary/40" />}
            {activeTab === "exclusive" && <Star className="h-6 w-6 text-amber-400/40" />}
            {activeTab === "premium" && <Crown className="h-6 w-6 text-fuchsia-400/40" />}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">No {activeTab} AI Picks available</p>
              <p className="text-[10px] text-muted-foreground/70">Check back soon!</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
