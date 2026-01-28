import { Lock, Loader2, LogIn, Sparkles, Star, Crown, Gift, CheckCircle2 } from "lucide-react";
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

function getTierCardClass(tier: ContentTier, isLocked: boolean): string {
  const base = "tier-card";
  const unlocked = !isLocked ? "tier-card--unlocked" : "";
  
  switch (tier) {
    case "daily":
      return cn(base, "tier-card--daily", unlocked);
    case "exclusive":
      return cn(base, "tier-card--pro", unlocked);
    case "premium":
      return cn(base, "tier-card--premium", unlocked);
    default:
      return cn(base, "tier-card--free", unlocked);
  }
}

function getTierBadge(tier: ContentTier) {
  switch (tier) {
    case "free":
      return (
        <Badge variant="secondary" className="gap-1 tier-badge--free text-[10px] px-2 py-0.5">
          <Gift className="h-3 w-3" />
          Free
        </Badge>
      );
    case "daily":
      return (
        <Badge variant="secondary" className="gap-1 tier-badge--daily text-[10px] px-2 py-0.5">
          <Sparkles className="h-3 w-3" />
          Daily
        </Badge>
      );
    case "exclusive":
      return (
        <Badge variant="secondary" className="gap-1 tier-badge--pro text-[10px] px-2 py-0.5">
          <Star className="h-3 w-3" />
          Pro
        </Badge>
      );
    case "premium":
      return (
        <Badge variant="secondary" className="gap-1 tier-badge--premium text-[10px] px-2 py-0.5">
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
  if (unlockMethod.type === "watch_ad") return "Watch Ad to Unlock"; // Kept for future Android use
  if (unlockMethod.type === "upgrade_basic") return "Get Pro to unlock";
  if (unlockMethod.type === "upgrade_premium") return "Get Premium to unlock";
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
      return "bg-primary hover:bg-primary/90 text-white border-0";
    }
    if (unlockMethod.type === "upgrade_basic") {
      return "bg-gradient-to-r from-warning via-accent to-primary hover:opacity-90 text-white border-0";
    }
    if (unlockMethod.type === "upgrade_premium") {
      return "bg-gradient-to-r from-warning via-accent to-primary hover:opacity-90 text-white border-0";
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

  // Locked state
  if (isLocked) {
    const Icon = getUnlockButtonIcon();
    
    return (
      <div className={getTierCardClass(tip.tier, isLocked)}>
        {/* Card Header */}
        <div className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getTierBadge(tip.tier)}
              <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-muted/50 rounded-full">
                {tip.league}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{tip.kickoff}</span>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Match Title */}
          <h3 className="font-bold text-sm sm:text-base text-foreground mb-3">
            {tip.homeTeam} vs {tip.awayTeam}
          </h3>

          {/* Prediction Details - Blurred */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Prediction</span>
              <span className="blur-sm opacity-50 font-medium text-sm">{tip.prediction}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Odds</span>
              <span className="blur-sm opacity-50 font-bold text-primary">@{tip.odds.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Card Footer - Unlock Button */}
        {unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="p-3 sm:p-4 pt-0">
            <Button
              variant={unlockMethod.type === "login_required" ? "outline" : "default"}
              size="sm"
              className={cn("w-full gap-1.5 h-9 text-xs font-medium", getUnlockButtonStyle())}
              disabled={isUnlocking}
              onClick={(e) => {
                e.stopPropagation();
                handleUnlockClick();
              }}
            >
              {isUnlocking ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Watching ad...
                </>
              ) : (
                <>
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {getUnlockButtonText(unlockMethod)}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Unlocked state
  return (
    <div className={getTierCardClass(tip.tier, isLocked)}>
      {/* Card Header */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTierBadge(tip.tier)}
            <span className="text-[10px] text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
              {tip.league}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">{tip.kickoff}</span>
        </div>

        {/* Match Title */}
        <h3 className="font-bold text-sm sm:text-base text-foreground mb-3">
          {tip.homeTeam} vs {tip.awayTeam}
        </h3>

        {/* Prediction Details - Revealed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-xs text-muted-foreground">Prediction</span>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-2">
              {tip.prediction}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-muted-foreground">Odds</span>
            <span className="font-bold text-base text-primary">@{tip.odds.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Unlocked Footer */}
      <div className="p-3 sm:p-4 pt-0">
        <div className="flex items-center justify-center gap-2 py-2.5 px-3 bg-success/10 rounded-lg border border-success/20">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-xs font-medium text-success">Tip Unlocked</span>
        </div>
      </div>
    </div>
  );
}
