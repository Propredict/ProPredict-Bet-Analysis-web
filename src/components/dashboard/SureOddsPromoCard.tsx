import {
  Star,
  Lock,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Target,
  Clock,
  Users,
  CheckCircle2,
  Zap,
  Gem,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type UnlockMethod } from "@/hooks/useUserPlan";
import { format } from "date-fns";
import { parseMatchName } from "@/types/admin";
import { formatCombinedOdds } from "@/lib/formatOdds";
import type { BettingTicket, TicketMatch } from "./TicketCard";
import { useLiveScores } from "@/hooks/useLiveScores";
import { findTicketTeamLogo, TicketTeamCrest } from "@/components/tickets/TicketTeamCrest";

interface SureOddsPromoCardProps {
  ticket: BettingTicket;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
  isUnlocking?: boolean;
  priceLabel: string;
  unlockedCount?: number;
}

function getSocialProofPct(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return 72 + (Math.abs(hash) % 23);
}

export function SureOddsPromoCard({
  ticket,
  isLocked,
  onUnlockClick,
  isUnlocking = false,
  priceLabel,
  unlockedCount,
}: SureOddsPromoCardProps) {
  const { matches: todayMatches } = useLiveScores({ dateMode: "today", statusFilter: "all" });
  const ticketDate = ticket.createdAt && !isNaN(new Date(ticket.createdAt).getTime())
    ? format(new Date(ticket.createdAt), "EEE, MMM d")
    : format(new Date(), "EEE, MMM d");

  const matches = ticket.matches.slice(0, 3);
  const remainingCount = ticket.matchCount > 3 ? ticket.matchCount - 3 : 0;
  const socialPct = getSocialProofPct(ticket.id);

  // ── Unlocked state: simple reveal layout (matches TicketCard style) ──
  if (!isLocked) {
    return (
      <div
        className={cn(
          "relative rounded-2xl border-2 border-primary/70 bg-card overflow-hidden",
          "shadow-[0_0_30px_rgba(0,148,230,0.12)]"
        )}
      >
        <div className="h-1 w-full bg-primary" />
        <div className="bg-gradient-to-b from-primary/20 to-blue-700/5 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Badge className="gap-1 bg-primary text-primary-foreground border-0 text-[10px] px-2 py-0.5">
                <Star className="h-3 w-3 fill-current" />PRO
              </Badge>
              <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-muted/40 rounded-full border border-border/30">
                {ticket.matchCount} Matches
              </span>
            </div>
            <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-[10px] px-2">
              <CheckCircle2 className="h-3 w-3 mr-1" />Unlocked
            </Badge>
          </div>
          <h3 className="font-bold text-base sm:text-lg text-foreground text-center leading-tight">
            {ticket.title}
          </h3>
          <div className="mt-1.5 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {ticketDate}
            </span>
            {ticket.totalOdds > 0 && (
              <span className="flex items-center gap-1">
                <span className="opacity-60">Total odds</span>
                <span className="font-bold text-foreground">{formatCombinedOdds(ticket.totalOdds)}</span>
              </span>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-5 pb-5 pt-3 space-y-2">
          <div className="flex items-center justify-center gap-2 pb-1">
            <Star className="h-3.5 w-3.5 text-success fill-success" />
            <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-success">Our Picks</span>
            <Star className="h-3.5 w-3.5 text-success fill-success" />
          </div>
          {matches.map((match, idx) => {
            const parsed = parseMatchName(match.name);
            return (
              <div key={idx} className="rounded-xl border-2 border-primary/50 bg-secondary/45 p-3">
                {parsed.league && (
                  <p className="text-[9px] text-muted-foreground truncate text-center mb-1.5 uppercase tracking-wider">
                    {parsed.league}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2">
                  <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5 rounded-md border border-primary/35 bg-card px-2 py-1 text-right text-[15px] font-semibold leading-tight text-foreground sm:text-base">
                    <span className="min-w-0 break-words">{parsed.homeTeam}</span><TicketTeamCrest name={parsed.homeTeam} logo={findTicketTeamLogo(parsed.homeTeam, todayMatches)} size="sm" />
                  </span>
                  <span className="shrink-0 text-muted-foreground text-[10px]">vs</span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-primary/35 bg-card px-2 py-1 text-left text-[15px] font-semibold leading-tight text-foreground sm:text-base">
                    <TicketTeamCrest name={parsed.awayTeam} logo={findTicketTeamLogo(parsed.awayTeam, todayMatches)} size="sm" /><span className="min-w-0 break-words">{parsed.awayTeam}</span>
                  </span>
                </div>
                <div className="mt-2 rounded-lg border border-success/45 bg-success/10 py-2 px-3 text-center">
                  <span className="text-[13px] font-extrabold tracking-wide text-success">{match.prediction}</span>
                </div>
              </div>
            );
          })}
          {remainingCount > 0 && (
            <p className="text-center text-[10px] text-primary pt-1 flex items-center justify-center gap-0.5">
              +{remainingCount} more matches
              <ChevronRight className="h-3 w-3" />
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border-2 border-primary/70 bg-card shadow-md shadow-primary/15 md:rounded-2xl md:border-primary md:shadow-[0_20px_60px_-10px_rgba(0,148,230,0.45)] md:ring-1 md:ring-primary/40">
      <div className="bg-primary px-4 py-4 text-primary-foreground sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground/70">Daily Acca / Dnevni tiket</p><h3 className="mt-0.5 text-xl font-extrabold uppercase leading-none">{ticket.title}</h3></div>
          <Badge className="border border-primary-foreground/20 bg-primary-foreground/15 text-[10px] text-primary-foreground"><Star className="mr-1 h-3 w-3 fill-current" />PRO</Badge>
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div><p className="text-[9px] font-bold uppercase text-primary-foreground/70">Combined odds / Ukupna kvota</p><p className="text-3xl font-extrabold leading-none">{ticket.totalOdds > 0 ? formatCombinedOdds(ticket.totalOdds) : "2.00+"}</p></div>
          <div className="text-right"><p className="text-[9px] font-bold uppercase text-primary-foreground/70">Ticket date / Datum tiketa</p><p className="text-xs font-semibold">{ticketDate}</p></div>
        </div>
      </div>

      <div className="space-y-2 bg-secondary/60 p-2">
          {matches.map((match, idx) => {
            const parsed = parseMatchName(match.name);
            return (
              <div key={idx} className="rounded-lg border-2 border-primary/50 bg-card p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">{parsed.league || `Match ${idx + 1}`}</p>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[9px] font-extrabold uppercase text-primary">Pending / U toku</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5"><div className="flex min-w-0 items-center gap-2"><TicketTeamCrest name={parsed.homeTeam} logo={findTicketTeamLogo(parsed.homeTeam, todayMatches)} size="sm" /><p className="min-w-0 break-words text-sm font-bold text-foreground">{parsed.homeTeam}</p></div><div className="flex min-w-0 items-center gap-2"><TicketTeamCrest name={parsed.awayTeam} logo={findTicketTeamLogo(parsed.awayTeam, todayMatches)} size="sm" /><p className="min-w-0 break-words text-sm font-bold text-foreground">{parsed.awayTeam}</p></div></div>
                  <div className="text-right"><p className="mb-1 text-[9px] font-semibold uppercase text-muted-foreground">Pick / Tip</p><div className="flex items-center gap-1.5 rounded-lg bg-sidebar px-3 py-1.5 text-xs font-bold text-sidebar-foreground"><Lock className="h-3 w-3 text-blue-300" />Locked / Zaključano</div></div>
                  </div>
              </div>
            );
          })}
          {remainingCount > 0 && (
            <p className="text-center text-[10px] text-primary pt-1 flex items-center justify-center gap-0.5">
              +{remainingCount} more matches / još utakmica
              <ChevronRight className="h-3 w-3" />
            </p>
          )}
      </div>
      <div className="border-t border-border bg-card p-4">
          <p className="mb-3 text-center text-[10px] text-muted-foreground"><span className="font-bold text-primary">{socialPct}% of users</span> unlocked this ticket</p>
          <Button
            size="lg"
            disabled={isUnlocking}
            onClick={onUnlockClick}
            className={cn(
              "h-12 w-full gap-2 rounded-xl border-0 bg-primary text-sm font-extrabold uppercase text-primary-foreground shadow-lg shadow-primary/20",
              "hover:bg-primary/90 active:scale-[0.98]",
              "transition-all duration-200"
            )}
          >
            {isUnlocking ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                <Ticket className="h-5 w-5" />
                <span className="flex-1 text-left">Unlock Today's Ticket</span>
                <span className="rounded-lg bg-primary-foreground/15 px-2 py-1 text-sm">{priceLabel}</span>
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </Button>
      </div>
    </div>
  );
}

export default SureOddsPromoCard;
