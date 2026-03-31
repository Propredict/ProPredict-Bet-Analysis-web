import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Target, RefreshCw, BarChart3, TrendingUp, Loader2, Ticket, Crown, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TicketCard from "@/components/dashboard/TicketCard";
import { PricingModal } from "@/components/PricingModal";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { usePlatform } from "@/hooks/usePlatform";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AdSlot from "@/components/ads/AdSlot";

export default function MultiRiskMatches() {
  const navigate = useNavigate();
  const { tickets, isLoading, refetch } = useTickets(false);
  const { canAccess, getUnlockMethod, plan, isAdmin, refetch: refetchPlan } = useUserPlan();
  const { unlockingId, handleUnlock, handleSecondaryUnlock } = useUnlockHandler();
  const { isAndroidApp } = usePlatform();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const planRequired = searchParams.get("plan_required");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeHighlight, setUpgradeHighlight] = useState<"basic" | "premium" | undefined>();

  useEffect(() => {
    if (!highlightId) return;
    const scrollToTicket = () => {
      const el = document.getElementById(`ticket-${highlightId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("push-highlight");
      setTimeout(() => el.classList.remove("push-highlight"), 4000);
    };
    setTimeout(scrollToTicket, 400);
  }, [highlightId]);

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

  const multiRiskTickets = tickets?.filter((t: any) => t.category === "multi_risk") || [];
  const unlockedCount = multiRiskTickets.filter(ticket => canAccess("exclusive", "ticket", ticket.id)).length;
  const showUpgradeBanner = !isAdmin && plan !== "premium";

  const handleRefresh = () => {
    refetch();
    refetchPlan();
    toast.success("Predictions refreshed");
  };

  return (
    <>
      <Helmet>
        <title>Multi Risk Matches 🎯 | ProPredict</title>
        <meta name="description" content="High-risk multi-match combo tickets. Bold accumulators with maximum payout potential." />
      </Helmet>
      <div className="section-gap">
        {/* Header */}
        <div className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-gradient-to-r from-orange-500/20 via-red-500/10 to-transparent border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="p-1.5 rounded-md bg-orange-500/20">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-sm text-orange-400 sm:text-lg font-semibold">🎯 Multi Risk Matches</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                {isAndroidApp ? "Watch ads to access combos or upgrade to Premium" : "High-risk multi-match combos • Pro access"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] sm:text-[10px] px-1.5 py-0.5">
              <Star className="h-2.5 w-2.5 mr-0.5" />
              Pro
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-0.5 h-6 sm:h-7 px-1.5">
              <RefreshCw className="h-3 w-3" />
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
          <Card className="p-1.5 sm:p-2 bg-card border-border">
            <div className="flex items-center gap-1.5">
              <div className="p-1 sm:p-1.5 rounded bg-primary/20">
                <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-foreground">{multiRiskTickets.length}</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Risk Combos</p>
              </div>
            </div>
          </Card>
          <Card className="p-1.5 sm:p-2 bg-card border-border">
            <div className="flex items-center gap-1.5">
              <div className="p-1 sm:p-1.5 rounded bg-accent/20">
                <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-foreground">10x+</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Avg Odds</p>
              </div>
            </div>
          </Card>
          <Card className="p-1.5 sm:p-2 bg-card border-border">
            <div className="flex items-center gap-1.5">
              <div className="p-1 sm:p-1.5 rounded bg-primary/20">
                <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-foreground">{unlockedCount}</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Available</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {isLoading ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading risk combos...</p>
              </div>
            </Card>
          ) : multiRiskTickets.length === 0 ? (
            <Card className="p-8 bg-card border-border">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Ticket className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-primary mb-1">No Multi Risk Matches available</p>
                <p className="text-sm">Check back later for bold multi-match picks</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : (
            multiRiskTickets.map((ticket, idx) => {
              const unlockMethod = getUnlockMethod("exclusive", "ticket", ticket.id);
              const isLocked = unlockMethod?.type !== "unlocked";
              const isUnlocking = unlockingId === ticket.id;
              const matchesToShow = isLocked ? (ticket.matches ?? []).slice(0, 3) : ticket.matches ?? [];
              return (
                <React.Fragment key={ticket.id}>
                  <div id={`ticket-${ticket.id}`}>
                    <TicketCard
                      ticket={{
                        id: ticket.id,
                        title: ticket.title,
                        matchCount: ticket.matches?.length ?? 0,
                        status: ticket.result ?? "pending",
                        totalOdds: ticket.total_odds ?? 0,
                        tier: ticket.tier,
                        matches: matchesToShow.map(m => ({
                          name: m.match_name,
                          prediction: m.prediction,
                          odds: m.odds,
                        })),
                        createdAt: ticket.created_at_ts,
                      }}
                      isLocked={isLocked}
                      unlockMethod={unlockMethod}
                      onUnlockClick={() => handleUnlock("ticket", ticket.id, "exclusive")}
                      onSecondaryUnlock={handleSecondaryUnlock}
                      onViewTicket={() => navigate(`/tickets/${ticket.id}`)}
                      isUnlocking={isUnlocking}
                    />
                  </div>
                  {(idx + 1) % 5 === 0 && Math.floor((idx + 1) / 5) <= 2 && idx < multiRiskTickets.length - 1 && (
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
