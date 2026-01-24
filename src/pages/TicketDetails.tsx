import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, CheckCircle2, Crown, Star, Sparkles, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { parseMatchName } from "@/types/admin";

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { tickets, isLoading } = useTickets(false);
  const { getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler();

  const ticket = tickets.find((t) => t.id === id);
  const isUnlocking = unlockingId === id;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!ticket) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">Ticket not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const unlockMethod = getUnlockMethod(ticket.tier, "ticket", ticket.id);
  const isLocked = unlockMethod?.type !== "unlocked";

  const getTierBadge = () => {
    switch (ticket.tier) {
      case "daily":
        return (
          <Badge className="bg-accent/20 text-accent border-accent/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Daily
          </Badge>
        );
      case "exclusive":
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            <Star className="h-3 w-3 mr-1" />
            Pro
          </Badge>
        );
      case "premium":
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        );
      default:
        return null;
    }
  };

  const getUnlockButtonContent = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return null;

    const buttonConfig = {
      login_required: {
        icon: LogIn,
        text: "Sign in to Unlock",
        className: "",
        variant: "outline" as const,
      },
      watch_ad: {
        icon: Sparkles,
        text: "Watch Ad to Unlock",
        className: "bg-primary hover:bg-primary/90 text-primary-foreground",
        variant: "default" as const,
      },
      upgrade_basic: {
        icon: Star,
        text: "Upgrade to Pro",
        className: "bg-primary hover:bg-primary/90 text-primary-foreground",
        variant: "default" as const,
      },
      upgrade_premium: {
        icon: Crown,
        text: "Subscribe to Premium",
        className: "bg-gradient-to-r from-warning to-accent hover:opacity-90 text-white border-0",
        variant: "default" as const,
      },
    };

    const config = buttonConfig[unlockMethod.type];
    if (!config) return null;

    return (
      <Button
        variant={config.variant}
        size="lg"
        className={cn("w-full gap-2 h-12", config.className)}
        disabled={isUnlocking}
        onClick={() => handleUnlock("ticket", ticket.id, ticket.tier)}
      >
        {isUnlocking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Watching ad...
          </>
        ) : (
          <>
            <config.icon className="h-4 w-4" />
            {config.text}
          </>
        )}
      </Button>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card className={cn(
          "bg-card overflow-hidden",
          !isLocked ? "border-primary/30" : "border-border"
        )}>
          {/* Header - VISIBLE */}
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getTierBadge()}
                <span className="text-xs text-muted-foreground">
                  {ticket.matches?.length || 0} Matches
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isLocked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Badge className="gap-1 bg-success/20 text-success border-success/30">
                    <CheckCircle2 className="h-3 w-3" />
                    Unlocked
                  </Badge>
                )}
                {!isLocked && (
                  <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                    @{ticket.total_odds?.toFixed(2) || "1.00"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Title - VISIBLE */}
          <div className="px-3 sm:px-4 pb-2 sm:pb-3">
            <h1 className="font-bold text-sm sm:text-base text-foreground">{ticket.title}</h1>
          </div>

          {/* Matches */}
          <div className="px-4 pb-3 space-y-2">
            {isLocked ? (
              // Locked: Show match names visible, predictions/odds blurred
              <>
                {(ticket.matches || []).map((match, idx) => {
                  const parsed = parseMatchName(match.match_name);
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
                            {match.prediction}
                          </Badge>
                          <span className="text-sm font-medium text-primary">@{match.odds.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              // Unlocked: Full details visible
              <>
                {(ticket.matches || []).map((match, idx) => {
                  const parsed = parseMatchName(match.match_name);
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
                })}
              </>
            )}
          </div>

          {/* Total Odds - Blurred when locked */}
          <div className="px-4 py-3 bg-muted/20 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Odds</span>
              <span className={cn(
                "font-bold text-lg text-primary",
                isLocked && "blur-sm opacity-50"
              )}>
                @{ticket.total_odds?.toFixed(2) || "1.00"}
              </span>
            </div>
          </div>

          {/* Unlocked badge footer - only when unlocked */}
          {!isLocked && (
            <div className="px-4 py-3 border-t border-border/50">
              <Badge className="w-full justify-center gap-2 py-2 bg-success/20 text-success border-success/30">
                <CheckCircle2 className="h-4 w-4" />
                Ticket Unlocked
              </Badge>
            </div>
          )}

          {/* Unlock Button - only when locked, NOT BLURRED */}
          {isLocked && (
            <div className="p-4 border-t border-border">
              {getUnlockButtonContent()}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}