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
import { parseMatchName } from "@/types/admin";

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
  if (unlockMethod.type === "upgrade_premium") return "Subscribe to Premium";
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
      return "";
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

  const getUnlockButtonIcon = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return null;
    if (unlockMethod.type === "login_required") return LogIn;
    if (unlockMethod.type === "watch_ad") return Sparkles;
    if (unlockMethod.type === "upgrade_basic") return Star;
    return Crown;
  };

  const displayedMatches = ticket.matches.slice(0, 3);
  const remainingCount = ticket.matchCount > 3 ? ticket.matchCount - 3 : 0;

  // Locked state - show title + match names visible, blur predictions/odds
  if (isLocked) {
    const Icon = getUnlockButtonIcon();
    
    return (
      <Card className="bg-card overflow-hidden transition-all border-border hover:border-primary/50">
        {/* Header - VISIBLE */}
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getTierBadge(ticket.tier)}
              <span className="text-xs text-muted-foreground">
                {ticket.matchCount} Matches
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Title - VISIBLE */}
        <div className="px-4 pb-3">
          <h3 className="font-bold text-lg text-foreground">{ticket.title}</h3>
          {ticketDate && <span className="text-xs text-muted-foreground">{ticketDate}</span>}
        </div>

        {/* Matches - Names visible, predictions/odds blurred */}
        <div className="px-4 pb-3 space-y-2">
          {displayedMatches.map((match, idx) => {
            const parsed = parseMatchName(match.name);
            return (
              <div key={idx} className="p-3 bg-muted/20 rounded-lg border border-border/50">
                <div className="flex items-center justify-between">
                  {/* Match name - VISIBLE */}
                  <div className="flex-1 mr-4 min-w-0">
                    <span className="text-sm text-foreground truncate block">
                      {parsed.homeTeam} vs {parsed.awayTeam}
                    </span>
                    {parsed.league && (
                      <span className="text-xs text-muted-foreground">{parsed.league}</span>
                    )}
                  </div>
                  {/* Prediction & Odds - BLURRED */}
                  <div className="flex items-center gap-2 blur-sm opacity-50">
                    <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                      {match.prediction || "???"}
                    </Badge>
                    <span className="text-sm font-medium text-primary">@{match.odds.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {remainingCount > 0 && (
            <div className="text-center pt-1">
              <span className="text-xs text-muted-foreground">+{remainingCount} more matches</span>
            </div>
          )}
        </div>

        {/* Total Odds - BLURRED */}
        <div className="px-4 py-3 bg-muted/20 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Odds</span>
            <span className="font-bold text-lg text-primary blur-sm opacity-50">@{ticket.totalOdds.toFixed(2)}</span>
          </div>
        </div>

        {/* Unlock Button - NOT BLURRED */}
        {unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="p-4 border-t border-border">
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
                  {Icon && <Icon className="h-4 w-4" />}
                  {getUnlockButtonText(unlockMethod)}
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // Unlocked state - full details visible
  return (
    <Card className="bg-card overflow-hidden transition-all border-primary/30 hover:border-primary/50">
      {/* Header with tier badge and status */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTierBadge(ticket.tier)}
            <span className="text-xs text-muted-foreground">
              {ticket.matchCount} Matches
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
              @{ticket.totalOdds.toFixed(2)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pb-3">
        <h3 className="font-bold text-lg text-foreground">{ticket.title}</h3>
        {ticketDate && <span className="text-xs text-muted-foreground">{ticketDate}</span>}
      </div>

      {/* Match list with predictions */}
      <div className="px-4 pb-3 space-y-2">
        {displayedMatches.length > 0 ? (
          displayedMatches.map((match, idx) => {
            const parsed = parseMatchName(match.name);
            return (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex-1 mr-4 min-w-0">
                  <span className="text-sm text-foreground truncate block">
                    {parsed.homeTeam} vs {parsed.awayTeam}
                  </span>
                  {parsed.league && (
                    <span className="text-xs text-muted-foreground">{parsed.league}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                    {match.prediction}
                  </Badge>
                  <span className="text-sm font-medium text-primary">@{match.odds.toFixed(2)}</span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground py-2">No matches in this ticket</p>
        )}
        
        {remainingCount > 0 && (
          <div className="text-center pt-1">
            <span className="text-xs text-muted-foreground">+{remainingCount} more</span>
          </div>
        )}
      </div>

      {/* Total Odds footer */}
      <div className="px-4 py-3 bg-muted/20 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Odds</span>
          <span className="font-bold text-lg text-primary">@{ticket.totalOdds.toFixed(2)}</span>
        </div>
      </div>

      {/* Unlocked badge footer */}
      <div className="px-4 py-3 border-t border-border/50">
        <Badge className="w-full justify-center gap-2 py-2 bg-success/20 text-success border-success/30">
          <CheckCircle2 className="h-4 w-4" />
          Ticket Unlocked
        </Badge>
      </div>
    </Card>
  );
}

/* =======================
   Exports
======================= */

export default TicketCard;