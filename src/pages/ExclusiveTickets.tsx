import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Ticket, Star, RefreshCw, Target, BarChart3, TrendingUp, Loader2 } from "lucide-react";
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
import { AffiliateBanner1xBet } from "@/components/dashboard/AffiliateBanner1xBet";
import { AffiliateBannerMelbet } from "@/components/dashboard/AffiliateBannerMelbet";
import { useDailyTicketUnlock, SURE_ODDS_PRICE_LABEL } from "@/hooks/useDailyTicketUnlock";


export default function ExclusiveTickets() {
  const navigate = useNavigate();
  const {
    tickets,
    isLoading,
    refetch
  } = useTickets(false);
  const {
    getUnlockMethod,
    plan,
    isAdmin,
    refetch: refetchPlan
  } = useUserPlan();
  const {
    unlockingId
  } = useUnlockHandler();
  const { isAndroidApp } = usePlatform();
  const { hasTodayUnlock, refetch: refetchUnlock } = useDailyTicketUnlock();

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
  
  const exclusiveTickets = tickets.filter(ticket =>
    ticket.ticket_date === todayBelgrade &&
    (
      // Manually-curated Sure Odds 2+ tickets (any tier)
      (ticket.category as string) === "sure_odds"
      // Manually-curated Pro/Exclusive tickets
      || (ticket.tier === "exclusive" && (!ticket.category || ticket.category === "standard"))
      // Auto-generated AI Pro combos (only Pro AI predictions, no Premium)
      || (ticket.category as string) === "ai_pro"
    )
  );
  const hasTicketAccess = isAdmin || plan === "premium" || hasTodayUnlock;
  const unlockedCount = hasTicketAccess ? exclusiveTickets.length : 0;
  const showUpgradeBanner = !isAdmin && plan !== "premium";

  const handleBuyDailyTicket = () => {
    if (isAndroidApp && window.Android?.purchaseDailyTicket) {
      window.Android.purchaseDailyTicket();
      toast.info("Opening purchase…");
      setTimeout(() => refetchUnlock(), 4000);
      setTimeout(() => refetchUnlock(), 10000);
      return;
    }
    toast.info("Sure Odds 2+ daily ticket is available in the ProPredict app.");
    navigate("/get-premium");
  };


  const handleRefresh = () => {
    refetch();
    refetchPlan();
    refetchUnlock();
    toast.success("Predictions refreshed");
  };


  return <>
    <Helmet>
      <title>Sure Odds 2+ – ProPredict</title>
      <meta name="description" content="Sure Odds 2+ daily ticket with higher confidence AI selections. For informational and entertainment purposes only." />
      <meta property="og:title" content="Sure Odds 2+ – ProPredict" />
      <meta property="og:description" content="Daily ticket with higher confidence AI selections." />
      <meta property="og:image" content="https://propredict.me/og-image.png" />
      <meta property="og:url" content="https://propredict.me/pro-predictions" />
      <meta property="og:type" content="website" />
    </Helmet>
    <div className="section-gap">
      {/* Sponsored: Melbet affiliate banner at top */}
      <div className="mb-4">
        <AffiliateBannerMelbet />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/20">
            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold sm:text-lg text-amber-400">Sure Odds 2+</h1>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
              Today's high-confidence ticket with 2.00+ total odds
            </p>
          </div>
        </div>
        {hasTicketAccess ? (
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] sm:text-[10px] px-1.5 py-0.5">
            Unlocked today
          </Badge>
        ) : (
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold border-0 h-8 px-3 text-[11px] sm:text-xs"
            onClick={handleBuyDailyTicket}
          >
            Unlock Today's Ticket – {SURE_ODDS_PRICE_LABEL}
          </Button>
        )}
      </div>

      {/* Description */}
      <Card className="p-3 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border-amber-500/20">
        <p className="text-[10px] sm:text-xs text-foreground/80 leading-relaxed">
          Sure Odds 2+ is a one-time daily purchase. Unlock today's ticket for {SURE_ODDS_PRICE_LABEL} and it stays open until midnight (Europe/Belgrade). Premium members get it included at no extra cost.
        </p>
      </Card>



      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="p-1.5 sm:p-2 bg-card border-border">
          <div className="flex items-center gap-1.5">
            <div className="p-1 sm:p-1.5 rounded bg-primary/20">
              <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">80%</p>
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
              <p className="text-sm sm:text-base font-bold text-foreground">{exclusiveTickets.length}</p>
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
              <p>Loading predictions...</p>
            </div>
          </Card>
        ) : exclusiveTickets.length === 0 ? (
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Ticket className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-primary mb-1">No Sure Odds 2+ ticket available</p>
              <p className="text-sm">Check back later for new predictions</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        ) : (
          exclusiveTickets.map((ticket, idx) => {
            const unlockMethod = getUnlockMethod("exclusive", "ticket", ticket.id);
            const isLocked = !hasTicketAccess;
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
                  hideLockedMatches={isLocked}
                  customLockedCTA={
                    isLocked ? (
                      <Button
                        size="sm"
                        className="w-full gap-1.5 h-9 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black border-0"
                        onClick={(e) => { e.stopPropagation(); handleBuyDailyTicket(); }}
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        Buy for {SURE_ODDS_PRICE_LABEL}
                      </Button>
                    ) : undefined
                  }
                  unlockMethod={unlockMethod} 
                  onUnlockClick={handleBuyDailyTicket}
                  onViewTicket={() => navigate(`/tickets/${ticket.id}`)} 
                  isUnlocking={isUnlocking} 
                />
                </div>
                {(idx + 1) % 5 === 0 && Math.floor((idx + 1) / 5) <= 2 && idx < exclusiveTickets.length - 1 && (
                    <AdSlot className="col-span-full" />
                )}
              </React.Fragment>
            );
          })
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
