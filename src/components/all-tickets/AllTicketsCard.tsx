import { Eye, Clock, Calendar, Star, Crown, Loader2, Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicketWithMatches } from "@/hooks/useTickets";
import type { UnlockMethod } from "@/hooks/useUserPlan";

interface AllTicketsCardProps {
  ticket: TicketWithMatches;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
  onProClick: () => void;
  isUnlocking: boolean;
}

function getTierConfig(tier: string) {
  switch (tier) {
    case "daily":
      return {
        icon: Calendar,
        label: "Daily",
        gradient: "from-primary/20 to-primary/5",
        badgeClass: "bg-primary/20 text-primary border-primary/30",
      };
    case "exclusive":
      return {
        icon: Star,
        label: "Exclusive",
        gradient: "from-accent/20 to-accent/5",
        badgeClass: "bg-accent/20 text-accent border-accent/30",
      };
    case "premium":
      return {
        icon: Crown,
        label: "Premium",
        gradient: "from-yellow-500/20 to-yellow-500/5",
        badgeClass: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      };
    default:
      return {
        icon: Calendar,
        label: "Free",
        gradient: "from-muted/20 to-muted/5",
        badgeClass: "bg-muted/20 text-muted-foreground border-muted/30",
      };
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "published":
      return {
        label: "Pending",
        className: "bg-accent/20 text-accent border-accent/30",
      };
    case "draft":
      return {
        label: "Draft",
        className: "bg-muted/20 text-muted-foreground border-muted/30",
      };
    default:
      return {
        label: "Pending",
        className: "bg-accent/20 text-accent border-accent/30",
      };
  }
}

export function AllTicketsCard({
  ticket,
  isLocked,
  unlockMethod,
  onUnlockClick,
  onProClick,
  isUnlocking,
}: AllTicketsCardProps) {
  const tierConfig = getTierConfig(ticket.tier);
  const statusConfig = getStatusBadge(ticket.status);
  const TierIcon = tierConfig.icon;

  // Show first 3 matches, then "+X more"
  const visibleMatches = ticket.matches.slice(0, 3);
  const hiddenCount = ticket.matches.length - 3;

  return (
    <Card className="overflow-hidden bg-card border-border">
      {/* Header with gradient */}
      <div className={cn("px-4 py-3 bg-gradient-to-r", tierConfig.gradient)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{ticket.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
              <Clock className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", tierConfig.badgeClass)}>
              <TierIcon className="h-3 w-3 mr-1" />
              {tierConfig.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Matches List */}
      <div className="p-4 space-y-3">
        {visibleMatches.map((match, index) => (
          <div key={match.id || index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <span className={cn(
              "text-sm",
              isLocked ? "text-muted-foreground" : "text-foreground"
            )}>
              {isLocked ? `Match ${index + 1}` : match.match_name}
            </span>
            <div className="flex items-center gap-2">
              {isLocked ? (
                <>
                  <span className="w-12 h-4 bg-muted/50 rounded blur-sm" />
                  <span className="w-8 h-4 bg-muted/50 rounded blur-sm" />
                </>
              ) : (
                <>
                  <Badge variant="secondary" className="text-xs">
                    {match.prediction}
                  </Badge>
                  <span className="text-sm font-medium text-primary">
                    {match.odds.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Hidden matches indicator */}
        {hiddenCount > 0 && (
          <div className="text-center text-sm text-muted-foreground py-1">
            +{hiddenCount} more
          </div>
        )}
      </div>

      {/* Total Odds */}
      <div className="px-4 py-3 border-t border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Odds</span>
          {isLocked ? (
            <span className="w-16 h-5 bg-primary/30 rounded blur-sm" />
          ) : (
            <span className="text-lg font-bold text-primary">
              {ticket.total_odds?.toFixed(2) || "—"}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isLocked && unlockMethod && (
        <div className="p-4 pt-0 flex items-center gap-2">
          {unlockMethod.type === "watch_ad" && (
            <Button
              onClick={onUnlockClick}
              disabled={isUnlocking}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isUnlocking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {isUnlocking ? "Unlocking..." : "Watch Ad to Unlock"}
            </Button>
          )}
          {unlockMethod.type === "upgrade_basic" && (
            <Button
              onClick={onUnlockClick}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Star className="h-4 w-4 mr-2" />
              Upgrade to Basic
            </Button>
          )}
          {unlockMethod.type === "upgrade_premium" && (
            <Button
              onClick={onUnlockClick}
              className="flex-1 bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium
            </Button>
          )}
          {unlockMethod.type === "login_required" && (
            <Button
              onClick={onUnlockClick}
              className="flex-1"
              variant="outline"
            >
              Sign in to Unlock
            </Button>
          )}
          
          {/* Pro button - always visible for locked content */}
          <Button
            variant="outline"
            size="sm"
            onClick={onProClick}
            className="border-warning/50 text-warning hover:bg-warning/10"
          >
            <Crown className="h-4 w-4 mr-1" />
            Pro
          </Button>
        </div>
      )}
    </Card>
  );
}
