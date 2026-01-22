import { Lock, Loader2, LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ContentTier, type UnlockMethod } from "@/hooks/useUserPlan";

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

export function TipCard({ tip, isLocked, unlockMethod, onUnlockClick, isUnlocking = false }: TipCardProps) {
  const getUnlockButtonStyle = () => {
    if (!unlockMethod || unlockMethod.type === "unlocked") return "";
    if (unlockMethod.type === "upgrade_premium") {
      return "bg-warning hover:bg-warning/90 text-warning-foreground";
    }
    return "";
  };

  return (
    <Card 
      className={cn(
        "p-4 bg-card border-border transition-all",
        isLocked && !isUnlocking && "cursor-pointer hover:border-primary/50"
      )}
      onClick={isLocked && !isUnlocking ? onUnlockClick : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Match Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{tip.league}</p>
          <p className="font-medium text-foreground truncate">
            {tip.homeTeam} vs {tip.awayTeam}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{tip.kickoff}</p>
        </div>

        {/* Prediction & Odds */}
        <div className="flex flex-col items-end gap-2">
          {isLocked ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-6 w-16 bg-muted rounded blur-sm" />
                <div className="h-6 w-12 bg-primary/30 rounded blur-sm" />
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span className="text-xs">
                  {unlockMethod && unlockMethod.type !== "unlocked" ? unlockMethod.message : "Locked"}
                </span>
              </div>
            </>
          ) : (
            <>
              <Badge variant="secondary" className="text-sm">
                {tip.prediction}
              </Badge>
              <span className="text-primary font-bold">@{tip.odds.toFixed(2)}</span>
              <div className="flex items-center gap-1">
                <div 
                  className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"
                >
                  <div 
                    className="h-full bg-success rounded-full"
                    style={{ width: `${tip.confidence}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{tip.confidence}%</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unlock Button for locked content */}
      {isLocked && unlockMethod && unlockMethod.type !== "unlocked" && (
        <Button
          variant={unlockMethod.type === "watch_ad" || unlockMethod.type === "login_required" ? "outline" : "default"}
          size="sm"
          className={cn("w-full mt-3 gap-2", getUnlockButtonStyle())}
          disabled={isUnlocking}
          onClick={(e) => {
            e.stopPropagation();
            onUnlockClick();
          }}
        >
          {isUnlocking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Watching ad...
            </>
          ) : unlockMethod.type === "login_required" ? (
            <>
              <LogIn className="h-4 w-4" />
              {unlockMethod.message}
            </>
          ) : (
            unlockMethod.message
          )}
        </Button>
      )}
    </Card>
  );
}