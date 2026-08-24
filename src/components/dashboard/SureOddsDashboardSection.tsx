import { useNavigate } from "react-router-dom";
import { Star, Ticket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useDailyTicketUnlock, SURE_ODDS_PRICE_LABEL } from "@/hooks/useDailyTicketUnlock";
import { usePlatform } from "@/hooks/usePlatform";
import { toast } from "sonner";
import { startSureOddsWebCheckout } from "@/lib/sureOddsCheckout";
import TicketCard, { type BettingTicket } from "./TicketCard";
import { SureOddsPromoCard } from "./SureOddsPromoCard";

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
  const { isAndroidApp } = usePlatform();

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
    if (isAndroidApp && window.Android?.purchaseDailyTicket) {
      window.Android.purchaseDailyTicket();
      toast.info("Opening purchase…");
      setTimeout(() => refetchUnlock(), 4000);
      setTimeout(() => refetchUnlock(), 10000);
      return;
    }
    // Web: one-time Stripe checkout for today's ticket
    toast.info("Opening secure checkout…");
    void startSureOddsWebCheckout();
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 p-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/20">
            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold sm:text-lg text-amber-400">Sure Odds 2+</h2>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
              Today's high-confidence ticket with 2.00+ total odds
            </p>
          </div>
        </div>
        {hasAccess ? (
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold border-0 h-8 px-3 text-[11px] sm:text-xs"
            onClick={() => navigate("/pro-predictions")}
          >
            <Ticket className="h-3.5 w-3.5 mr-1" />
            See Ticket
          </Button>
        ) : (
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold border-0 h-8 px-3 text-[11px] sm:text-xs"
            onClick={handleBuyDailyTicket}
          >
            One Day Offer – {SURE_ODDS_PRICE_LABEL}
          </Button>
        )}
      </div>

      {/* Card */}
      <div className="max-w-md mx-auto">
        {hasAccess ? (
          <TicketCard
            ticket={ticket}
            isLocked={false}
            unlockMethod={{ type: "unlocked" }}
            isUnlocking={unlockingId === ticket.id}
            onUnlockClick={() => handleUnlock("ticket", ticket.id, ticket.tier)}
          />
        ) : (
          <SureOddsPromoCard
            ticket={ticket}
            isLocked={true}
            unlockMethod={{ type: "upgrade_basic", message: "Unlock today's ticket" }}
            onUnlockClick={handleBuyDailyTicket}
            isUnlocking={unlockingId === ticket.id}
            priceLabel={SURE_ODDS_PRICE_LABEL}
          />
        )}
      </div>

      {/* See all */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs font-semibold"
          )}
          onClick={() => navigate("/pro-predictions")}
        >
          See all Sure Odds Tickets →
        </Button>
      </div>
    </section>
  );
}

export default SureOddsDashboardSection;
