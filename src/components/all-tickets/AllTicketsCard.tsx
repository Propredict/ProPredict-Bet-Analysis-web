import { Star, Crown, Loader2, Lock, Sparkles, Gift, CheckCircle2, LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicketWithMatches } from "@/hooks/useTickets";
import type { UnlockMethod } from "@/hooks/useUserPlan";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { parseMatchName } from "@/types/admin";

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

export function AllTicketsCard({
  ticket,
  isLocked,
  unlockMethod,
  onUnlockClick,
  isUnlocking,
}: AllTicketsCardProps) {
  const navigate = useNavigate();
  const isUnlocked = !isLocked;
  const ticketDate = ticket.created_at_ts ? format(new Date(ticket.created_at_ts), "EEE, MMM d") : "";
  const matchCount = ticket.matches?.length || 0;
  const displayedMatches = ticket.matches?.slice(0, 3) || [];
  const remainingCount = matchCount > 3 ? matchCount - 3 : 0;
  const totalOdds = ticket.total_odds || 0;

  const handleUnlockClick = () => {
    if (unlockMethod?.type === "upgrade_basic" || unlockMethod?.type === "upgrade_premium") {
      navigate("/get-premium");
    } else if (unlockMethod?.type === "login_required") {
      navigate("/login");
    } else {
      onUnlockClick();
    }
  };

  const getUnlockButtonStyle = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return "";
    if (unlockMethod.type === "login_required") return "";
    if (unlockMethod.type === "watch_ad") {
      return "bg-accent hover:bg-accent/90 text-accent-foreground";
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

  // Locked State - show title + match names visible, blur predictions/odds
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
                {matchCount} Matches
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
            const parsed = parseMatchName(match.match_name);
            return (
              <div key={match.id || idx} className="p-3 bg-muted/20 rounded-lg border border-border/50">
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
                      {match.prediction}
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
            <span className="font-bold text-lg text-primary blur-sm opacity-50">@{totalOdds.toFixed(2)}</span>
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

  // Unlocked State - full details visible
  return (
    <Card className="bg-card overflow-hidden transition-all border-success/30">
      {/* Header with tier badge and status */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTierBadge(ticket.tier)}
            <span className="text-xs text-muted-foreground">
              {matchCount} Matches
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1 bg-success/20 text-success border-success/30">
              <CheckCircle2 className="h-3 w-3" />
              Unlocked
            </Badge>
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
              @{totalOdds.toFixed(2)}
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
            const parsed = parseMatchName(match.match_name);
            return (
              <div key={match.id || idx} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
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
          <span className="font-bold text-lg text-primary">@{totalOdds.toFixed(2)}</span>
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