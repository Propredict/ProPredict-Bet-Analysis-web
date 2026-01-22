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
import { format } from "date-fns";

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
  createdAt?: string;
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
          Pro
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
  if (unlockMethod.type === "upgrade_basic") return "Upgrade to Pro";
  if (unlockMethod.type === "upgrade_premium") return "Upgrade to Premium";
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
  const isBasicLocked = unlockMethod?.type === "upgrade_basic";
  const isUnlocked = unlockMethod?.type === "unlocked";
  const ticketDate = ticket.createdAt && !isNaN(new Date(ticket.createdAt).getTime())
    ? format(new Date(ticket.createdAt), "EEE, MMM d")
    : "";

  const handleUnlockClick = () => {
    if (isPremiumLocked || isBasicLocked) {
      navigate("/get-premium");
    } else if (unlockMethod?.type === "login_required") {
      navigate("/login");
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
    if (unlockMethod.type === "login_required") {
      return ""; // Uses variant="outline"
    }
    if (unlockMethod.type === "watch_ad") {
      return "bg-accent hover:bg-accent/90 text-accent-foreground border-accent";
    }
    if (unlockMethod.type === "upgrade_basic") {
      return "bg-primary hover:bg-primary/90 text-primary-foreground";
    }
    if (unlockMethod.type === "upgrade_premium") {
      return "bg-gradient-to-r from-warning to-accent hover:opacity-90 text-white border-0";
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
        variant={unlockMethod.type === "login_required" ? "outline" : "default"}
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

  // Locked state
  if (isLocked) {
    return (
      <Card className="bg-card overflow-hidden transition-all border-border hover:border-primary/50">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground">{ticket.title}</h3>
            <div className="flex items-center gap-2">
              {getTierBadge(ticket.tier)}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Check</span>
        </div>

        {/* Locked Matches Placeholder */}
        <div className="px-4 pb-4 space-y-2">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="p-3 bg-muted/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">↗</span>
                  <div className="h-4 w-40 bg-muted rounded blur-sm" />
                </div>
                <div className="h-4 w-12 bg-muted rounded blur-sm" />
              </div>
            </div>
          ))}
          <div className="flex items-center justify-center gap-2 pt-2 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-xs">Locked</span>
          </div>
        </div>

        {/* Footer - unlock CTA */}
        {unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Sparkles className="h-4 w-4" />
                <span>Watch ad to unlock predictions</span>
              </div>
              {getUnlockButton()}
            </div>
          </div>
        )}
      </Card>
    );
  }

  // Unlocked state - tips-style design
  return (
    <Card className="bg-card overflow-hidden transition-all border-success/30">
      <div className="space-y-4 p-4">
        {ticket.matches.length > 0 ? (
          ticket.matches.map((match, idx) => (
            <div key={idx} className="p-4 bg-muted/20 rounded-lg border-l-2 border-l-success border border-border/50">
              {/* Match Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs">⚽</span>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                    {ticket.title}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {ticketDate && <span className="text-xs text-muted-foreground">{ticketDate}</span>}
                  <Badge className="gap-1 bg-success/20 text-success border-success/30">
                    <CheckCircle2 className="h-3 w-3" />
                    Unlocked
                  </Badge>
                </div>
              </div>

              {/* Match Name */}
              <h3 className="font-semibold text-primary mb-4">{match.name}</h3>

              {/* Prediction Row */}
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Prediction</p>
                  <p className="font-medium text-foreground">{match.prediction}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Odds</p>
                  <p className="font-medium text-success">@{match.odds.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-12 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-success to-primary rounded-full" 
                        style={{ width: '70%' }} 
                      />
                    </div>
                    <span className="text-sm text-success">70%</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 bg-muted/20 rounded-lg border-l-2 border-l-success border border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{ticket.title}</h3>
              <div className="flex items-center gap-2">
                <Badge className="gap-1 bg-success/20 text-success border-success/30">
                  <CheckCircle2 className="h-3 w-3" />
                  Unlocked
                </Badge>
                <Badge variant="outline" className="text-muted-foreground border-border bg-muted/50">
                  Total Odds: {ticket.totalOdds.toFixed(2)}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">No matches in this ticket</p>
          </div>
        )}
      </div>
    </Card>
  );
}

/* =======================
   Exports
======================= */

export default TicketCard;
