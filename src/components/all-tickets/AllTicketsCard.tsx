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

export function AllTicketsCard({
  ticket,
  isLocked,
  unlockMethod,
  onUnlockClick,
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
      ? "bg-accent hover:bg-accent/90 text-accent-foreground"
      : unlockMethod.type === "upgrade_basic"
        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
        : unlockMethod.type === "upgrade_premium" 
          ? "bg-gradient-to-r from-warning to-accent hover:opacity-90 text-white border-0" 
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
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-foreground">{ticket.title}</h3>
          <div className="flex items-center gap-2">
            {!isLocked ? (
              <>
                <Badge className="gap-1 bg-success/20 text-success border-success/30">
                  <CheckCircle2 className="h-3 w-3" />
                  Unlocked
                </Badge>
                <Badge variant="outline" className="text-muted-foreground border-border bg-muted/50">
                  Total Odds: {ticket.total_odds?.toFixed(2) || "0.00"}
                </Badge>
              </>
            ) : (
              getTierBadge(ticket.tier)
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{ticket.result === "pending" ? "Check" : ticket.result}</span>
      </div>

      {/* Matches */}
      <div className="px-4 pb-4 space-y-2">
        {isLocked ? (
          <>
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/50">
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
          </>
        ) : (
          <>
            {ticket.matches.map((match, idx) => (
              <div key={match.id || idx} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2">
                    <span className="text-success mt-0.5">↗</span>
                    <div className="flex flex-col gap-1">
                      <span className="text-foreground text-sm">{match.match_name}</span>
                      <Badge className="w-fit text-xs bg-success text-success-foreground rounded-full px-2 py-0.5">
                        {match.prediction}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-success font-medium text-sm">@{match.odds.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer - only show for locked state */}
      {isLocked && unlockMethod && unlockMethod.type !== "unlocked" && (
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
