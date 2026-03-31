import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Target, RefreshCw, BarChart3, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TipCard } from "@/components/dashboard/TipCard";
import { PricingModal } from "@/components/PricingModal";
import { useTips } from "@/hooks/useTips";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AdSlot from "@/components/ads/AdSlot";
import { FreeUserUpsellModal } from "@/components/FreeUserUpsellModal";

export default function RiskOfTheDay() {
  const { tips, isLoading, refetch } = useTips(false);
  const { plan, canAccess, getUnlockMethod, refetch: refetchPlan } = useUserPlan();
  const { handleUnlock, isProcessing: unlockProcessing } = useUnlockHandler({ onSuccess: refetchPlan });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("unlocked") === "true") {
      refetchPlan();
      refetch();
      toast.success("Content unlocked!");
    }
  }, [searchParams]);

  const premiumTips = tips?.filter((t) => t.tier === "premium") || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success("Predictions refreshed!");
  };

  return (
    <>
      <Helmet>
        <title>Risk of the Day 🎯 | ProPredict</title>
        <meta name="description" content="Daily high-risk, high-reward football predictions. Bold picks with maximum payout potential." />
      </Helmet>

      <div className="space-y-4 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2 tracking-tight">
              🎯 Risk of the Day
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              High-risk, high-reward picks • Bold predictions daily
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center bg-card/50 border-border/50">
            <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{premiumTips.length}</p>
            <p className="text-[10px] text-muted-foreground">Risky Picks</p>
          </Card>
          <Card className="p-3 text-center bg-card/50 border-border/50">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">5x+</p>
            <p className="text-[10px] text-muted-foreground">Avg Odds</p>
          </Card>
          <Card className="p-3 text-center bg-card/50 border-border/50">
            <BarChart3 className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">🔥</p>
            <p className="text-[10px] text-muted-foreground">High Reward</p>
          </Card>
        </div>

        <AdSlot slotId="risk-top" className="my-2" />

        {/* Tips List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : premiumTips.length === 0 ? (
          <Card className="p-8 text-center">
            <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">No risky picks today</h3>
            <p className="text-sm text-muted-foreground">Check back later for today's bold predictions.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {premiumTips.map((tip) => (
              <TipCard
                key={tip.id}
                tip={tip}
                canAccess={canAccess}
                unlockMethod={getUnlockMethod("premium")}
                onUnlock={() => handleUnlock(tip.id, "tip", "premium")}
                unlockProcessing={unlockProcessing}
              />
            ))}
          </div>
        )}

        <AdSlot slotId="risk-bottom" className="my-2" />
      </div>

      <PricingModal open={showPricing} onOpenChange={setShowPricing} />
      <FreeUserUpsellModal />
    </>
  );
}
