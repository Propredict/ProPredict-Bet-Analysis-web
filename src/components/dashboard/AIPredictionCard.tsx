import { Lock, LogIn, Star, Crown, Gift, CheckCircle2, Brain, TrendingUp, Target, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ContentTier, type UnlockMethod } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";

export interface AIPrediction {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  odds: number;
  confidence: number;
  kickoff: string;
  tier: ContentTier;
  aiAnalysis?: string;
  homeWinProbability?: number;
  drawProbability?: number;
  awayWinProbability?: number;
  predictedScore?: string;
  keyFactors?: string[];
}

interface AIPredictionCardProps {
  prediction: AIPrediction;
  isLocked: boolean;
  unlockMethod: UnlockMethod | null;
  onUnlockClick: () => void;
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
  if (unlockMethod.type === "upgrade_basic") return "Upgrade to Pro";
  if (unlockMethod.type === "upgrade_premium") return "Subscribe to Premium";
  if (unlockMethod.type === "login_required") return "Sign in to Unlock";
  return "";
}

export function AIPredictionCard({ 
  prediction, 
  isLocked, 
  unlockMethod, 
  onUnlockClick
}: AIPredictionCardProps) {
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
    if (unlockMethod.type === "upgrade_basic") return Star;
    return Crown;
  };

  // Probability values (with defaults)
  const homeWin = prediction.homeWinProbability ?? 45;
  const draw = prediction.drawProbability ?? 25;
  const awayWin = prediction.awayWinProbability ?? 30;
  const predictedScore = prediction.predictedScore ?? "2-1";
  const keyFactors = prediction.keyFactors ?? ["Form", "H2H", "Injuries"];
  const aiAnalysis = prediction.aiAnalysis ?? "AI analysis based on historical data, team form, and statistical models.";

  // Locked state
  if (isLocked) {
    const Icon = getUnlockButtonIcon();
    
    return (
      <Card className="bg-card border-border transition-all overflow-hidden hover:border-primary/50">
        {/* Header with tier badge - VISIBLE */}
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getTierBadge(prediction.tier)}
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-xs">
                {prediction.league}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{prediction.kickoff}</span>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Match title - VISIBLE */}
        <div className="px-4 pb-3">
          <h3 className="font-bold text-lg text-foreground">{prediction.homeTeam} vs {prediction.awayTeam}</h3>
        </div>

        {/* Win Probability Bars - BLURRED */}
        <div className="px-4 pb-3">
          <div className="p-3 bg-muted/20 rounded-lg border border-border/50 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Win Probability</span>
            </div>
            
            <div className="space-y-2 blur-sm opacity-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{prediction.homeTeam}</span>
                <span className="font-bold text-primary">{homeWin}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${homeWin}%` }} />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Draw</span>
                <span className="font-bold text-muted-foreground">{draw}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground rounded-full" style={{ width: `${draw}%` }} />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{prediction.awayTeam}</span>
                <span className="font-bold text-accent">{awayWin}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${awayWin}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Predicted Score & Confidence - BLURRED */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50 blur-sm opacity-50">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-accent" />
                <span className="text-xs text-muted-foreground">Predicted Score</span>
              </div>
              <p className="text-xl font-bold text-foreground">{predictedScore}</p>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50 blur-sm opacity-50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">AI Confidence</span>
              </div>
              <p className="text-xl font-bold text-success">{prediction.confidence}%</p>
            </div>
          </div>
        </div>

        {/* AI Analysis - BLURRED */}
        <div className="px-4 pb-3">
          <div className="p-3 bg-muted/20 rounded-lg border border-border/50 blur-sm opacity-50">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">AI Analysis</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{aiAnalysis}</p>
          </div>
        </div>

        {/* Key Factors - BLURRED */}
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-2 blur-sm opacity-50">
            {keyFactors.map((factor, idx) => (
              <Badge key={idx} variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                {factor}
              </Badge>
            ))}
          </div>
        </div>

        {/* Unlock button - NOT BLURRED */}
        {unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="p-4 border-t border-border">
            <Button
              variant={unlockMethod.type === "login_required" ? "outline" : "default"}
              size="lg"
              className={cn("w-full gap-2 h-12", getUnlockButtonStyle())}
              onClick={(e) => {
                e.stopPropagation();
                handleUnlockClick();
              }}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {getUnlockButtonText(unlockMethod)}
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // Unlocked state - full details visible
  return (
    <Card className="bg-card border-primary/30 transition-all overflow-hidden hover:border-primary/50">
      {/* Header with tier badge and unlocked status */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTierBadge(prediction.tier)}
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">
              {prediction.league}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{prediction.kickoff}</span>
            <Badge className="gap-1 bg-success/20 text-success border-success/30">
              <CheckCircle2 className="h-3 w-3" />
              Unlocked
            </Badge>
          </div>
        </div>
      </div>

      {/* Match title */}
      <div className="px-4 pb-3">
        <h3 className="font-bold text-lg text-foreground">{prediction.homeTeam} vs {prediction.awayTeam}</h3>
      </div>

      {/* Win Probability Bars */}
      <div className="px-4 pb-3">
        <div className="p-3 bg-muted/20 rounded-lg border border-border/50 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Win Probability</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{prediction.homeTeam}</span>
              <span className="font-bold text-primary">{homeWin}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${homeWin}%` }} />
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Draw</span>
              <span className="font-bold text-muted-foreground">{draw}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-muted-foreground rounded-full transition-all" style={{ width: `${draw}%` }} />
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{prediction.awayTeam}</span>
              <span className="font-bold text-accent">{awayWin}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${awayWin}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Predicted Score & Confidence */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Predicted Score</span>
            </div>
            <p className="text-xl font-bold text-foreground">{predictedScore}</p>
          </div>
          <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">AI Confidence</span>
            </div>
            <p className="text-xl font-bold text-success">{prediction.confidence}%</p>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="px-4 pb-3">
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI Analysis</span>
          </div>
          <p className="text-sm text-muted-foreground">{aiAnalysis}</p>
        </div>
      </div>

      {/* Key Factors */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-2">
          {keyFactors.map((factor, idx) => (
            <Badge key={idx} variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
              {factor}
            </Badge>
          ))}
        </div>
      </div>

      {/* Prediction + Odds footer */}
      <div className="px-4 py-3 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
              {prediction.prediction}
            </Badge>
            <span className="text-sm text-muted-foreground">@</span>
            <span className="font-bold text-primary">{prediction.odds.toFixed(2)}</span>
          </div>
          <Badge className="gap-1 bg-success/20 text-success border-success/30">
            <CheckCircle2 className="h-3 w-3" />
            Prediction Unlocked
          </Badge>
        </div>
      </div>
    </Card>
  );
}
