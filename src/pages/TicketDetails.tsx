import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, CheckCircle2, Crown, Star, Sparkles, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isUnlocking, setIsUnlocking] = useState(false);

  const { tickets, isLoading } = useTickets(false);
  const { canAccess, getUnlockMethod, unlockContent } = useUserPlan();

  const ticket = tickets.find((t) => t.id === id);

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

  const handleUnlock = async () => {
    if (!unlockMethod) return;

    if (unlockMethod.type === "login_required") {
      navigate("/login");
      return;
    }

    if (unlockMethod.type === "watch_ad") {
      setIsUnlocking(true);
      toast.info("Playing rewarded ad...", { duration: 2000 });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const success = await unlockContent("ticket", ticket.id);
      if (success) {
        toast.success("Ticket unlocked! Valid until midnight UTC.");
      } else {
        toast.error("Failed to unlock. Please try again.");
      }
      setIsUnlocking(false);
      return;
    }

    if (unlockMethod.type === "upgrade_basic" || unlockMethod.type === "upgrade_premium") {
      navigate("/get-premium");
    }
  };

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
            Exclusive
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
        onClick={handleUnlock}
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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">{ticket.title}</h1>
            <div className="flex items-center gap-2">
              {!isLocked && (
                <Badge className="bg-success/20 text-success border-success/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Unlocked
                </Badge>
              )}
              {getTierBadge()}
            </div>
          </div>

          {/* Matches */}
          <div className="space-y-2">
            {ticket.matches.map((match, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex items-center justify-between border-b border-border pb-2",
                  isLocked && "blur-sm select-none"
                )}
              >
                <span className="text-foreground">{match.match_name}</span>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">
                    {match.prediction}
                  </Badge>
                  <span className="font-semibold text-primary">@{match.odds.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Locked indicator */}
          {isLocked && (
            <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Content Locked</span>
            </div>
          )}

          {/* Total Odds */}
          <div className="flex justify-between pt-4 border-t border-border">
            <span className="text-muted-foreground">Total Odds</span>
            <span className={cn(
              "text-xl font-bold",
              isLocked ? "text-muted-foreground blur-sm select-none" : "text-primary"
            )}>
              @{ticket.total_odds.toFixed(2)}
            </span>
          </div>

          {/* Unlock Button */}
          {isLocked && getUnlockButtonContent()}
        </Card>
      </div>
    </DashboardLayout>
  );
}
