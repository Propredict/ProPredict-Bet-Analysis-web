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
          "relative rounded-2xl border border-border/60 bg-card overflow-hidden",
          "shadow-[0_0_30px_rgba(245,158,11,0.12)]"
        )}
      >
        <div className="h-1 w-full bg-amber-500" />
        <div className="bg-gradient-to-b from-amber-500/20 to-amber-600/5 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Badge className="gap-1 bg-amber-500 text-black border-0 text-[10px] px-2 py-0.5">
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
              <div key={idx} className="rounded-xl border border-border/40 bg-muted/10 p-3">
                {parsed.league && (
                  <p className="text-[9px] text-muted-foreground truncate text-center mb-1.5 uppercase tracking-wider">
                    {parsed.league}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2">
                  <span className="flex-1 text-right text-[13px] font-semibold text-foreground leading-tight truncate px-2 py-1 rounded-md border border-border/50 bg-muted/20">
                    {parsed.homeTeam}
                  </span>
                  <span className="shrink-0 text-muted-foreground text-[10px]">vs</span>
                  <span className="flex-1 text-left text-[13px] font-semibold text-foreground leading-tight truncate px-2 py-1 rounded-md border border-border/50 bg-muted/20">
                    {parsed.awayTeam}
                  </span>
                </div>
                <div className="mt-2 rounded-lg border border-success/30 bg-success/5 py-2 px-3 text-center">
                  <span className="text-[13px] font-bold text-foreground tracking-wide">{match.prediction}</span>
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

  // ── Locked promotional state ──
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Hero header */}
      <div className="relative text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 bg-amber-500 text-black px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-wider mb-4 shadow-lg shadow-amber-500/20">
          <Star className="h-3 w-3 fill-current" />
          PRO
        </div>

        <h2 className="text-foreground font-black text-4xl sm:text-5xl leading-none tracking-tighter uppercase">
          SURE ODDS
        </h2>

        <div className="relative flex justify-center items-start mt-1">
          <span
            className="text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 font-black text-8xl sm:text-9xl leading-[0.85] tracking-tighter drop-shadow-[0_10px_15px_rgba(245,158,11,0.35)]"
          >
            2+
          </span>

          {/* Total odds sticker */}
          <div className="absolute right-0 sm:-right-2 top-4 w-20 h-20 sm:w-24 sm:h-24 bg-black rounded-full border-2 border-border flex flex-col items-center justify-center rotate-12 shadow-2xl">
            <span className="text-[8px] sm:text-[9px] text-muted-foreground font-bold uppercase tracking-wider leading-none">
              Total Odds
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-400 leading-none mt-1">
              {ticket.totalOdds > 0 ? formatCombinedOdds(ticket.totalOdds) : ">2"}
            </span>
            <Star className="h-3 w-3 text-amber-400 mt-1 fill-current" />
          </div>
        </div>

        {/* One-time purchase badge */}
        <div className="absolute -left-2 sm:-left-4 top-16 sm:top-24 -rotate-12">
          <div className="bg-white text-black px-2.5 py-1 font-black text-[9px] uppercase tracking-tighter rounded shadow-lg">
            One-Time
            <br />
            Purchase
          </div>
        </div>

        {/* Trust chips */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-5">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground font-semibold bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            Carefully selected matches
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground font-semibold bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
            <Target className="h-3.5 w-3.5 text-amber-400" />
            High value picks
          </div>
        </div>
      </div>

      {/* Ticket card */}
      <div
        className={cn(
          "w-full bg-card border border-border rounded-[2rem] overflow-hidden",
          "shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
        )}
      >
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        <div className="px-5 pt-6 pb-2 text-center">
          <div className="flex justify-center gap-2 mb-3">
            <Badge className="gap-1 bg-amber-500 text-black border-0 text-[10px] px-2 py-0.5">
              <Star className="h-3 w-3 fill-current" />PRO
            </Badge>
            <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-muted/40 rounded-full border border-border/30">
              {ticket.matchCount} MATCHES
            </span>
          </div>
          <h3 className="text-foreground font-bold text-lg tracking-tight">
            TODAY'S TICKET <span className="text-amber-400">ODDS 2+</span>
          </h3>
          <div className="text-muted-foreground text-[10px] sm:text-[11px] font-medium mt-1 flex justify-center items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {ticketDate}
            </span>
            <span className="flex items-center gap-1">
              Total odds: <span className="text-success font-bold">{ticket.totalOdds > 0 ? formatCombinedOdds(ticket.totalOdds) : ">2"}</span>
            </span>
          </div>
        </div>

        {/* Locked match placeholders */}
        <div className="px-4 sm:px-5 space-y-2 mt-4">
          {matches.map((match, idx) => {
            const parsed = parseMatchName(match.name);
            return (
              <div
                key={idx}
                className="bg-muted/30 border border-border/50 rounded-2xl p-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-muted/80" />
                  </div>
                  <div className="h-2.5 w-16 sm:w-20 bg-muted/60 rounded-full blur-[2px]" />
                </div>

                <div className="flex flex-col items-center">
                  {parsed.league && (
                    <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
                      {parsed.league}
                    </span>
                  )}
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <Lock className="h-2.5 w-2.5 text-amber-400" />
                    <span className="text-[9px] text-amber-400 font-black uppercase">Locked</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-muted/80" />
                  </div>
                  <div className="h-2.5 w-16 sm:w-20 bg-muted/60 rounded-full blur-[2px]" />
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

        {/* CTA area */}
        <div className="p-5">
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full border-2 border-card bg-muted flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="w-7 h-7 rounded-full border-2 border-card bg-muted/80" />
              <div className="w-7 h-7 rounded-full border-2 border-card bg-muted/60" />
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
              <span className="text-success font-bold">{socialPct}% of users</span> unlocked this ticket
            </p>
          </div>

          <Button
            size="lg"
            disabled={isUnlocking}
            onClick={onUnlockClick}
            className={cn(
              "w-full gap-2 h-14 text-sm sm:text-base font-black uppercase tracking-tighter",
              "bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600",
              "hover:brightness-110 active:scale-[0.98]",
              "text-black border-0 rounded-2xl shadow-[0_15px_35px_rgba(245,158,11,0.25)]",
              "transition-all duration-200"
            )}
          >
            {isUnlocking ? (
              <>
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                <Ticket className="h-5 w-5" />
                <span className="flex-1 text-left">Unlock Today's Ticket</span>
                <span className="bg-black/10 px-2 py-1 rounded-lg text-base">{priceLabel}</span>
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>

        {/* Footer benefits */}
        <div className="grid grid-cols-3 border-t border-border/50 bg-black/20 py-4">
          <div className="flex flex-col items-center gap-1.5 border-r border-border/50 px-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-[7px] sm:text-[8px] text-center font-extrabold text-muted-foreground uppercase tracking-widest leading-tight">
              1-Time Payment
              <br />
              No Subscription
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 border-r border-border/50 px-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Gem className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-[7px] sm:text-[8px] text-center font-extrabold text-muted-foreground uppercase tracking-widest leading-tight">
              High Value
              <br />
              Picks
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 px-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-[7px] sm:text-[8px] text-center font-extrabold text-muted-foreground uppercase tracking-widest leading-tight">
              Available Until
              <br />
              Midnight (CET)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SureOddsPromoCard;
