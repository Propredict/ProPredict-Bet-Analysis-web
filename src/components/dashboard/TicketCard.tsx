import { Ticket, Clock, Lock, Play, Unlock, Star, Crown, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ContentTier, type UnlockMethod } from "@/hooks/useUserPlan";

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
}

export function TicketCard({ ticket, isLocked, unlockMethod, onUnlockClick }: TicketCardProps) {
  const moreMatches = ticket.matchCount - ticket.matches.length;

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

  const getTierBadge = () => {
    switch (ticket.tier) {
      case "free":
        return (
          <Badge className="bg-success text-success-foreground text-xs">
            FREE
          </Badge>
        );
      case "daily":
        return null; // No special badge for daily
      case "exclusive":
        return (
          <Badge className="bg-primary text-primary-foreground text-xs">
            <Star className="h-3 w-3 mr-1" />
            EXCLUSIVE
          </Badge>
        );
      case "premium":
        return (
          <Badge className="bg-warning text-warning-foreground text-xs">
            <Crown className="h-3 w-3 mr-1" />
            PREMIUM
          </Badge>
        );
      default:
        return null;
    }
  };

  const getUnlockButton = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return null;

    const Icon = unlockMethod.type === "watch_ad" ? Play : 
                 unlockMethod.type === "upgrade_basic" ? Star : Crown;
    
    const buttonClass = unlockMethod.type === "upgrade_premium" 
      ? "bg-warning hover:bg-warning/90 text-warning-foreground" 
      : "";

    return (
      <Button 
        variant={unlockMethod.type === "watch_ad" ? "outline" : "default"}
        className={cn("w-full gap-2", buttonClass)}
        onClick={onUnlockClick}
      >
        <Icon className="h-4 w-4" />
        {unlockMethod.message}
      </Button>
    );
  };

  return (
    <Card 
      className={cn(
        "bg-card border-border overflow-hidden transition-all",
        isLocked && "cursor-pointer hover:border-primary/50"
      )}
      onClick={isLocked ? onUnlockClick : undefined}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTierBadge()}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Ticket className="h-3 w-3" />
              {ticket.matchCount} Matches
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
            @{ticket.totalOdds.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Matches */}
      <div className="p-4 space-y-2">
        {isLocked ? (
          // Locked state: show placeholders
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
              <span className="text-xs">
                {unlockMethod && unlockMethod.type !== "unlocked" ? unlockMethod.message : "Locked"}
              </span>
            </div>
          </>
        ) : (
          // Unlocked state: show actual matches
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
            {moreMatches > 0 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{moreMatches} more
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
            @{ticket.totalOdds.toFixed(2)}
          </span>
        </div>
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
