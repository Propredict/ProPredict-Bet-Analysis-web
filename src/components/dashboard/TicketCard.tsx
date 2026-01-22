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
import { useNavigate } from "react-router-dom";

/* =======================
   Types
======================= */

export interface TicketMatch {
  name: string;
  prediction: string;
  odds: number;
}

export interface BettingTicket {
  id: string;
  title: string;
  matchCount: number;
  status: "pending" | "won" | "lost";
  totalOdds: number;
  tier: ContentTier;
  matches: TicketMatch[];
}

interface TicketCardProps {
  ticket: BettingTicket;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
  onViewTicket?: () => void;
  isUnlocking?: boolean;
}

/* =======================
   Helpers
======================= */

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

function getUnlockButtonText(unlockMethod: UnlockMethod): string {
  if (unlockMethod.type === "unlocked") return "";
  if (unlockMethod.type === "watch_ad") return "Watch Ad to Unlock";
  if (unlockMethod.type === "upgrade_basic") return "Upgrade to Basic";
  if (unlockMethod.type === "upgrade_premium") return "Subscribe to Unlock";
  if (unlockMethod.type === "login_required") return "Sign in to Unlock";
  return "";
}

/* =======================
   Component
======================= */

function TicketCard({
  ticket,
  isLocked,
  unlockMethod,
  onUnlockClick,
  onViewTicket,
  isUnlocking = false,
}: TicketCardProps) {
  const navigate = useNavigate();
  const moreMatches = ticket.matchCount - ticket.matches.length;
  const isPremiumLocked = unlockMethod?.type === "upgrade_premium";

  const handleUnlockClick = () => {
    if (isPremiumLocked) {
      navigate("/get-premium");
    } else {
      onUnlockClick();
    }
  };

  const getStatusBadge = () => {
    switch (ticket.status) {
      case "won":
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Won
          </Badge>
        );
      case "lost":
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30">
            <XCircle className="h-3 w-3 mr-1" />
            Lost
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-pending border-pending/30 bg-pending/10">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getUnlockButtonStyle = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return "";
    if (unlockMethod.type === "watch_ad") {
      return "bg-accent hover:bg-accent/90 text-accent-foreground border-accent";
    }
    if (unlockMethod.type === "upgrade_basic") {
      return "bg-primary hover:bg-primary/90 text-primary-foreground";
    }
    if (unlockMethod.type === "upgrade_premium") {
      return "bg-gradient-to-r from-accent to-primary hover:opacity-90 text-white border-0";
    }
    return "";
  };

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
        variant="default"
        size="lg"
        className={cn("w-full gap-2 h-12", getUnlockButtonStyle())}
        disabled={isUnlocking}
        onClick={(e) => {
          e.stopPropagation();
          handleUnlockClick();
        }}
      >
        {isUnlocking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Watching ad...
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
    <Card className={cn("bg-card border-border overflow-hidden transition-all", "hover:border-primary/50")}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTierBadge(ticket.tier)}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Ticket className="h-3 w-3" />
              {ticket.matchCount} Matches
            </span>
          </div>
          {getStatusBadge()}
        </div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{ticket.title}</h3>
          <span className={cn("font-bold", isLocked ? "text-muted-foreground blur-sm select-none" : "text-primary")}>
            @{ticket.totalOdds.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Matches */}
      <div className="p-4 space-y-2">
        {isLocked ? (
          <>
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="h-4 w-32 bg-muted rounded blur-sm" />
                <div className="flex items-center gap-2">
                  <div className="h-5 w-14 bg-muted rounded blur-sm" />
                  <div className="h-5 w-10 bg-primary/30 rounded blur-sm" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-center gap-2 pt-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-xs">Locked</span>
            </div>
          </>
        ) : (
          <>
            {ticket.matches.map((match, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{match.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {match.prediction}
                  </Badge>
                  <span className="text-primary font-medium">@{match.odds.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {moreMatches > 0 && <p className="text-xs text-muted-foreground text-center pt-2">+{moreMatches} more</p>}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Odds</span>
          <span
            className={cn("font-bold text-lg", isLocked ? "text-muted-foreground blur-sm select-none" : "text-primary")}
          >
            @{ticket.totalOdds.toFixed(2)}
          </span>
        </div>

        {getUnlockButton()}

        {!isLocked && onViewTicket && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={(e) => {
              e.stopPropagation();
              onViewTicket();
            }}
          >
            <Unlock className="h-4 w-4" />
            View Full Ticket
          </Button>
        )}
      </div>
    </Card>
  );
}

/* =======================
   Exports
======================= */

export default TicketCard;
