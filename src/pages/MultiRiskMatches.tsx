import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Target, RefreshCw, BarChart3, TrendingUp, Loader2, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TicketCard from "@/components/dashboard/TicketCard";
import { PricingModal } from "@/components/PricingModal";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AdSlot from "@/components/ads/AdSlot";

export default function MultiRiskMatches() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { tickets, isLoading, refetch } = useTickets(false);
  const { canAccess, getUnlockMethod, plan, refetch: refetchPlan } = useUserPlan();
  const { handleUnlock, isProcessing: unlockProcessing } = useUnlockHandler({ onSuccess: refetchPlan });
  const [showPricing, setShowPricing] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("unlocked") === "true") {
      refetchPlan();
      refetch();
      toast({ title: "Content unlocked!" });
    }
  }, [searchParams]);

  const premiumTickets = tickets?.filter((t) => t.tier === "premium") || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({ title: "Tickets refreshed!" });
  };

  return (
    <>
      <Helmet>
        <title>Multi Risk Matches 🎯 | ProPredict</title>
        <meta name="description" content="High-risk multi-match combo tickets. Bold accumulators with maximum payout potential." />
      </Helmet>

      <div className="space-y-4 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2 tracking-tight">
              🎯 Multi Risk Matches
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              High-risk multi-match combos • Maximum payout potential
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
            <p className="text-lg font-bold">{premiumTickets.length}</p>
            <p className="text-[10px] text-muted-foreground">Risk Combos</p>
          </Card>
          <Card className="p-3 text-center bg-card/50 border-border/50">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">10x+</p>
            <p className="text-[10px] text-muted-foreground">Avg Odds</p>
          </Card>
          <Card className="p-3 text-center bg-card/50 border-border/50">
            <BarChart3 className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">🔥</p>
            <p className="text-[10px] text-muted-foreground">High Reward</p>
          </Card>
        </div>

        <AdSlot slotId="multi-risk-top" className="my-2" />

        {/* Tickets List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : premiumTickets.length === 0 ? (
          <Card className="p-8 text-center">
            <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">No risk combos today</h3>
            <p className="text-sm text-muted-foreground">Check back later for today's bold multi-match picks.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {premiumTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                canAccess={canAccess}
                unlockMethod={getUnlockMethod("premium")}
                onUnlock={() => handleUnlock(ticket.id, "ticket", "premium")}
                unlockProcessing={unlockProcessing}
              />
            ))}
          </div>
        )}

        <AdSlot slotId="multi-risk-bottom" className="my-2" />
      </div>

      <PricingModal open={showPricing} onOpenChange={setShowPricing} />
    </>
  );
}
