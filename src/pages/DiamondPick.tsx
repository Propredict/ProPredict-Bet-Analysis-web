import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Gem, RefreshCw, BarChart3, TrendingUp, Sparkles, Loader2 } from "lucide-react";
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

export default function DiamondPick() {
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

  const exclusiveTips = tips?.filter((t) => t.tier === "exclusive") || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success("Predictions refreshed!");
  };

  return (
    <>
      <Helmet>
        <title>Diamond Pick 💎 | ProPredict</title>
        <meta name="description" content="Hand-picked diamond football predictions. Our most confident, highest-quality daily selections." />
      </Helmet>

      <div className="space-y-4 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2 tracking-tight">
              💎 Diamond Pick
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Hand-picked gems • Our highest confidence selections
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
            <Gem className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{exclusiveTips.length}</p>
            <p className="text-[10px] text-muted-foreground">Diamond Picks</p>
          </Card>
          <Card className="p-3 text-center bg-card/50 border-border/50">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">90%+</p>
            <p className="text-[10px] text-muted-foreground">Confidence</p>
          </Card>
          <Card className="p-3 text-center bg-card/50 border-border/50">
            <BarChart3 className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">💎</p>
            <p className="text-[10px] text-muted-foreground">Top Quality</p>
          </Card>
        </div>

        <AdSlot slotId="diamond-top" className="my-2" />

        {/* Tips List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : exclusiveTips.length === 0 ? (
          <Card className="p-8 text-center">
            <Gem className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">No diamond picks today</h3>
            <p className="text-sm text-muted-foreground">Check back later for today's top selections.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {exclusiveTips.map((tip) => (
              <TipCard
                key={tip.id}
                tip={tip}
                canAccess={canAccess}
                unlockMethod={getUnlockMethod("exclusive")}
                onUnlock={() => handleUnlock(tip.id, "tip", "exclusive")}
                unlockProcessing={unlockProcessing}
              />
            ))}
          </div>
        )}

        <AdSlot slotId="diamond-bottom" className="my-2" />
      </div>

      <PricingModal open={showPricing} onOpenChange={setShowPricing} />
      <FreeUserUpsellModal />
    </>
  );
}
