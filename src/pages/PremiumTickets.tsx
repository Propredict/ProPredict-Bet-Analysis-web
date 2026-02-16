import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Ticket, Crown, RefreshCw, Target, BarChart3, TrendingUp, Sparkles, Lock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TicketCard from "@/components/dashboard/TicketCard";
import { PricingModal } from "@/components/PricingModal";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AdSlot from "@/components/ads/AdSlot";

export default function PremiumTickets() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    tickets,
    isLoading,
    refetch
  } = useTickets(false);
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
    const scrollToTicket = () => {
      const el = document.getElementById(`ticket-${highlightId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("push-highlight");
      setTimeout(() => el.classList.remove("push-highlight"), 4000);
    };
    setTimeout(scrollToTicket, 400);
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
  
  const premiumTickets = tickets.filter(ticket => ticket.tier === "premium" && ticket.ticket_date === todayBelgrade);
  const unlockedCount = premiumTickets.filter(ticket => canAccess("premium", "ticket", ticket.id)).length;
  const showUpgradeBanner = plan !== "premium";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchPlan()]);
      toast({
        title: "Data refreshed",
        description: "Premium AI Combos have been updated.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return <>
    <Helmet>
      <title>Premium AI Combos – ProPredict</title>
      <meta
        name="description"
        content="Premium AI-powered match combinations with highest confidence selections. For informational and entertainment purposes only."
      />
    </Helmet>
    <div className="section-gap">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-gradient-to-r from-fuchsia-500/20 via-pink-500/10 to-transparent border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.15)]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="p-1.5 rounded-md bg-fuchsia-500/20">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-sm text-fuchsia-400 sm:text-lg font-semibold">Premium AI Combos</h1>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">Highest value picks for subscribers</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Badge className="bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 text-[9px] sm:text-[10px] px-1.5 py-0.5">
            <Crown className="h-2.5 w-2.5 mr-0.5" />
            Premium
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing || isLoading}
            className="gap-0.5 h-6 sm:h-7 px-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Description */}
      <Card className="p-3 bg-gradient-to-r from-fuchsia-500/15 via-pink-500/10 to-transparent border-fuchsia-500/20">
        <p className="text-[10px] sm:text-xs text-foreground/80 leading-relaxed">
          Premium AI Combos feature exclusive, high-confidence match combinations created using advanced AI models and expert insights, available only to Premium users.
        </p>
      </Card>

      {/* Premium Unlock Banner - Above Stats */}
      {showUpgradeBanner && (
        <Card className="p-2 sm:p-3 bg-gradient-to-r from-fuchsia-500/20 via-purple-500/15 to-fuchsia-500/10 border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.1)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-fuchsia-500/20">
                <Lock className="h-4 w-4 text-fuchsia-400" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">Access Premium AI Predictions</h3>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Subscribe to view all premium AI combos</p>
              </div>
            </div>
            <Button size="sm" className="bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white font-medium border-0 gap-1 h-6 sm:h-7 text-[10px] sm:text-xs px-2" onClick={() => navigate("/get-premium")}>
              <Sparkles className="h-3 w-3" />
              Upgrade to Premium
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="p-1.5 sm:p-2 bg-card border-border">
          <div className="flex items-center gap-1.5">
            <div className="p-1 sm:p-1.5 rounded bg-primary/20">
              <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">85%</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Win Rate</p>
            </div>
          </div>
        </Card>
        <Card className="p-1.5 sm:p-2 bg-card border-border">
          <div className="flex items-center gap-1.5">
            <div className="p-1 sm:p-1.5 rounded bg-accent/20">
              <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">{premiumTickets.length}</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Total Predictions</p>
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
        {isLoading ? <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Loading tickets...</p>
            </div>
          </Card> : premiumTickets.length === 0 ? <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Ticket className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-warning mb-1">No premium AI combos available</p>
              <p className="text-sm">Check back later for new picks</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card> : premiumTickets.map((ticket, idx) => {
        const unlockMethod = getUnlockMethod("premium", "ticket", ticket.id);
        const isLocked = unlockMethod?.type !== "unlocked";
        const isUnlocking = unlockingId === ticket.id;
        const matchesToShow = isLocked ? (ticket.matches ?? []).slice(0, 3) : ticket.matches ?? [];
        return <React.Fragment key={ticket.id}>
          <div id={`ticket-${ticket.id}`}>
          <TicketCard ticket={{
          id: ticket.id,
          title: ticket.title,
          matchCount: ticket.matches?.length ?? 0,
          status: ticket.result ?? "pending",
          totalOdds: ticket.total_odds ?? 0,
          tier: ticket.tier,
          matches: matchesToShow.map(m => ({
            name: m.match_name,
            prediction: m.prediction,
            odds: m.odds
          })),
          createdAt: ticket.created_at_ts
        }} isLocked={isLocked} unlockMethod={unlockMethod} onUnlockClick={() => handleUnlock("ticket", ticket.id, "premium")} onViewTicket={() => navigate(`/tickets/${ticket.id}`)} isUnlocking={isUnlocking} />
          </div>
          {(idx + 1) % 5 === 0 && Math.floor((idx + 1) / 5) <= 2 && idx < premiumTickets.length - 1 && (
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
    <PricingModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} highlightPlan={upgradeHighlight} />
  </>;
}
