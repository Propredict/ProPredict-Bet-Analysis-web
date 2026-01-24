import { Lock, Loader2, LogIn, Sparkles, Star, Crown, Gift, CheckCircle2 } from "lucide-react";
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

export function TipCard({ tip, isLocked, unlockMethod, onUnlockClick, isUnlocking = false }: TipCardProps) {
  const navigate = useNavigate();
  const isPremiumLocked = unlockMethod?.type === "upgrade_premium";
  const isBasicLocked = unlockMethod?.type === "upgrade_basic";

  const handleUnlockClick = () => {
    if (isPremiumLocked || isBasicLocked) {
      navigate("/get-premium");
    } else if (unlockMethod?.type === "login_required") {
      navigate("/login");
    } else {
      onUnlockClick();
    }
  };

  const getUnlockButtonStyle = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return "";
    if (unlockMethod.type === "login_required") {
      return "";
    }
    if (unlockMethod.type === "watch_ad") {
      return "bg-accent hover:bg-accent/90 text-accent-foreground border-accent";
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

  // Locked state - compact design
  if (isLocked) {
    const Icon = getUnlockButtonIcon();
    
    return (
      <Card className="bg-card border-border transition-all overflow-hidden hover:border-primary/50">
        {/* Header */}
        <div className="p-2.5 sm:p-3 pb-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              {getTierBadge(tip.tier)}
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-[10px] px-1.5">
                {tip.league}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{tip.kickoff}</span>
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Match title */}
        <div className="px-2.5 sm:px-3 pb-1.5">
          <h3 className="font-semibold text-xs sm:text-sm text-foreground">{tip.homeTeam} vs {tip.awayTeam}</h3>
        </div>

        {/* Prediction details - Blurred */}
        <div className="px-2.5 sm:px-3 pb-1.5">
          <div className="p-1.5 sm:p-2 bg-muted/20 rounded border border-border/50 space-y-1 text-[10px] sm:text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prediction</span>
              <span className="blur-sm opacity-50 font-medium">{tip.prediction}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Odds</span>
              <span className="blur-sm opacity-50 font-medium text-primary">@{tip.odds.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Unlock button */}
        {unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="p-2.5 sm:p-3 pt-1.5 border-t border-border">
            <Button
              variant={unlockMethod.type === "login_required" ? "outline" : "default"}
              size="sm"
              className={cn("w-full gap-1 h-7 sm:h-8 text-[10px] sm:text-xs", getUnlockButtonStyle())}
              disabled={isUnlocking}
              onClick={(e) => {
                e.stopPropagation();
                handleUnlockClick();
              }}
            >
              {isUnlocking ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Watching ad...
                </>
              ) : (
                <>
                  {Icon && <Icon className="h-3 w-3" />}
                  {getUnlockButtonText(unlockMethod)}
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // Unlocked state - compact design
  return (
    <Card className="bg-card border-primary/30 transition-all overflow-hidden hover:border-primary/50">
      {/* Header */}
      <div className="p-2.5 sm:p-3 pb-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            {getTierBadge(tip.tier)}
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5">
              {tip.league}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{tip.kickoff}</span>
            <Badge className="gap-0.5 bg-success/20 text-success border-success/30 text-[10px] px-1">
              <CheckCircle2 className="h-2.5 w-2.5" />
            </Badge>
          </div>
        </div>
      </div>

      {/* Match title */}
      <div className="px-2.5 sm:px-3 pb-1.5">
        <h3 className="font-semibold text-xs sm:text-sm text-foreground">{tip.homeTeam} vs {tip.awayTeam}</h3>
      </div>

      {/* Prediction details */}
      <div className="px-2.5 sm:px-3 pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center justify-between py-1 border-b border-border/30">
          <span className="text-muted-foreground">Prediction</span>
          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5">
            {tip.prediction}
          </Badge>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground">Odds</span>
          <span className="font-bold text-primary">@{tip.odds.toFixed(2)}</span>
        </div>
      </div>
    </Card>
  );
}