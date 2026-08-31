import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Ticket, RefreshCw, Target, BarChart3, TrendingUp, Loader2 } from "lucide-react";
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
import { AffiliateBanner1xBet } from "@/components/dashboard/AffiliateBanner1xBet";
import { AffiliateBannerMelbet } from "@/components/dashboard/AffiliateBannerMelbet";


export default function DailyTickets() {
  const navigate = useNavigate();
  const {
    tickets,
    isLoading,
    refetch
  } = useTickets(false);
  const {
    plan,
    canAccess,
    getUnlockMethod,
    isAuthenticated,
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
    const scrollToTicket = () => {
      const el = document.getElementById(`ticket-${highlightId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("push-highlight");
      setTimeout(() => el.classList.remove("push-highlight"), 4000);
    };
    setTimeout(scrollToTicket, 400);
  }, [highlightId]);

  // Get today's date in Belgrade timezone (YYYY-MM-DD)
  const todayBelgrade = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Belgrade",
  });
  
  const dailyTickets = tickets.filter(ticket => ticket.tier === "daily" && (ticket.category as string) !== "sure_odds" && ticket.ticket_date === todayBelgrade);
  const unlockedCount = dailyTickets.filter(ticket => canAccess("daily", "ticket", ticket.id)).length;

  const handleRefresh = () => {
    refetch();
    refetchPlan();
    toast.success("AI Combos refreshed");
  };

  // Render tickets without ads
  const renderTickets = () => {
    return dailyTickets.map((ticket, idx) => {
      const unlockMethod = !isAuthenticated 
        ? { type: "login_required" as const, message: "Sign in to Unlock / Logiraj se i otključaj" }
        : getUnlockMethod("daily", "ticket", ticket.id);
      const isLocked = unlockMethod?.type !== "unlocked";
      const isUnlocking = unlockingId === ticket.id;
      
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
              matches: (ticket.matches ?? []).map(m => ({
                name: m.match_name,
                prediction: m.prediction,
                odds: m.odds
              })),
              createdAt: ticket.created_at_ts
            }} 
            isLocked={isLocked} 
            unlockMethod={unlockMethod} 
            onUnlockClick={() => !isAuthenticated ? navigate("/login") : handleUnlock("ticket", ticket.id, "daily")} 
            onViewTicket={() => navigate(`/tickets/${ticket.id}`)} 
            isUnlocking={isUnlocking} 
          />
          </div>
          {(idx + 1) % 5 === 0 && Math.floor((idx + 1) / 5) <= 2 && idx < dailyTickets.length - 1 && (
              <AdSlot className="col-span-full" />
          )}
        </React.Fragment>
      );
    });
  };

  return <>
    
    <Helmet>
      <title>Daily Ticket – ProPredict</title>
      <meta name="description" content="Daily AI-powered match combinations and analysis. For informational and entertainment purposes only." />
      <meta property="og:title" content="Daily Ticket – ProPredict" />
      <meta property="og:description" content="Daily AI-powered match combinations and analysis for football." />
      <meta property="og:image" content="https://propredict.me/og-image.png" />
      <meta property="og:url" content="https://propredict.me/daily-predictions" />
      <meta property="og:type" content="website" />
    </Helmet>
    <div className="section-gap">
      {/* Sponsored: Melbet affiliate banner at top */}
      <div className="mb-4">
        <AffiliateBannerMelbet />
      </div>

      {/* Header */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-background shadow-[0_0_20px_rgba(15,155,142,0.12)] overflow-hidden">
        <div className="p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/20 shrink-0">
              <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-semibold text-primary">Daily Ticket</h1>
              <p className="text-[10px] sm:text-xs text-foreground/80 leading-relaxed mt-1">
                AI-powered match combinations built from daily predictions, created for informational and analytical purposes only. Each combo is generated from AI analysis and match statistics.
              </p>
              {isAndroidApp && (
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1.5">Watch ads to access combos or upgrade to Premium</p>
              )}
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="p-1.5 sm:p-2 bg-card border-border">
          <div className="flex items-center gap-1.5">
            <div className="p-1 sm:p-1.5 rounded bg-primary/20">
              <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">75%</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Accuracy</p>
            </div>
          </div>
        </Card>
        <Card className="p-1.5 sm:p-2 bg-card border-border">
          <div className="flex items-center gap-1.5">
            <div className="p-1 sm:p-1.5 rounded bg-accent/20">
              <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">{dailyTickets.length}</p>
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
        {isLoading ? (
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Loading AI Combos...</p>
            </div>
          </Card>
        ) : dailyTickets.length === 0 ? (
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Ticket className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-primary mb-1">Today's Daily Ticket is being built</p>
              <p className="text-sm">A new Daily Ticket is generated every morning at 7:00 AM CET.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        ) : (
          renderTickets()
        )}
      </div>

      {/* Compliance Disclaimer */}
      <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-4">
        These AI-generated predictions are for informational and entertainment purposes only. No gambling services are provided.
      </p>
      {/* Sponsored: 1xBet affiliate banner – web only */}
      <div className="mt-4">
        <AffiliateBanner1xBet />
      </div>

    </div>
    <PricingModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} highlightPlan={upgradeHighlight} />
  </>;
}