import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FreeUserUpsellModal } from "@/components/FreeUserUpsellModal";
import { TicketGroup } from "@/components/tickets/TicketGroup";
import { useTickets } from "@/hooks/useTickets";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";

export default function Tickets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tickets, isLoading, refetch } = useTickets(false);
  const { getUnlockMethod, isAuthenticated } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();
  const highlightId = searchParams.get("highlight");
  const { maybeShowInterstitial } = useAndroidInterstitial();

  useEffect(() => {
    maybeShowInterstitial("tickets");
  }, [maybeShowInterstitial]);

  const todayBelgrade = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const dailyTickets = tickets.filter((ticket) => ticket.tier === "daily" && ticket.category !== "sure_odds" && ticket.ticket_date === todayBelgrade);

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
      <FreeUserUpsellModal />
      <Helmet>
        <title>Daily Ticket – ProPredict</title>
        <meta name="description" content="View today's daily football prediction ticket with matches, picks and total odds." />
        <meta property="og:title" content="Daily Ticket – ProPredict" />
        <meta property="og:description" content="Today's daily football prediction ticket." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl bg-sidebar px-4 py-7 text-sidebar-foreground shadow-xl sm:px-7 sm:py-9">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase text-primary">Today's football analysis</p>
              <h1 className="text-3xl font-extrabold sm:text-4xl">Tiket / Bet Slip</h1>
              <p className="mt-2 max-w-xl text-sm text-sidebar-foreground/65">Today's daily ticket, clearly organized in one place.</p>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/55 px-4 py-3 sm:text-right">
              <p className="text-[9px] font-bold uppercase text-sidebar-foreground/45">Ticket date</p>
              <p className="mt-1 text-sm font-semibold text-sidebar-foreground">{new Date().toLocaleDateString("en-GB", { timeZone: "Europe/Belgrade", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>

          <div className="mt-7">
            <TicketGroup title="Daily Ticket" subtitle="Open daily selection" badge="Daily" tickets={dailyTickets} tier="daily" isLoading={isLoading} getUnlockMethod={getAccess} unlockingId={unlockingId} onUnlock={unlock} onRefresh={refetch} />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">These AI-generated predictions are for informational and entertainment purposes only. No gambling services are provided.</p>
      </div>
    </>
  );
}
