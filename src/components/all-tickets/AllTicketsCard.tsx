import { Clock, Calendar, Star, Crown, Loader2, Lock, Sparkles, Gift, CheckCircle2, XCircle, LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicketWithMatches } from "@/hooks/useTickets";
import type { UnlockMethod } from "@/hooks/useUserPlan";
import { format } from "date-fns";

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
  const isUnlocked = !isLocked;
  const ticketDate = ticket.created_at_ts ? format(new Date(ticket.created_at_ts), "EEE, MMM d") : "";

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
        "bg-card overflow-hidden transition-all",
        isUnlocked ? "border-success/30" : "border-border",
        isLocked && !isUnlocking && "cursor-pointer hover:border-primary/50"
      )}
      onClick={isLocked && !isUnlocking ? onUnlockClick : undefined}
    >
      {/* Locked State */}
      {isLocked ? (
        <>
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
        </>
      ) : (
        /* Unlocked State - show all matches like tips design */
        <div className="space-y-4 p-4">
          {ticket.matches.map((match, idx) => (
            <div key={match.id || idx} className="p-4 bg-muted/20 rounded-lg border-l-2 border-l-success border border-border/50">
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
                  <span className="text-xs text-muted-foreground">{ticketDate}</span>
                  <Badge className="gap-1 bg-success/20 text-success border-success/30">
                    <CheckCircle2 className="h-3 w-3" />
                    Unlocked
                  </Badge>
                </div>
              </div>

              {/* Match Name */}
              <h3 className="font-semibold text-primary mb-4">{match.match_name}</h3>

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
          ))}
        </div>
      )}
    </Card>
  );
}
