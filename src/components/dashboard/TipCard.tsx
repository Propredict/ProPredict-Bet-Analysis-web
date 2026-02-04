import { Lock, Loader2, LogIn, Sparkles, Star, Crown, Gift, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ContentTier, type UnlockMethod } from "@/hooks/useUserPlan";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useNavigate } from "react-router-dom";

export type TipResult = "pending" | "won" | "lost";

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
  result?: TipResult | null;
}

interface TipCardProps {
  tip: Tip;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
  onSecondaryUnlock?: () => void;
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
  if (unlockMethod.type === "watch_ad") return "Watch Ad to Unlock";
  if (unlockMethod.type === "android_watch_ad_or_pro") return unlockMethod.primaryMessage;
  if (unlockMethod.type === "android_premium_only") return unlockMethod.message;
  if (unlockMethod.type === "upgrade_basic") return "Unlock with Pro";
  if (unlockMethod.type === "upgrade_premium") return "Unlock with Premium";
  if (unlockMethod.type === "login_required") return "Sign in to Unlock";
  return "";
}

export function TipCard({ tip, isLocked, unlockMethod, onUnlockClick, onSecondaryUnlock, isUnlocking = false }: TipCardProps) {
  const navigate = useNavigate();
  const isPremiumLocked = unlockMethod?.type === "upgrade_premium";
  const isBasicLocked = unlockMethod?.type === "upgrade_basic";
  const isAndroidPremium = unlockMethod?.type === "android_premium_only";

  const handleUnlockClick = () => {
    // Android: Navigate to paywall for premium content (no direct purchase)
    if (unlockMethod?.type === "android_premium_only") {
      navigate("/get-premium");
      return;
    }
    
    // Android-specific unlock types - call onUnlockClick (triggers native bridge for ads)
    if (
      unlockMethod?.type === "watch_ad" ||
      unlockMethod?.type === "android_watch_ad_or_pro"
    ) {
      onUnlockClick();
      return;
    }
    
    // Web-only redirects
    if (isPremiumLocked || isBasicLocked) {
      navigate("/get-premium");
    } else if (unlockMethod?.type === "login_required") {
      navigate("/login");
    } else {
      onUnlockClick();
    }
  };

  const handleSecondaryClick = () => {
    // Android: Navigate to paywall (no direct purchase trigger)
    if (getIsAndroidApp()) {
      navigate("/get-premium");
      return;
    }
    
    // Web-only fallback
    if (onSecondaryUnlock) {
      onSecondaryUnlock();
    } else {
      navigate("/get-premium");
    }
  };

  const getStatusBadge = () => {
    const status = tip.result ?? "pending";
    switch (status) {
      case "won":
        return (
          <Badge className="bg-success/20 text-success border-success/30 text-[10px] px-2">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Won
          </Badge>
        );
      case "lost":
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] px-2">
            <XCircle className="h-3 w-3 mr-1" />
            Lost
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-pending border-pending/30 bg-pending/10 text-[10px] px-2">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getUnlockButtonStyle = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return "";
    if (unlockMethod.type === "login_required") {
      return "";
    }
    if (unlockMethod.type === "watch_ad" || unlockMethod.type === "android_watch_ad_or_pro") {
      return "bg-primary hover:bg-primary/90 text-white border-0";
    }
    if (unlockMethod.type === "android_premium_only") {
      return "bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0";
    }
    if (unlockMethod.type === "upgrade_basic") {
      return "bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-white border-0";
    }
    if (unlockMethod.type === "upgrade_premium") {
      return "bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0";
    }
    return "";
  };

  const getUnlockButtonIcon = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return null;
    if (unlockMethod.type === "login_required") return LogIn;
    if (unlockMethod.type === "watch_ad" || unlockMethod.type === "android_watch_ad_or_pro") return Sparkles;
    if (unlockMethod.type === "android_premium_only") return Crown;
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
              {getStatusBadge()}
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
              <span className="text-xs text-muted-foreground">Value</span>
              <span className="blur-sm opacity-50 font-bold text-primary">@{tip.odds.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Card Footer - Unlock Button */}
        {unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="p-3 sm:p-4 pt-0">
            {/* Android dual-button layout for Pro/Exclusive content */}
            {unlockMethod.type === "android_watch_ad_or_pro" ? (
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  className="w-full gap-1.5 h-9 text-xs font-medium bg-primary hover:bg-primary/90 text-white border-0"
                  disabled={isUnlocking}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlockClick();
                  }}
                >
                  {isUnlocking ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Watching ad...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      {unlockMethod.primaryMessage}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "w-full h-7 text-[10px] font-medium",
                    getIsAndroidApp()
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-white border-0"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  variant={getIsAndroidApp() ? "default" : "ghost"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSecondaryClick();
                  }}
                >
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  {unlockMethod.secondaryMessage}
                </Button>
              </div>
            ) : (
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
            )}
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
          <div className="flex items-center gap-1.5">
            {getStatusBadge()}
          </div>
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
            <span className="text-xs text-muted-foreground">Value</span>
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
