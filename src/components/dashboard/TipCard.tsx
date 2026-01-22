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
  if (unlockMethod.type === "upgrade_premium") return "Upgrade to Premium";
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
      return ""; // Uses variant="outline"
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

  const isUnlocked = unlockMethod?.type === "unlocked";

  // Locked state
  if (isLocked) {
    return (
      <Card 
        className={cn(
          "bg-card border-border transition-all overflow-hidden",
          !isUnlocking && "cursor-pointer hover:border-primary/50"
        )}
        onClick={!isUnlocking ? handleUnlockClick : undefined}
      >
        {/* Header with tier badge */}
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getTierBadge(tip.tier)}
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-xs">
                {tip.league}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{tip.kickoff}</span>
          </div>
        </div>

        {/* Match title */}
        <div className="px-4 pb-3">
          <h3 className="font-bold text-lg text-foreground">{tip.homeTeam} vs {tip.awayTeam}</h3>
        </div>

        {/* Locked content placeholder */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/20 rounded-lg border border-border/50">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Prediction</p>
              <div className="h-4 w-20 bg-muted rounded blur-sm" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Odds</p>
              <div className="h-4 w-12 bg-muted rounded blur-sm mx-auto" />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Confidence</p>
              <div className="h-4 w-16 bg-muted rounded blur-sm ml-auto" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 pt-3 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-xs">Locked</span>
          </div>
        </div>

        {/* Unlock button */}
        {unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="p-4 border-t border-border">
            <Button
              variant={unlockMethod.type === "login_required" ? "outline" : "default"}
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
          </div>
        )}
      </Card>
    );
  }

  // Unlocked state - rich card design
  return (
    <Card className="bg-card border-primary/30 transition-all overflow-hidden hover:border-primary/50">
      {/* Header with tier badge and unlocked status */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTierBadge(tip.tier)}
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">
              {tip.league}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{tip.kickoff}</span>
            <Badge className="gap-1 bg-success/20 text-success border-success/30">
              <CheckCircle2 className="h-3 w-3" />
              Unlocked
            </Badge>
          </div>
        </div>
      </div>

      {/* Match title */}
      <div className="px-4 pb-3">
        <h3 className="font-bold text-lg text-foreground">{tip.homeTeam} vs {tip.awayTeam}</h3>
      </div>

      {/* Prediction details */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between py-2 border-b border-border/30">
          <span className="text-sm text-muted-foreground">Prediction</span>
          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
            {tip.prediction}
          </Badge>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border/30">
          <span className="text-sm text-muted-foreground">Odds</span>
          <span className="font-bold text-primary">@{tip.odds.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">Confidence</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-success to-primary rounded-full"
                style={{ width: `${tip.confidence}%` }}
              />
            </div>
            <span className="font-bold text-success">{tip.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Unlocked badge footer */}
      <div className="px-4 py-3 border-t border-border/50">
        <Badge className="w-full justify-center gap-2 py-2 bg-success/20 text-success border-success/30">
          <CheckCircle2 className="h-4 w-4" />
          Tip Unlocked
        </Badge>
      </div>
    </Card>
  );
}
