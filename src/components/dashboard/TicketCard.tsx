import {
  Ticket,
  Clock,
  Lock,
  Unlock,
  Star,
  Crown,
  CheckCircle2,
  XCircle,
  Loader2,
  LogIn,
  Sparkles,
  Gift,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ContentTier, type UnlockMethod } from "@/hooks/useUserPlan";

/* =====================
   Types
===================== */

export interface TicketMatch {
  name: string;
  prediction: string;
  odds: number;
}

export interface BettingTicket {
  id: string;
  title: string;
  matchCount: number;
  status: "pending" | "won" | "lost"; // ✅ RESULT
  totalOdds: number;
  tier: ContentTier;
  matches: TicketMatch[];
}

interface TicketCardProps {
  ticket: BettingTicket;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
  isUnlocking?: boolean;
}

/* =====================
   Helpers
===================== */

function getTierBadge(tier: ContentTier) {
  switch (tier) {
    case "free":
      return (
        <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground">
          <Gift className="h-3 w-3" />
          Free
        </Badge>
      );
    case "daily":
      return (
        <Badge variant="secondary" className="gap-1 bg-accent/20 text-accent border-accent/30">
          <Sparkles className="h-3 w-3" />
          Daily
        </Badge>
      );
    case "exclusive":
      return (
        <Badge variant="secondary" className="gap-1 bg-primary/20 text-primary border-primary/30">
          <Star className="h-3 w-3" />
          Exclusive
        </Badge>
      );
    case "premium":
      return (
        <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning border-warning/30">
          <Crown className="h-3 w-3" />
          Premium
        </Badge>
      );
    default:
      return null;
  }
}

function getResultBadge(status: "pending" | "won" | "lost") {
  if (status === "won") {
    return (
      <Badge className="bg-success/20 text-success border-success/30 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Won
      </Badge>
    );
  }

  if (status === "lost") {
    return (
      <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
        <XCircle className="h-3 w-3" />
        Lost
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}

function getUnlockButtonText(unlockMethod: UnlockMethod): string {
  if (unlockMethod.type === "watch_ad") return "Watch Ad to Unlock";
  if (unlockMethod.type === "upgrade_basic") return "Upgrade to Basic";
  if (unlockMethod.type === "upgrade_premium") return "Upgrade to Premium";
  if (unlockMethod.type === "login_required") return "Sign in to Unlock";
  return "";
}

/* =====================
   Component
===================== */

export function TicketCard({ ticket, isLocked, unlockMethod, onUnlockClick, isUnlocking = false }: TicketCardProps) {
  const moreMatches = ticket.matchCount - ticket.matches.length;

  const getUnlockButton = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return null;

    const Icon =
      unlockMethod.type === "login_required"
        ? LogIn
        : unlockMethod.type === "watch_ad"
          ? Sparkles
          : unlockMethod.type === "upgrade_basic"
            ? Star
            : Crown;

    return (
      <Button
        variant="outline"
        className="w-full gap-2"
        disabled={isUnlocking}
        onClick={(e) => {
          e.stopPropagation();
          onUnlockClick();
        }}
      >
        {isUnlocking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Unlocking...
          </>
        ) : (
          <>
            <Icon className="h-4 w-4" />
            {getUnlockButtonText(unlockMethod)}
          </>
        )}
      </Button>
    );
  };

  return (
    <Card
      className={cn(
        "bg-card border-border overflow-hidden transition-all",
        isLocked && "cursor-pointer hover:border-primary/50",
      )}
      onClick={isLocked ? onUnlockClick : undefined}
    >
      {/* HEADER */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTierBadge(ticket.tier)}
            {getResultBadge(ticket.status)}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Ticket className="h-3 w-3" />
            {ticket.matchCount} matches
          </span>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{ticket.title}</h3>
          <span className={cn("font-bold", isLocked ? "text-muted-foreground blur-sm select-none" : "text-primary")}>
            @{ticket.totalOdds.toFixed(2)}
          </span>
        </div>
      </div>

      {/* MATCHES */}
      <div className="p-4 space-y-2">
        {isLocked ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-xs">Locked</span>
          </div>
        ) : (
          <>
            {ticket.matches.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{m.name}</span>
                <span className="text-primary font-medium">@{m.odds.toFixed(2)}</span>
              </div>
            ))}
            {moreMatches > 0 && <p className="text-xs text-muted-foreground text-center">+{moreMatches} more</p>}
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-border space-y-2">
        {getUnlockButton()}
        {!isLocked && (
          <Button variant="outline" className="w-full gap-2">
            <Unlock className="h-4 w-4" />
            View Full Ticket
          </Button>
        )}
      </div>
    </Card>
  );
}
