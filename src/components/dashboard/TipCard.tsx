import { Lock, Loader2, LogIn, Sparkles, Star, Crown, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ContentTier, type UnlockMethod } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";

export interface Tip {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  odds: number;
  confidence: number;
  kickoff: string;
  tier: ContentTier;
}

interface TipCardProps {
  tip: Tip;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
  isUnlocking?: boolean;
}

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
  if (unlockMethod.type === "upgrade_premium") return "Subscribe to Unlock";
  if (unlockMethod.type === "login_required") return "Sign in to Unlock";
  return "";
}

export function TipCard({ tip, isLocked, unlockMethod, onUnlockClick, isUnlocking = false }: TipCardProps) {
  const navigate = useNavigate();
  const isPremiumLocked = unlockMethod?.type === "upgrade_premium";

  const handleUnlockClick = () => {
    if (isPremiumLocked) {
      navigate("/get-premium");
    } else {
      onUnlockClick();
    }
  };

  const getUnlockButtonStyle = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return "";
    if (unlockMethod.type === "watch_ad") {
      return "bg-accent hover:bg-accent/90 text-accent-foreground border-accent";
    }
    if (unlockMethod.type === "upgrade_basic") {
      return "bg-primary hover:bg-primary/90 text-primary-foreground";
    }
    if (unlockMethod.type === "upgrade_premium") {
      return "bg-gradient-to-r from-accent to-primary hover:opacity-90 text-white border-0";
    }
    return "";
  };

  return (
    <Card 
      className={cn(
        "p-4 bg-card border-border transition-all overflow-hidden",
        isLocked && !isUnlocking && "cursor-pointer hover:border-primary/50"
      )}
      onClick={isLocked && !isUnlocking ? handleUnlockClick : undefined}
    >
      {/* Header with league and tier badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs">⚽</span>
          </div>
          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">
            {tip.league}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{tip.kickoff}</span>
          {getTierBadge(tip.tier)}
        </div>
      </div>

      {/* Match title */}
      <h3 className="font-medium text-foreground mb-3">
        {tip.homeTeam} vs {tip.awayTeam} - {tip.league}
      </h3>

      {/* Prediction/Odds/Confidence row */}
      <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg mb-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Prediction</p>
          {isLocked ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span className="text-sm">Locked</span>
            </div>
          ) : (
            <p className="text-sm font-medium text-foreground">{tip.prediction}</p>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Odds</p>
          <p className={cn(
            "text-sm font-medium",
            isLocked ? "text-muted-foreground" : "text-foreground"
          )}>
            {isLocked ? "--" : `@${tip.odds.toFixed(2)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Confidence</p>
          <div className="flex items-center justify-end gap-2">
            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-accent to-primary rounded-full"
                style={{ width: `${tip.confidence}%` }}
              />
            </div>
            <span className="text-sm font-medium text-accent">{tip.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Premium unlock button with gradient */}
      {isLocked && unlockMethod && unlockMethod.type !== "unlocked" && (
        <Button
          variant="default"
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
              {unlockMethod.type === "login_required" && <LogIn className="h-4 w-4" />}
              {unlockMethod.type === "watch_ad" && <Sparkles className="h-4 w-4" />}
              {unlockMethod.type === "upgrade_basic" && <Star className="h-4 w-4" />}
              {unlockMethod.type === "upgrade_premium" && <Crown className="h-4 w-4" />}
              {getUnlockButtonText(unlockMethod)}
            </>
          )}
        </Button>
      )}
    </Card>
  );
}