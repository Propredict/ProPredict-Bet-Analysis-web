import { useEffect } from "react";
import { CalendarDays, Crown } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TicketGroup } from "@/components/tickets/TicketGroup";
import { useTickets } from "@/hooks/useTickets";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";

export default function PremiumTickets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tickets, isLoading, refetch } = useTickets(false);
  const { getUnlockMethod, isAuthenticated } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();
  const highlightId = searchParams.get("highlight");

  const todayBelgrade = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const premiumTickets = tickets.filter((ticket) => {
    const isRisk = ["multi_risk", "risk", "risk_of_day", "risk_of_the_day"].includes(String(ticket.category));
    return ticket.tier === "premium" && ticket.ticket_date === todayBelgrade && !isRisk;
  });

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => {
      const ticket = document.getElementById(`ticket-${highlightId}`);
      ticket?.scrollIntoView({ behavior: "smooth", block: "center" });
      ticket?.classList.add("push-highlight");
      window.setTimeout(() => ticket?.classList.remove("push-highlight"), 4000);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const getAccess = (tier: ContentTier, contentType?: "tip" | "ticket", contentId?: string) => {
    if (!isAuthenticated) return { type: "login_required", message: "Sign in to unlock" } as const;
    return getUnlockMethod(tier, contentType, contentId);
  };

  const unlock = (ticketId: string, tier: "daily" | "premium") => {
    const method = getAccess(tier, "ticket", ticketId);
    if (method?.type === "login_required") {
      navigate("/login");
      return;
    }
    if (tier === "premium" && method?.type !== "watch_ad" && method?.type !== "android_watch_ad_or_pro") {
      navigate("/get-premium");
      return;
    }
    handleUnlock("ticket", ticketId, tier);
  };

  return (
    <>
      <Helmet>
        <title>Premium Ticket – ProPredict</title>
        <meta name="description" content="Today's Premium football prediction ticket with selected matches, picks and total odds." />
        <meta property="og:title" content="Premium Ticket – ProPredict" />
        <meta property="og:description" content="Today's Premium football prediction ticket." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-primary/40 bg-secondary px-3 py-4 shadow-xl sm:px-5 sm:py-5">
          <div className="relative overflow-hidden rounded-xl border border-primary/50 bg-[url('/src/assets/hero-stadium.jpg')] bg-cover bg-center px-4 py-6 text-sidebar-foreground sm:px-7 sm:py-8">
            <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/95 to-sidebar/55" />
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="relative">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary"><Crown className="h-4 w-4" /> Premium selection</p>
              <h1 className="text-3xl font-extrabold sm:text-4xl">Premium Ticket</h1>
              <p className="mt-2 max-w-xl text-sm font-medium text-sidebar-foreground/80">Today's exclusive Premium ticket for members.</p>
            </div>
            <div className="relative rounded-xl border border-primary/50 bg-sidebar/70 px-4 py-3 sm:text-right">
              <p className="text-[9px] font-bold uppercase text-sidebar-foreground/45">Ticket date</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-sidebar-foreground"><CalendarDays className="h-4 w-4 text-primary" />{new Date().toLocaleDateString("en-GB", { timeZone: "Europe/Belgrade", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
          </div>

          <div className="mt-4">
            <TicketGroup title="Premium Ticket" subtitle="Premium members" badge="Exclusive" tickets={premiumTickets} tier="premium" isLoading={isLoading} getUnlockMethod={getAccess} unlockingId={unlockingId} onUnlock={unlock} onRefresh={refetch} />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">These AI-generated predictions are for informational and entertainment purposes only. No gambling services are provided.</p>
      </div>
    </>
  );
}
