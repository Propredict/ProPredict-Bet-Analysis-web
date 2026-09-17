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

        <div className="space-y-4 p-2.5 sm:p-4">
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
            tickets.map((ticket) => {
              const unlockMethod = getUnlockMethod(tier, "ticket", ticket.id);
              const isLocked = unlockMethod?.type !== "unlocked";
              const visibleMatches = isLocked ? ticket.matches.slice(0, 3) : ticket.matches;

              return (
                <article id={`ticket-${ticket.id}`} key={ticket.id} className="overflow-hidden rounded-xl border-2 border-primary/70 bg-card shadow-lg">
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

                  <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-secondary/55 px-2 py-3 text-center">
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

                  <div className="hidden grid-cols-[2.25rem_minmax(0,1fr)_minmax(9rem,auto)_5rem] gap-3 border-b border-border bg-secondary/30 px-4 py-2 text-[10px] font-bold uppercase text-muted-foreground sm:grid">
                    <span>#</span><span>Match</span><span>Pick</span><span className="text-center">Odds</span>
                  </div>

                  <div className="divide-y divide-border bg-card px-3 sm:px-4">
                    {visibleMatches.map((match, matchIndex) => {
                      const parsed = parseMatchName(match.match_name);
                      return (
                        <div key={match.id} className="flex min-w-0 flex-col gap-3 py-4 sm:grid sm:grid-cols-[2.25rem_minmax(0,1fr)_minmax(9rem,auto)_5rem] sm:items-center sm:gap-3">
                          <div className="flex min-w-0 items-center gap-2 sm:contents">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground sm:h-9 sm:w-9">
                              {matchIndex + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold uppercase text-muted-foreground">{parsed.league || "Football"}</p>
                              <div className="mt-2 flex min-w-0 items-center gap-2">
                                <TicketTeamCrest name={parsed.homeTeam} logo={findTicketTeamLogo(parsed.homeTeam, todayMatches)} size="sm" />
                                <p className="min-w-0 whitespace-normal break-words text-base font-extrabold leading-snug text-foreground sm:text-lg">
                                  {parsed.homeTeam} <span className="px-1 text-xs font-bold uppercase text-muted-foreground">vs</span> {parsed.awayTeam}
                                </p>
                                <TicketTeamCrest name={parsed.awayTeam} logo={findTicketTeamLogo(parsed.awayTeam, todayMatches)} size="sm" />
                              </div>
                            </div>
                          </div>
                          {isLocked ? (
                            <div className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground sm:w-auto sm:shrink-0 sm:justify-start">
                              <Lock className="h-3.5 w-3.5" /> Locked
                            </div>
                          ) : (
                            <div className="w-full rounded-lg border border-success/50 bg-success/10 px-3 py-2 text-left sm:w-auto sm:min-w-36 sm:max-w-[12rem] sm:shrink-0">
                              <p className="text-xs font-bold uppercase text-success">Pick</p>
                              <p className="whitespace-normal break-words text-base font-extrabold leading-snug text-success">{match.prediction}</p>
                            </div>
                          )}
                          <div className={isLocked ? "hidden sm:block" : "flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 sm:block sm:bg-transparent sm:px-0 sm:py-0 sm:text-center"}>
                            {!isLocked && <span className="text-xs font-bold uppercase text-muted-foreground sm:hidden">Odds</span>}
                            <span className={isLocked ? "blur-sm text-primary" : "text-base font-extrabold text-primary"}>{match.odds.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {isLocked && ticket.matches.length > visibleMatches.length && (
                      <div className="py-3 text-center text-xs font-bold text-primary">+{ticket.matches.length - visibleMatches.length} more matches</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-border border-t border-border bg-secondary/35 text-center">
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
