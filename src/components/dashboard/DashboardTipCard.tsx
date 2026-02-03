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

interface DashboardTipCardProps {
  tip: Tip;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
  onSecondaryUnlock?: () => void;
  isUnlocking?: boolean;
}

function getTierBadge(tier: ContentTier) {
  const baseClass = "gap-0.5 text-[9px] px-1.5 py-0";
  switch (tier) {
    case "free":
      return (
        <Badge variant="secondary" className={cn(baseClass, "tier-badge--free")}>
          <Gift className="h-2.5 w-2.5" />
          Free
        </Badge>
      );
    case "daily":
      return (
        <Badge variant="secondary" className={cn(baseClass, "tier-badge--daily")}>
          <Sparkles className="h-2.5 w-2.5" />
          Daily
        </Badge>
      );
    case "exclusive":
      return (
        <Badge variant="secondary" className={cn(baseClass, "tier-badge--pro")}>
          <Star className="h-2.5 w-2.5" />
          Pro
        </Badge>
      );
    case "premium":
      return (
        <Badge variant="secondary" className={cn(baseClass, "tier-badge--premium")}>
          <Crown className="h-2.5 w-2.5" />
          Premium
        </Badge>
      );
    default:
      return null;
  }
}

function getUnlockButtonText(unlockMethod: UnlockMethod): string {
  if (unlockMethod.type === "unlocked") return "";
  if (unlockMethod.type === "watch_ad") return "Watch Ad";
  if (unlockMethod.type === "android_watch_ad_or_pro") return unlockMethod.primaryMessage;
  if (unlockMethod.type === "android_premium_only") return unlockMethod.message;
  if (unlockMethod.type === "upgrade_basic") return "Pro";
  if (unlockMethod.type === "upgrade_premium") return "Premium";
  if (unlockMethod.type === "login_required") return "Sign in";
  return "";
}

export function DashboardTipCard({ tip, isLocked, unlockMethod, onUnlockClick, onSecondaryUnlock, isUnlocking = false }: DashboardTipCardProps) {
  const navigate = useNavigate();
  const isPremiumLocked = unlockMethod?.type === "upgrade_premium";
  const isBasicLocked = unlockMethod?.type === "upgrade_basic";

  const handleUnlockClick = () => {
    if (
      unlockMethod?.type === "watch_ad" ||
      unlockMethod?.type === "android_watch_ad_or_pro" ||
      unlockMethod?.type === "android_premium_only"
    ) {
      onUnlockClick();
      return;
    }
    
    if (isPremiumLocked || isBasicLocked) {
      navigate("/get-premium");
    } else if (unlockMethod?.type === "login_required") {
      navigate("/login");
    } else {
      onUnlockClick();
    }
  };

  const handleSecondaryClick = () => {
    if (getIsAndroidApp()) {
      if (window.Android?.getPro) {
        window.Android.getPro();
      } else if (window.Android?.buyPro) {
        window.Android.buyPro();
      }
      return;
    }
    
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
          <Badge className="bg-success/20 text-success border-success/30 text-[9px] px-1.5 py-0">
            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
            Won
          </Badge>
        );
      case "lost":
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[9px] px-1.5 py-0">
            <XCircle className="h-2.5 w-2.5 mr-0.5" />
            Lost
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-pending border-pending/30 bg-pending/10 text-[9px] px-1.5 py-0">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            Pending
          </Badge>
        );
    }
  };

  const getUnlockButtonStyle = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return "";
    if (unlockMethod.type === "login_required") return "";
    if (unlockMethod.type === "watch_ad" || unlockMethod.type === "android_watch_ad_or_pro") {
      return "bg-primary hover:bg-primary/90 text-white border-0";
    }
    if (unlockMethod.type === "android_premium_only" || unlockMethod.type === "upgrade_premium") {
      return "bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0";
    }
    if (unlockMethod.type === "upgrade_basic") {
      return "bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-white border-0";
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

  // Compact card base styles
  const cardBaseClass = cn(
    "rounded-lg border bg-card overflow-hidden transition-all",
    isLocked ? "border-border/60" : "border-primary/40 bg-card"
  );

  // Locked state
  if (isLocked) {
    const Icon = getUnlockButtonIcon();
    
    return (
      <div className={cardBaseClass}>
        <div className="p-2.5">
          {/* Header */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              {getTierBadge(tip.tier)}
              <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">
                {tip.league}
              </span>
            </div>
            {getStatusBadge()}
          </div>

          {/* Match Title */}
          <h3 className="font-semibold text-xs text-foreground mb-2 line-clamp-1">
            {tip.homeTeam} vs {tip.awayTeam}
          </h3>

          {/* Prediction - Blurred */}
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-border/40">
            <span className="text-[10px] text-muted-foreground">Tip</span>
            <div className="flex items-center gap-1.5 blur-sm opacity-50">
              <span className="text-[10px] font-medium">{tip.prediction}</span>
              <span className="text-[10px] font-bold text-primary">@{tip.odds.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Unlock Button */}
        {unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="px-2.5 pb-2.5">
            {unlockMethod.type === "android_watch_ad_or_pro" ? (
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1 gap-1 h-7 text-[10px] font-medium bg-primary hover:bg-primary/90 text-white border-0"
                  disabled={isUnlocking}
                  onClick={(e) => { e.stopPropagation(); onUnlockClick(); }}
                >
                  {isUnlocking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {isUnlocking ? "..." : "Ad"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] px-2"
                  onClick={(e) => { e.stopPropagation(); handleSecondaryClick(); }}
                >
                  <Star className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant={unlockMethod.type === "login_required" ? "outline" : "default"}
                size="sm"
                className={cn("w-full gap-1 h-7 text-[10px] font-medium", getUnlockButtonStyle())}
                disabled={isUnlocking}
                onClick={(e) => { e.stopPropagation(); handleUnlockClick(); }}
              >
                {isUnlocking ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    {Icon && <Icon className="h-3 w-3" />}
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
    <div className={cardBaseClass}>
      <div className="p-2.5">
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {getTierBadge(tip.tier)}
            <span className="text-[9px] text-primary truncate max-w-[80px]">
              {tip.league}
            </span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Match Title */}
        <h3 className="font-semibold text-xs text-foreground mb-2 line-clamp-1">
          {tip.homeTeam} vs {tip.awayTeam}
        </h3>

        {/* Prediction - Revealed */}
        <div className="flex items-center justify-between p-2 bg-primary/10 rounded border border-primary/20">
          <span className="text-[10px] text-muted-foreground">Tip</span>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0">
              {tip.prediction}
            </Badge>
            <span className="text-xs font-bold text-primary">@{tip.odds.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Unlocked indicator */}
      <div className="px-2.5 pb-2.5">
        <div className="flex items-center justify-center gap-1 py-1.5 bg-success/10 rounded border border-success/20">
          <CheckCircle2 className="h-3 w-3 text-success" />
          <span className="text-[10px] font-medium text-success">Unlocked</span>
        </div>
      </div>
    </div>
  );
}