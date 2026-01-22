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
        className: "bg-accent hover:bg-accent/90 text-accent-foreground",
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
        text: "Upgrade to Premium",
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

        <Card className="p-6 space-y-4 bg-card border-border">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-xl font-bold text-foreground">{ticket.title}</h1>
              <div className="flex items-center gap-2">
                {!isLocked ? (
                  <>
                    <Badge className="gap-1 bg-success/20 text-success border-success/30">
                      <CheckCircle2 className="h-3 w-3" />
                      Unlocked
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground border-border bg-muted/50">
                      Total Odds: {ticket.total_odds?.toFixed(2)}
                    </Badge>
                  </>
                ) : (
                  getTierBadge()
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Check</span>
          </div>

          {/* Matches */}
          <div className="space-y-2">
            {isLocked ? (
              <>
                {ticket.matches.map((_, idx) => (
                  <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">↗</span>
                        <div className="h-4 w-48 bg-muted rounded blur-sm" />
                      </div>
                      <div className="h-4 w-12 bg-muted rounded blur-sm" />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-center gap-2 pt-2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">Content Locked</span>
                </div>
              </>
            ) : (
              <>
                {ticket.matches.map((match, idx) => (
                  <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-2">
                        <span className="text-success mt-0.5">↗</span>
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground">{match.match_name}</span>
                          <Badge className="w-fit text-xs bg-success text-success-foreground rounded-full px-2 py-0.5">
                            {match.prediction}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-success font-medium">@{match.odds.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Unlock Button */}
          {isLocked && getUnlockButtonContent()}
        </Card>
      </div>
    </DashboardLayout>
  );
}
