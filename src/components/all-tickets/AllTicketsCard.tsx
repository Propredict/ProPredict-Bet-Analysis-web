import { Clock, Calendar, Star, Crown, Loader2, Ticket, Lock, Sparkles, Gift, CheckCircle2, XCircle, LogIn, Unlock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicketWithMatches } from "@/hooks/useTickets";
import type { UnlockMethod, ContentTier } from "@/hooks/useUserPlan";

interface AllTicketsCardProps {
  ticket: TicketWithMatches;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
  onProClick: () => void;
  isUnlocking: boolean;
}

function getTierBadge(tier: string) {
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
        <Badge variant="secondary" className="gap-1 bg-primary/20 text-primary border-primary/30">
          <Calendar className="h-3 w-3" />
          Daily
        </Badge>
      );
    case "exclusive":
      return (
        <Badge variant="secondary" className="gap-1 bg-accent/20 text-accent border-accent/30">
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
  if (unlockMethod.type === "upgrade_premium") return "Upgrade to Premium";
  if (unlockMethod.type === "login_required") return "Sign in to Unlock";
  return "";
}

export function AllTicketsCard({
  ticket,
  isLocked,
  unlockMethod,
  onUnlockClick,
  onProClick,
  isUnlocking,
}: AllTicketsCardProps) {
  const matchCount = ticket.matches?.length || 0;
  const visibleMatches = ticket.matches?.slice(0, 3) || [];
  const hiddenCount = matchCount > 3 ? matchCount - 3 : 0;

  const getStatusBadge = () => {
    switch (ticket.result) {
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
          <Badge variant="outline" className="text-accent border-accent/30 bg-accent/10">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getUnlockButton = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return null;

    const Icon = unlockMethod.type === "login_required" ? LogIn :
                 unlockMethod.type === "watch_ad" ? Sparkles : 
                 unlockMethod.type === "upgrade_basic" ? Star : Crown;
    
    const buttonClass = unlockMethod.type === "watch_ad"
      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
      : unlockMethod.type === "upgrade_basic"
        ? "bg-accent hover:bg-accent/90 text-accent-foreground"
        : unlockMethod.type === "upgrade_premium" 
          ? "bg-warning hover:bg-warning/90 text-warning-foreground" 
          : "";

    return (
      <Button 
        className={cn("flex-1 gap-2", buttonClass)}
        disabled={isUnlocking}
        onClick={(e) => {
          e.stopPropagation();
          onUnlockClick();
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
    <Card 
      className={cn(
        "bg-card border-border overflow-hidden transition-all",
        isLocked && !isUnlocking && "cursor-pointer hover:border-primary/50"
      )}
      onClick={isLocked && !isUnlocking ? onUnlockClick : undefined}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTierBadge(ticket.tier)}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Ticket className="h-3 w-3" />
              {matchCount} Matches
            </span>
          </div>
          {getStatusBadge()}
        </div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{ticket.title}</h3>
          <span className={cn(
            "font-bold",
            isLocked ? "text-muted-foreground blur-sm select-none" : "text-primary"
          )}>
            @{ticket.total_odds?.toFixed(2) || "0.00"}
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
            {visibleMatches.map((match, idx) => (
              <div key={match.id || idx} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{match.match_name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {match.prediction}
                  </Badge>
                  <span className="text-primary font-medium">@{match.odds.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {hiddenCount > 0 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{hiddenCount} more
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Total Odds</span>
          <span className={cn(
            "font-bold text-lg",
            isLocked ? "text-muted-foreground blur-sm select-none" : "text-primary"
          )}>
            @{ticket.total_odds?.toFixed(2) || "0.00"}
          </span>
        </div>
        
        {isLocked && unlockMethod && unlockMethod.type !== "unlocked" ? (
          <div className="flex items-center gap-2">
            {getUnlockButton()}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onProClick();
              }}
              className="border-warning/50 text-warning hover:bg-warning/10"
            >
              <Crown className="h-4 w-4 mr-1" />
              Pro
            </Button>
          </div>
        ) : !isLocked ? (
          <Button variant="outline" className="w-full gap-2">
            <Unlock className="h-4 w-4" />
            View Full Ticket
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
