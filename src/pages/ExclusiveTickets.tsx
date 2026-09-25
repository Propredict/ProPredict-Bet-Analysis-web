import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Ticket, Star, RefreshCw, Target, BarChart3, TrendingUp, Loader2, Crown, ShieldCheck, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TicketCard from "@/components/dashboard/TicketCard";
import { SureOddsPromoCard } from "@/components/dashboard/SureOddsPromoCard";
import { PricingModal } from "@/components/PricingModal";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { startSureOddsPurchase } from "@/lib/sureOddsPurchase";
import { trackSureOddsEvent } from "@/lib/sureOddsAnalytics";
import AdSlot from "@/components/ads/AdSlot";
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

  // Returning from Stripe one-time checkout → poll for the webhook unlock
  useEffect(() => {
    if (searchParams.get("payment") !== "success") return;
    toast.success("Payment received — unlocking today's ticket…");
    const timers = [1500, 4000, 8000, 15000].map((ms) =>
      setTimeout(() => refetchUnlock(), ms)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


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
  
  const exclusiveTickets = tickets
    .filter(ticket =>
      ticket.ticket_date === todayBelgrade &&
      (
        // Manually-curated Sure Odds 2+ tickets (any tier)
        (ticket.category as string) === "sure_odds"
        // Manually-curated Pro/Exclusive tickets
        || (ticket.tier === "exclusive" && (!ticket.category || ticket.category === "standard"))
        // Auto-generated Sure Odds 2+ combos (only Sure Odds AI predictions, no Premium)
        || (ticket.category as string) === "ai_pro"
      )
    )
    // Only one Sure Odds ticket is on offer per day (newest one)
    .sort((a, b) => new Date(b.created_at_ts).getTime() - new Date(a.created_at_ts).getTime())
    .slice(0, 1);

  const hasTicketAccess = isAdmin || plan === "premium" || hasTodayUnlock;
  const unlockedCount = hasTicketAccess ? exclusiveTickets.length : 0;

  const handleBuyDailyTicket = () => {
    void trackSureOddsEvent("cta_click", "sure_odds_page");
    startSureOddsPurchase(() => {
      setTimeout(() => refetchUnlock(), 4000);
      setTimeout(() => refetchUnlock(), 10000);
    }, "sure_odds_page");
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
      <meta property="og:url" content="https://propredict.me/sure-odds" />
      <meta property="og:type" content="website" />
    </Helmet>
    <div className="section-gap">
      {/* Sponsored: Betway affiliate banner at top */}
      <div className="mb-4">
      </div>

      <section className="overflow-hidden rounded-2xl border border-primary/20 bg-secondary/70 shadow-lg shadow-primary/10">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary via-blue-600 to-sidebar px-4 py-5 sm:px-6 sm:py-7">
          <div className="pointer-events-none absolute -right-10 -top-20 h-52 w-52 rounded-full border-[34px] border-primary-foreground/10" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/15 shadow-inner sm:h-14 sm:w-14">
                <Star className="h-6 w-6 fill-primary-foreground/20 text-primary-foreground sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground/70">AI Powered Daily Ticket</p>
                <h1 className="text-2xl font-extrabold text-primary-foreground sm:text-3xl">Sure Odds 2+</h1>
                <p className="mt-1 max-w-2xl text-[11px] font-medium leading-relaxed text-primary-foreground/80 sm:text-sm">
                  Today's high-confidence ticket with 2.00+ total odds / Današnji tiket visoke sigurnosti sa ukupnim kvotama 2.00+
                </p>
              </div>
            </div>
            {hasTicketAccess ? (
              <Badge className="h-10 w-full justify-center gap-2 border border-primary-foreground/20 bg-primary-foreground px-4 text-[11px] font-bold text-primary shadow-lg sm:w-auto sm:text-xs">
                <ShieldCheck className="h-4 w-4" />
                Unlocked today / Otključano danas
              </Badge>
            ) : (
              <Button
                className="h-11 w-full shrink-0 border-0 bg-primary-foreground px-4 text-[11px] font-extrabold text-primary shadow-lg hover:bg-primary-foreground/90 sm:w-auto sm:text-xs"
                onClick={handleBuyDailyTicket}
              >
                <Ticket className="mr-2 h-4 w-4" />
                One Day Offer / Ponuda za dan – {SURE_ODDS_PRICE_LABEL}
              </Button>
            )}
          </div>
        </div>

        {/* Access explanation */}
        <div className="grid border-b border-primary/10 bg-card sm:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-[11px] leading-relaxed text-foreground/75 sm:text-xs">
              Unlock today's ticket for {SURE_ODDS_PRICE_LABEL} and it stays open until midnight (Europe/Belgrade). / Otključaj današnji tiket i ostaje otvoren do ponoći (Evropa/Beograd).
            </p>
          </div>
          <div className="flex items-center gap-3 border-t border-primary/10 bg-primary/5 p-4 sm:border-l sm:border-t-0 sm:p-5">
            <Crown className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-[11px] font-semibold leading-relaxed text-foreground sm:text-xs">Premium members get daily access included. / Premium članovima je pristup uključen.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-px bg-primary/10">
          <div className="flex items-center gap-2 bg-card px-3 py-4 sm:gap-3 sm:px-5">
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:flex"><Target className="h-4 w-4 text-primary" /></div>
            <div><p className="text-base font-extrabold text-foreground sm:text-xl">80%</p><p className="text-[9px] text-muted-foreground sm:text-[10px]">Accuracy</p></div>
          </div>
          <div className="flex items-center gap-2 bg-card px-3 py-4 sm:gap-3 sm:px-5">
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:flex"><BarChart3 className="h-4 w-4 text-primary" /></div>
            <div><p className="text-base font-extrabold text-foreground sm:text-xl">{exclusiveTickets.length}</p><p className="text-[9px] text-muted-foreground sm:text-[10px]">Today's Ticket</p></div>
          </div>
          <div className="flex items-center gap-2 bg-card px-3 py-4 sm:gap-3 sm:px-5">
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:flex"><TrendingUp className="h-4 w-4 text-primary" /></div>
            <div><p className="text-base font-extrabold text-foreground sm:text-xl">{unlockedCount}</p><p className="text-[9px] text-muted-foreground sm:text-[10px]">Available</p></div>
          </div>
        </div>
      </section>

      {/* Tickets Area */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">
      {isLoading ? (
        <Card className="border-primary/15 bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Loading predictions...</p>
          </div>
        </Card>
      ) : exclusiveTickets.length === 0 ? (
        <Card className="border-primary/15 bg-card p-8 shadow-sm">
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
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {exclusiveTickets.map((ticket, idx) => {
            const unlockMethod = getUnlockMethod("exclusive", "ticket", ticket.id);
            const isLocked = !hasTicketAccess;
            const isUnlocking = unlockingId === ticket.id;

            return (
              <React.Fragment key={ticket.id}>
                <div id={`ticket-${ticket.id}`} className="md:mx-auto md:w-full md:max-w-xl">
                  {isLocked ? (
                    <SureOddsPromoCard
                      ticket={{
                        id: ticket.id,
                        title: ticket.title,
                        matchCount: ticket.matches?.length ?? 0,
                        status: ticket.result ?? "pending",
                        totalOdds: ticket.total_odds ?? 0,
                        tier: ticket.tier,
                        matches: (ticket.matches ?? []).map((m) => ({
                          name: m.match_name,
                          prediction: m.prediction,
                          odds: m.odds,
                        })),
                        createdAt: ticket.ticket_date ?? ticket.created_at_ts,
                      }}
                      isLocked={true}
                      unlockMethod={unlockMethod}
                      onUnlockClick={handleBuyDailyTicket}
                      isUnlocking={isUnlocking}
                      priceLabel={SURE_ODDS_PRICE_LABEL}
                      unlockedCount={unlockedCount}
                    />
                  ) : (
                    <TicketCard
                      ticket={{
                        id: ticket.id,
                        title: ticket.title,
                        matchCount: ticket.matches?.length ?? 0,
                        status: ticket.result ?? "pending",
                        totalOdds: ticket.total_odds ?? 0,
                        tier: ticket.tier,
                        matches: (ticket.matches ?? []).map((m) => ({
                          name: m.match_name,
                          prediction: m.prediction,
                          odds: m.odds,
                        })),
                        createdAt: ticket.ticket_date ?? ticket.created_at_ts,
                      }}
                      isLocked={false}
                      unlockMethod={unlockMethod}
                      onUnlockClick={handleBuyDailyTicket}
                      onViewTicket={() => navigate(`/tickets/${ticket.id}`)}
                      isUnlocking={isUnlocking}
                    />
                  )}
                </div>
                {(idx + 1) % 5 === 0 && Math.floor((idx + 1) / 5) <= 2 && idx < exclusiveTickets.length - 1 && (
                  <AdSlot className="col-span-full" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
      </div>

      <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-md shadow-primary/10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15"><ShieldCheck className="h-6 w-6 text-primary" /></div>
          <h2 className="text-lg font-extrabold text-foreground">Today's Access</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {hasTicketAccess ? "Your ticket is unlocked until midnight. / Vaš tiket je otključan do ponoći." : "Free access is locked. Buy today's ticket or choose Premium. / Free pristup je zaključan. Kupite današnji tiket ili izaberite Premium."}
          </p>
          {!hasTicketAccess && (
            <Button className="mt-5 h-11 w-full text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleBuyDailyTicket}>
              <Ticket className="mr-2 h-4 w-4" />Unlock / Otključaj – {SURE_ODDS_PRICE_LABEL}
            </Button>
          )}
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[hsl(211_100%_42%)] p-5 text-primary-foreground shadow-lg shadow-primary/30">
          <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full border-[20px] border-white/15" />
          <div className="absolute -top-6 -left-6 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15"><Crown className="h-6 w-6 text-warning" /></div>
            <h2 className="text-lg font-extrabold">Premium Access</h2>
            <p className="mt-2 text-xs leading-relaxed text-primary-foreground/85">Sure Odds 2+ is included every day at no extra cost. / Sure Odds 2+ je uključen svakog dana bez doplate.</p>
            {plan !== "premium" && !isAdmin && (
              <Button
                size="sm"
                className="relative mt-5 h-11 w-full bg-white text-[hsl(211_100%_30%)] font-bold hover:bg-white/90"
                onClick={() => { setUpgradeHighlight("premium"); setUpgradeModalOpen(true); }}
              >
                Get Premium / Kupi Premium <Crown className="ml-1 h-4 w-4 text-warning" />
              </Button>
            )}
          </div>
        </div>
      </aside>
      </div>

      {/* Compliance Disclaimer */}
      <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-4">
        These AI-generated predictions are for informational and entertainment purposes only. No gambling services are provided.
      </p>
      {/* Sponsored: 1xBet affiliate banner – web only */}
      <div className="mt-4">
      </div>

    </div>
    <PricingModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} highlightPlan={upgradeHighlight} />
  </>;
}
