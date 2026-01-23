import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Prediction {
  id: string;
  home_team?: string;
  away_team?: string;
  home?: string;
  away?: string;
  league?: string;
  match_date?: string;
  match_time?: string;
  time?: string;
  home_win?: number;
  draw?: number;
  away_win?: number;
  home_pct?: number;
  draw_pct?: number;
  away_pct?: number;
  prediction?: string;
  pick?: string;
  predicted_score?: string;
  confidence?: number;
  is_premium?: boolean;
  is_locked?: boolean;
  result_status?: string;
}

interface Props {
  prediction: Prediction;
}

export function AIPredictionCard({ prediction }: Props) {
  const { isAdmin, canAccess, getUnlockMethod, isAuthenticated } = useUserPlan();
  const { handleUnlock, unlockingId } = useUnlockHandler();
  const navigate = useNavigate();
  const isUnlocking = unlockingId === prediction.id;
  const { user } = useAuth();

  const home = prediction.home || prediction.home_team || "Home";
  const away = prediction.away || prediction.away_team || "Away";
  const league = prediction.league || "Unknown League";
  const time = prediction.time || prediction.match_time || "TBD";
  const date = prediction.match_date ? new Date(prediction.match_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today";

  const homePct = prediction.home_pct || prediction.home_win || 33;
  const drawPct = prediction.draw_pct || prediction.draw || 33;
  const awayPct = prediction.away_pct || prediction.away_win || 33;
  const confidence = prediction.confidence || 0;
  const predictedScore = prediction.predicted_score || "? - ?";

  const isPremium = prediction.is_premium ?? false;
  const tier = isPremium ? "premium" : "daily";

  // Admin always has access
  const hasAccess = isAdmin || canAccess(tier as any, "tip", prediction.id);
  const unlockMethod = !hasAccess ? getUnlockMethod(tier as any, "tip", prediction.id) : null;

  const handleAction = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (unlockMethod?.type === "watch_ad") {
      handleUnlock("tip", prediction.id, tier as any);
    } else if (unlockMethod?.type === "upgrade_basic" || unlockMethod?.type === "upgrade_premium") {
      navigate("/get-premium");
    }
  };

  return (
    <Card className="bg-[#0a1628]/80 border-white/5 hover:border-white/10 transition-colors overflow-hidden">
      <CardContent className="p-4">
        {/* HEADER: League + Date + Time + Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="truncate max-w-[140px]">{league}</span>
            <span>•</span>
            <span>{date}, {time}</span>
          </div>
          {isPremium && (
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] px-2">
              AI PRO
            </Badge>
          )}
        </div>

        {/* MATCH TITLE */}
        <h3 className="text-sm font-semibold text-foreground mb-4">
          {home} vs {away}
        </h3>

        {/* PROBABILITY BARS */}
        <div className="space-y-2.5 mb-4">
          <ProbabilityBar label={home} value={homePct} color="bg-primary" locked={!hasAccess} />
          <ProbabilityBar label="Draw" value={drawPct} color="bg-muted-foreground" locked={!hasAccess} />
          <ProbabilityBar label={away} value={awayPct} color="bg-orange-500" locked={!hasAccess} />
        </div>

        {/* PREDICTED SCORE + CONFIDENCE */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Predicted Score</p>
            <p className={cn(
              "text-sm font-semibold text-foreground flex items-center gap-1",
              !hasAccess && "blur-sm select-none"
            )}>
              <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-xs text-primary">⚽</span>
              {hasAccess ? predictedScore : "? - ?"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">AI Confidence</p>
            <div className={cn(
              "flex items-center gap-1",
              !hasAccess && "blur-sm select-none"
            )}>
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all" 
                  style={{ width: hasAccess ? `${confidence}%` : "50%" }} 
                />
              </div>
              <span className="text-xs font-medium text-foreground">
                {hasAccess ? `${confidence}%` : "??%"}
              </span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTON */}
        {!hasAccess && (
          <div>
            {isPremium && (
              <p className="text-xs text-muted-foreground text-center mb-2">
                Unlock full AI analysis and predictions
              </p>
            )}
            <Button 
              onClick={handleAction}
              disabled={isUnlocking}
              className={cn(
                "w-full h-9 text-sm font-medium",
                !isAuthenticated && "bg-transparent border border-white/20 hover:bg-white/5 text-foreground",
                isAuthenticated && !isPremium && "bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30",
                isAuthenticated && isPremium && "bg-orange-500 hover:bg-orange-600 text-white"
              )}
            >
              {!isAuthenticated ? (
                <>
                  <LogIn className="w-3.5 h-3.5 mr-2" />
                  Sign in to Unlock
                </>
              ) : isPremium ? (
                <>
                  <Crown className="w-3.5 h-3.5 mr-2" />
                  Get AI Pro Access
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-2" />
                  Watch Ad to Unlock Prediction
                </>
              )}
            </Button>
          </div>
        )}

        {/* UNLOCKED STATE */}
        {hasAccess && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-primary">
            <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">✓</span>
            <span>Full prediction available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* PROBABILITY BAR */
function ProbabilityBar({ 
  label, 
  value, 
  color, 
  locked 
}: { 
  label: string; 
  value: number; 
  color: string; 
  locked: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", color)} 
          style={{ width: `${value}%` }} 
        />
      </div>
      <span className={cn(
        "text-xs font-medium w-8 text-right",
        locked ? "text-muted-foreground" : "text-foreground"
      )}>
        {locked ? "??" : `${value}`}
      </span>
    </div>
  );
}

export default AIPredictionCard;
