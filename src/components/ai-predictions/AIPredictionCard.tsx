import { useState } from "react";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Crown,
  Lock,
  Play,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "./types";

interface Props {
  prediction: AIPrediction;
  onUnlock?: (id: string) => void;
  onSubscribe?: () => void;
}

export function AIPredictionCard({ prediction, onUnlock, onSubscribe }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const riskColor = {
    low: "text-success bg-success/20 border-success/30",
    medium: "text-warning bg-warning/20 border-warning/30",
    high: "text-destructive bg-destructive/20 border-destructive/30",
  }[prediction.riskLevel];

  const riskIcon = {
    low: <TrendingUp className="h-3 w-3" />,
    medium: <Target className="h-3 w-3" />,
    high: <AlertTriangle className="h-3 w-3" />,
  }[prediction.riskLevel];

  return (
    <Card className="relative overflow-hidden bg-card border-border hover:border-primary/30 transition-all">
      {/* ===== HEADER (UVEK VIDLJIV) ===== */}
      <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
        <span className="text-xs text-muted-foreground font-medium">{prediction.league}</span>

        <div className="flex gap-2">
          <Badge variant="outline">{prediction.matchTime}</Badge>

          <Badge className="bg-primary/20 text-primary border-primary/30">
            <Brain className="h-3 w-3 mr-1" /> AI
          </Badge>

          {prediction.isPremium && (
            <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30">
              <Crown className="h-3 w-3 mr-1" /> PRO
            </Badge>
          )}
        </div>
      </div>

      {/* ===== TEAMS (UVEK VIDLJIVI) ===== */}
      <div className="p-4 text-center">
        <p className="font-semibold text-lg">{prediction.homeTeam}</p>
        <span className="text-muted-foreground text-sm">VS</span>
        <p className="font-semibold text-lg">{prediction.awayTeam}</p>
      </div>

      {/* ===== BLUR ZONA ===== */}
      <div className={cn("relative p-4 space-y-4", prediction.isLocked && "blur-sm")}>
        {/* Probabilities */}
        {["1", "X", "2"].map((label, i) => {
          const value =
            i === 0
              ? prediction.homeWinProbability
              : i === 1
                ? prediction.drawProbability
                : prediction.awayWinProbability;

          return (
            <div key={label} className="flex items-center gap-2">
              <span className="w-6 text-xs text-muted-foreground">{label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${value}%` }} />
              </div>
              <span className="w-10 text-xs text-right">{value}%</span>
            </div>
          );
        })}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 bg-muted/50 p-3 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Outcome</p>
            <Badge variant="outline">{prediction.predictedOutcome}</Badge>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="font-bold">{prediction.predictedScore}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="font-bold text-primary">{prediction.confidence}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Risk</p>
            <Badge className={cn("text-xs", riskColor)}>
              {riskIcon}
              <span className="ml-1 capitalize">{prediction.riskLevel}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* ===== LOCK OVERLAY ===== */}
      {prediction.isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
          <Lock className="h-6 w-6 text-muted-foreground mb-3" />

          {prediction.isPremium ? (
            <Button onClick={onSubscribe} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <Crown className="h-4 w-4 mr-2" />
              Subscribe to PRO
            </Button>
          ) : (
            <Button onClick={() => onUnlock?.(prediction.id)}>
              <Play className="h-4 w-4 mr-2" />
              <Sparkles className="h-4 w-4 mr-1" />
              Watch Ad to Unlock
            </Button>
          )}
        </div>
      )}

      {/* ===== ANALYSIS ===== */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex justify-between items-center text-sm text-muted-foreground hover:bg-muted/40"
      >
        <span className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          AI Analysis
        </span>
        {isExpanded ? <ChevronUp /> : <ChevronDown />}
      </button>

      {isExpanded && (
        <div className={cn("p-4 text-sm", prediction.isLocked && "blur-md")}>
          <p className="mb-3 text-muted-foreground">{prediction.analysis}</p>

          <div className="flex flex-wrap gap-2">
            {prediction.keyFactors.map((f, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                {f}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
