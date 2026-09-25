import { ArrowRight, Crown, Loader2, Lock, RefreshCw, Sparkles, Ticket as TicketIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { TicketWithMatches } from "@/hooks/useTickets";
import type { ContentTier, UnlockMethod } from "@/hooks/useUserPlan";
import { formatCombinedOdds } from "@/lib/formatOdds";
import { parseMatchName } from "@/types/admin";
import { useLiveScores } from "@/hooks/useLiveScores";
import { findTicketTeamLogo, TicketTeamCrest } from "@/components/tickets/TicketTeamCrest";

export type TicketGroupProps = {
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

export function TicketGroup({
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
  const { matches: todayMatches } = useLiveScores({ dateMode: "today", statusFilter: "all" });

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-2xl border border-sidebar-border bg-sidebar-accent/40">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="relative min-w-0">
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-b from-primary/50 to-transparent opacity-50 blur-sm" />
      <div className="relative h-full overflow-hidden rounded-2xl border border-primary/45 bg-secondary shadow-xl">
        <header className="flex items-center justify-between gap-3 border-b border-primary/20 bg-card px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isPremium ? <Crown className="h-5 w-5 shrink-0 text-primary" /> : <TicketIcon className="h-5 w-5 shrink-0 text-primary" />}
              <h2 className="truncate text-xl font-extrabold text-foreground sm:text-2xl">{title}</h2>
            </div>
            <p className="mt-1 text-sm font-semibold uppercase text-primary">{subtitle}</p>
          </div>
          <span className="shrink-0 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase text-primary">
            {badge}
          </span>
        </header>

        <div className="space-y-7 p-2.5 sm:p-4">
          {tickets.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/25 px-5 text-center">
              <TicketIcon className="mb-3 h-10 w-10 text-sidebar-foreground/35" />
              <p className="font-semibold text-sidebar-foreground">No {title} available today</p>
              <p className="mt-1 text-sm text-sidebar-foreground/60">Check back later for today's ticket.</p>
              <Button variant="outline" size="sm" className="mt-4 border-primary/40 bg-transparent text-sidebar-foreground hover:bg-primary/15" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </div>
          ) : (
            tickets.map((ticket, ticketIndex) => {
              const unlockMethod = getUnlockMethod(tier, "ticket", ticket.id);
              const isLocked = unlockMethod?.type !== "unlocked";
              const visibleMatches = isLocked ? ticket.matches.slice(0, 3) : ticket.matches;

              return (
                <div key={ticket.id} id={`ticket-${ticket.id}`} className="min-w-0">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-sm sm:text-xs">
                      <TicketIcon className="h-3.5 w-3.5" />
                      Ticket {ticketIndex + 1} / Tiket {ticketIndex + 1}
                    </span>
                    <span className="h-0.5 flex-1 rounded-full bg-primary/25" />
                  </div>
                  <article className="overflow-hidden rounded-xl border-2 border-primary/70 bg-card shadow-lg">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex h-auto w-full items-center justify-between gap-3 rounded-none border-b border-primary/25 bg-gradient-to-r from-sidebar via-sidebar-accent to-primary px-4 py-4 text-left hover:opacity-95 hover:text-sidebar-foreground sm:px-5"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        {isPremium ? <Crown className="h-4 w-4 text-primary" /> : <TicketIcon className="h-4 w-4 text-primary" />}
                        <span className="text-xs font-bold uppercase text-primary">{isPremium ? "Premium Ticket" : "Daily Ticket"}</span>
                      </div>
                      <p className="whitespace-normal break-words text-lg font-extrabold uppercase leading-tight text-sidebar-foreground sm:text-xl">{ticket.title}</p>
                      <p className="mt-1 text-xs font-semibold uppercase text-sidebar-foreground/65">Carefully selected picks</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold uppercase text-sidebar-foreground/55">Total odds</p>
                      <p className="text-xl font-extrabold text-primary">{formatCombinedOdds(ticket.total_odds)}</p>
                    </div>
                  </Button>

                  <div className="hidden grid-cols-3 divide-x divide-border border-b border-border bg-secondary/55 px-2 py-3 text-center sm:grid">
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">Matches</p>
                      <p className="mt-0.5 text-base font-extrabold text-foreground">{ticket.matches.length}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">Confidence</p>
                      <p className="mt-0.5 text-base font-extrabold text-primary">High</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">Total odds</p>
                      <p className="mt-0.5 text-base font-extrabold text-primary">{formatCombinedOdds(ticket.total_odds)}</p>
                    </div>
                  </div>

                  <div className="hidden grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_5rem] gap-4 border-b border-border bg-secondary/30 px-4 py-2 text-sm font-extrabold uppercase text-muted-foreground sm:grid">
                    <span>#</span><span>Match</span><span className="text-center">Pick</span><span className="text-center">Odds</span>
                  </div>

                  <div className="space-y-2 bg-card p-2 sm:p-4">
                    {visibleMatches.map((match, matchIndex) => {
                      const parsed = parseMatchName(match.match_name);
                      return (
                        <div key={match.id} className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_3.5rem] items-center gap-2 rounded-lg border border-primary/20 bg-card p-2.5 sm:grid-cols-[2.25rem_minmax(0,1fr)_5rem] sm:gap-4 sm:p-4">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground sm:h-9 sm:w-9">
                            {matchIndex + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[9px] font-bold uppercase text-primary sm:text-center sm:text-xs">{parsed.league || "Football"}</p>
                            <div className="mt-1.5 min-w-0 space-y-1 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-1 sm:space-y-0">
                              <div className="flex min-w-0 items-center gap-1 sm:justify-center">
                                <TicketTeamCrest name={parsed.homeTeam} logo={findTicketTeamLogo(parsed.homeTeam, todayMatches)} size="sm" />
                                <span className="min-w-0 whitespace-normal break-words text-[12px] font-extrabold leading-tight text-foreground sm:text-xl">{parsed.homeTeam}</span>
                              </div>
                              <span className="hidden text-[9px] font-bold uppercase text-muted-foreground sm:block">vs</span>
                              <div className="flex min-w-0 items-center gap-1 sm:justify-center">
                                <TicketTeamCrest name={parsed.awayTeam} logo={findTicketTeamLogo(parsed.awayTeam, todayMatches)} size="sm" />
                                <span className="min-w-0 whitespace-normal break-words text-[12px] font-extrabold leading-tight text-foreground sm:text-xl">{parsed.awayTeam}</span>
                              </div>
                            </div>
                            {isLocked ? (
                              <div className="mt-2 flex min-h-8 w-full items-center justify-center gap-1 rounded-md bg-muted px-2 py-1.5 text-[10px] font-bold text-muted-foreground sm:mx-auto sm:w-fit sm:min-w-56 sm:px-8">
                                <Lock className="h-3.5 w-3.5" /> Locked
                              </div>
                            ) : (
                              <div className="mt-2 w-full rounded-md bg-muted px-2 py-1.5 text-center sm:mx-auto sm:w-fit sm:min-w-56 sm:px-8">
                                <p className="whitespace-normal break-words text-[13px] font-extrabold leading-tight text-success sm:text-base">PICK: {match.prediction}</p>
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <span className="block text-[9px] font-bold uppercase text-muted-foreground">Odds</span>
                            <span className={isLocked ? "text-base font-extrabold text-primary blur-sm" : "text-base font-extrabold text-primary sm:text-xl"}>{match.odds.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {isLocked && ticket.matches.length > visibleMatches.length && (
                      <div className="py-3 text-center text-xs font-bold text-primary">+{ticket.matches.length - visibleMatches.length} more matches</div>
                    )}
                  </div>

                  <div className="hidden grid-cols-2 divide-x divide-border border-t border-border bg-secondary/35 text-center sm:grid">
                    <div className="px-2 py-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Total matches</p>
                      <p className="text-lg font-extrabold text-foreground">{ticket.matches.length}</p>
                    </div>
                    <div className="px-2 py-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Total odds</p>
                      <p className="text-lg font-extrabold text-primary">{formatCombinedOdds(ticket.total_odds)}</p>
                    </div>
                  </div>

                  <div className="border-t border-border bg-card p-3">
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
                      <Button className="h-12 w-full gap-2 bg-primary text-sm font-extrabold text-primary-foreground hover:bg-primary/90 sm:text-base" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                        View Full Ticket / Otvori Tiket <ArrowRight className="h-4 w-4" />
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

export default TicketGroup;
