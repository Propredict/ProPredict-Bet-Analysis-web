import { useNavigate } from "react-router-dom";
import { Star, Ticket, Loader2, CalendarDays, Layers3, Gauge, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useDailyTicketUnlock, SURE_ODDS_PRICE_LABEL } from "@/hooks/useDailyTicketUnlock";
import { startSureOddsPurchase } from "@/lib/sureOddsPurchase";
import { trackSureOddsEvent } from "@/lib/sureOddsAnalytics";
import TicketCard, { type BettingTicket } from "./TicketCard";
import { SureOddsPromoCard } from "./SureOddsPromoCard";
import { PremiumLockCard } from "@/components/premium/PremiumLock";

function mapDbTicket(db: any): BettingTicket {
  return {
    id: db.id,
    title: db.title,
    matchCount: db.matches?.length ?? 0,
    status: db.result ?? "pending",
    totalOdds: db.total_odds,
    tier: db.tier,
    matches: (db.matches ?? []).map((m: any) => ({
      name: m.match_name ?? "",
      prediction: m.prediction ?? "",
      odds: m.odds ?? 1,
    })),
  };
}

export function SureOddsDashboardSection() {
  const navigate = useNavigate();
  const { tickets: dbTickets = [], isLoading } = useTickets(false);
  const { isAdmin, plan } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();
  const { hasTodayUnlock, refetch: refetchUnlock } = useDailyTicketUnlock();
  

  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const sureOddsTickets = dbTickets
    .filter((t: any) => t.ticket_date === todayDate && (t.category as string) === "sure_odds")
    .map(mapDbTicket);

  const hasAccess = isAdmin || plan === "premium" || hasTodayUnlock;
  const ticket = sureOddsTickets[0];


  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (!ticket) return null;

  const handleBuyDailyTicket = () => {
    void trackSureOddsEvent("cta_click", "dashboard_section");
    startSureOddsPurchase(() => {
      setTimeout(() => refetchUnlock(), 4000);
      setTimeout(() => refetchUnlock(), 10000);
    }, "dashboard_section");
  };

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-secondary/70 shadow-lg shadow-primary/10">
        <div className="relative flex flex-col items-stretch justify-between gap-3 overflow-hidden bg-gradient-to-r from-primary via-blue-600 to-sidebar px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5">
          <div className="pointer-events-none absolute -right-8 -top-16 h-40 w-40 rounded-full border-[28px] border-primary-foreground/10" />
          <div className="relative flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/15 shadow-inner">
              <Star className="h-5 w-5 text-primary-foreground fill-primary-foreground/20" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-primary-foreground sm:text-2xl">Sure Odds 2+</h2>
              <p className="truncate text-[10px] font-medium text-primary-foreground/80 sm:text-xs">
                Today's high-confidence ticket with 2.00+ total odds / Današnji tiket visoke sigurnosti sa ukupnim kvotama 2.00+
              </p>
            </div>
          </div>
          {hasAccess ? (
            <Button
              size="sm"
              className="relative h-10 w-full shrink-0 border-0 bg-primary-foreground px-4 text-[11px] font-bold text-primary shadow-lg hover:bg-primary-foreground/90 sm:w-auto sm:text-xs"
              onClick={() => navigate("/sure-odds")}
            >
              <Ticket className="h-3.5 w-3.5 mr-1" />
              See Ticket / Pogledaj tiket
            </Button>
          ) : (
            <Button
              size="sm"
              className="relative h-10 w-full shrink-0 border-0 bg-primary-foreground px-4 text-[10px] font-bold text-primary shadow-lg hover:bg-primary-foreground/90 sm:w-auto sm:text-xs"
              onClick={handleBuyDailyTicket}
            >
              One Day Offer / Ponuda za dan – {SURE_ODDS_PRICE_LABEL}
            </Button>
          )}
        </div>

        <div className="grid gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,2fr)_minmax(230px,0.8fr)]">
          <div className="min-w-0">
            {hasAccess ? (
              <TicketCard ticket={ticket} isLocked={false} light unlockMethod={{ type: "unlocked" }} isUnlocking={unlockingId === ticket.id} onUnlockClick={() => handleUnlock("ticket", ticket.id, ticket.tier)} onViewTicket={() => navigate("/sure-odds")} />
            ) : (
              <SureOddsPromoCard ticket={ticket} isLocked={true} unlockMethod={{ type: "upgrade_basic", message: "Unlock today's ticket" }} onUnlockClick={handleBuyDailyTicket} isUnlocking={unlockingId === ticket.id} priceLabel={SURE_ODDS_PRICE_LABEL} />
            )}
          </div>

          <aside className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl border border-primary/15 bg-card p-4 shadow-sm">
              <h3 className="mb-4 text-sm font-extrabold text-foreground">Today's Ticket</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-primary" /><div><p className="text-base font-extrabold text-foreground">{ticket.matchCount}</p><p className="text-[10px] text-muted-foreground">Matches</p></div></div>
                <div className="flex items-center gap-3"><Gauge className="h-5 w-5 text-primary" /><div><p className="text-base font-extrabold text-foreground">{ticket.totalOdds > 0 ? ticket.totalOdds.toFixed(2) : "2.00+"}</p><p className="text-[10px] text-muted-foreground">Total odds</p></div></div>
                <div className="flex items-center gap-3"><Layers3 className="h-5 w-5 text-primary" /><div><p className="text-base font-extrabold capitalize text-foreground">{ticket.status}</p><p className="text-[10px] text-muted-foreground">Ticket status</p></div></div>
              </div>
            </div>
            {!hasAccess && <PremiumLockCard />}
          </aside>
        </div>

        <div className="flex justify-center border-t border-primary/10 bg-card/60 px-3 py-2">
          <Button variant="ghost" size="sm" className={cn("text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary/80")} onClick={() => navigate("/sure-odds")}>See all Sure Odds Tickets / Pogledaj sve Sure Odds Tickets →</Button>
        </div>
      </div>
    </section>
  );
}

export default SureOddsDashboardSection;
