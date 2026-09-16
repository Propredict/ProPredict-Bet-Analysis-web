import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Crown, Loader2, Lock, RefreshCw, Sparkles, Ticket as TicketIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AffiliateBanner1xBet } from "@/components/dashboard/AffiliateBanner1xBet";
import { AffiliateBannerMelbet } from "@/components/dashboard/AffiliateBannerMelbet";
import { FreeUserUpsellModal } from "@/components/FreeUserUpsellModal";
import { Button } from "@/components/ui/button";
import { useTickets, type TicketWithMatches } from "@/hooks/useTickets";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useUserPlan, type ContentTier, type UnlockMethod } from "@/hooks/useUserPlan";
import { formatCombinedOdds } from "@/lib/formatOdds";
import { parseMatchName } from "@/types/admin";

type TicketGroupProps = {
  title: string;
  subtitle: string;
  badge: string;
  tickets: TicketWithMatches[];
  tier: "daily" | "premium";
  isLoading: boolean;
  getUnlockMethod: (tier: ContentTier, contentType?: "tip" | "ticket", contentId?: string) => UnlockMethod | null;
  unlockingId?: string | null;
  onUnlock: (ticketId: string, tier: "daily" | "premium") => void;
  onRefresh: () => void;
};

function TicketGroup({
  title,
  subtitle,
  badge,
  tickets,
  tier,
  isLoading,
  getUnlockMethod,
  unlockingId,
  onUnlock,
  onRefresh,
}: TicketGroupProps) {
  const navigate = useNavigate();
  const isPremium = tier === "premium";

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-2xl border border-sidebar-border bg-sidebar-accent/40">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="relative min-w-0">
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-b from-primary/45 to-transparent opacity-50 blur-sm" />
      <div className="relative h-full overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar shadow-xl">
        <header className="flex items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar-accent/55 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isPremium ? <Crown className="h-5 w-5 shrink-0 text-primary" /> : <TicketIcon className="h-5 w-5 shrink-0 text-primary" />}
              <h2 className="truncate text-xl font-bold text-sidebar-foreground">{title}</h2>
            </div>
            <p className="mt-1 text-xs font-semibold uppercase text-primary">{subtitle}</p>
          </div>
          <span className="shrink-0 rounded-full border border-primary/35 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase text-primary">
            {badge}
          </span>
        </header>

        <div className="space-y-4 p-3 sm:p-5">
          {tickets.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/25 px-5 text-center">
              <TicketIcon className="mb-3 h-10 w-10 text-sidebar-foreground/35" />
              <p className="font-semibold text-sidebar-foreground">No {title} available today</p>
              <p className="mt-1 text-xs text-sidebar-foreground/60">Check back later for today's ticket.</p>
              <Button variant="outline" size="sm" className="mt-4 border-primary/40 bg-transparent text-sidebar-foreground hover:bg-primary/15" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </div>
          ) : (
            tickets.map((ticket) => {
              const unlockMethod = getUnlockMethod(tier, "ticket", ticket.id);
              const isLocked = unlockMethod?.type !== "unlocked";
              const visibleMatches = isLocked ? ticket.matches.slice(0, 3) : ticket.matches;

              return (
                <article id={`ticket-${ticket.id}`} key={ticket.id} className="overflow-hidden rounded-xl border border-sidebar-border bg-sidebar-accent/25">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 border-b border-sidebar-border px-4 py-3 text-left transition-colors hover:bg-sidebar-accent/60"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-sidebar-foreground">{ticket.title}</p>
                      <p className="mt-0.5 text-[11px] text-sidebar-foreground/55">{ticket.matches.length} matches</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[9px] font-bold uppercase text-sidebar-foreground/45">Total odds</p>
                      <p className="font-bold text-primary">{isLocked ? "Locked" : formatCombinedOdds(ticket.total_odds)}</p>
                    </div>
                  </button>

                  <div className="space-y-2 p-3">
                    {visibleMatches.map((match) => {
                      const parsed = parseMatchName(match.match_name);
                      return (
                        <div key={match.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/45 p-3 transition-colors hover:border-primary/40">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-semibold uppercase text-sidebar-foreground/45">{parsed.league || "Football"}</p>
                            <p className="mt-1 truncate text-sm font-semibold text-sidebar-foreground">{parsed.homeTeam} <span className="text-sidebar-foreground/40">vs</span> {parsed.awayTeam}</p>
                          </div>
                          {isLocked ? (
                            <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-xs font-semibold text-sidebar-foreground/65">
                              <Lock className="h-3.5 w-3.5" /> Locked
                            </div>
                          ) : (
                            <div className="max-w-[44%] shrink-0 rounded-lg border border-success/45 bg-success/10 px-3 py-2 text-right">
                              <p className="truncate text-xs font-extrabold text-success">{match.prediction}</p>
                              <p className="text-[10px] font-semibold text-success/80">{match.odds.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-sidebar-border bg-sidebar-accent/20 p-3">
                    {isLocked ? (
                      <Button
                        className="h-11 w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90"
                        disabled={unlockingId === ticket.id}
                        onClick={() => onUnlock(ticket.id, tier)}
                      >
                        {unlockingId === ticket.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isPremium ? <Crown className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {isPremium ? "Unlock Premium Ticket" : "Unlock Daily Ticket"}
                      </Button>
                    ) : (
                      <Button className="h-11 w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                        View Full Ticket
                      </Button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

export default function Tickets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tickets, isLoading, refetch } = useTickets(false);
  const { getUnlockMethod, isAuthenticated } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();
  const highlightId = searchParams.get("highlight");

  const todayBelgrade = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const dailyTickets = tickets.filter((ticket) => ticket.tier === "daily" && ticket.category !== "sure_odds" && ticket.ticket_date === todayBelgrade);
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
      <FreeUserUpsellModal />
      <Helmet>
        <title>Daily & Premium Tickets – ProPredict</title>
        <meta name="description" content="View today's Daily and Premium football prediction tickets in one organized place." />
        <meta property="og:title" content="Daily & Premium Tickets – ProPredict" />
        <meta property="og:description" content="Today's Daily and Premium football prediction tickets." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="space-y-5">
        <AffiliateBannerMelbet />

        <div className="overflow-hidden rounded-2xl bg-sidebar px-4 py-7 text-sidebar-foreground shadow-xl sm:px-7 sm:py-9">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase text-primary">Today's football analysis</p>
              <h1 className="text-3xl font-extrabold sm:text-4xl">Ticket Hub</h1>
              <p className="mt-2 max-w-xl text-sm text-sidebar-foreground/65">Daily and Premium tickets, clearly organized in one place.</p>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/55 px-4 py-3 sm:text-right">
              <p className="text-[9px] font-bold uppercase text-sidebar-foreground/45">Ticket date</p>
              <p className="mt-1 text-sm font-semibold text-sidebar-foreground">{new Date().toLocaleDateString("en-GB", { timeZone: "Europe/Belgrade", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TicketGroup title="Daily Ticket" subtitle="Open daily selection" badge="Daily" tickets={dailyTickets} tier="daily" isLoading={isLoading} getUnlockMethod={getAccess} unlockingId={unlockingId} onUnlock={unlock} onRefresh={refetch} />
            <TicketGroup title="Premium Ticket" subtitle="Premium members" badge="Exclusive" tickets={premiumTickets} tier="premium" isLoading={isLoading} getUnlockMethod={getAccess} unlockingId={unlockingId} onUnlock={unlock} onRefresh={refetch} />
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">These AI-generated predictions are for informational and entertainment purposes only. No gambling services are provided.</p>
        <AffiliateBanner1xBet />
      </div>
    </>
  );
}