import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Crown, Lock, Play, Sparkles, TrendingUp, AlertTriangle, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "./types";

interface AIPredictionCardProps {
  prediction: AIPrediction;
  onUnlock?: (id: string) => void;
  onSubscribe?: () => void;
}

export function AIPredictionCard({ prediction, onUnlock, onSubscribe }: AIPredictionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-success bg-success/20 border-success/30";
      case "medium": return "text-warning bg-warning/20 border-warning/30";
      case "high": return "text-destructive bg-destructive/20 border-destructive/30";
      default: return "text-muted-foreground";
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "low": return <TrendingUp className="h-3 w-3" />;
      case "medium": return <Target className="h-3 w-3" />;
      case "high": return <AlertTriangle className="h-3 w-3" />;
      default: return null;
    }
  };

  const getOutcomeLabel = (outcome: string) => {
    switch (outcome) {
      case "1": return "Home Win";
      case "X": return "Draw";
      case "2": return "Away Win";
      default: return outcome;
    }
  };

  return (
    <Card className="overflow-hidden bg-card border-border hover:border-primary/30 transition-all duration-300 group">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">{prediction.league}</span>
          </div>
          <div className="flex items-center gap-2">
            {prediction.isLive ? (
              <Badge className="bg-destructive/20 text-destructive border-destructive/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5 animate-pulse" />
                LIVE {prediction.liveMinute}'
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                {prediction.matchTime}
              </Badge>
            )}
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <Brain className="h-3 w-3 mr-1" />
              AI
            </Badge>
            {prediction.isPremium && (
              <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30">
                <Crown className="h-3 w-3 mr-1" />
                PRO
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Teams Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 text-center">
            <p className="font-semibold text-foreground text-lg">{prediction.homeTeam}</p>
            {prediction.isLive && (
              <p className="text-2xl font-bold text-foreground mt-1">{prediction.homeScore}</p>
            )}
          </div>
          <div className="px-4">
            <span className="text-muted-foreground font-medium text-sm">VS</span>
          </div>
          <div className="flex-1 text-center">
            <p className="font-semibold text-foreground text-lg">{prediction.awayTeam}</p>
            {prediction.isLive && (
              <p className="text-2xl font-bold text-foreground mt-1">{prediction.awayScore}</p>
            )}
          </div>
        </div>

        {/* AI Probabilities */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8">1</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                style={{ width: `${prediction.homeWinProbability}%` }}
              />
            </div>
            <span className={cn(
              "text-xs font-medium w-10 text-right",
              prediction.isLocked && "blur-sm"
            )}>
              {prediction.homeWinProbability}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8">X</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-muted-foreground to-muted-foreground/70 rounded-full transition-all duration-500"
                style={{ width: `${prediction.drawProbability}%` }}
              />
            </div>
            <span className={cn(
              "text-xs font-medium w-10 text-right",
              prediction.isLocked && "blur-sm"
            )}>
              {prediction.drawProbability}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8">2</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full transition-all duration-500"
                style={{ width: `${prediction.awayWinProbability}%` }}
              />
            </div>
            <span className={cn(
              "text-xs font-medium w-10 text-right",
              prediction.isLocked && "blur-sm"
            )}>
              {prediction.awayWinProbability}%
            </span>
          </div>
        </div>

        {/* AI Stats Row */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50 rounded-lg mb-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Outcome</p>
            <Badge variant="outline" className={cn(
              "font-bold",
              prediction.isLocked && "blur-sm"
            )}>
              {prediction.predictedOutcome}
            </Badge>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Score</p>
            <p className={cn(
              "text-sm font-bold text-foreground",
              prediction.isLocked && "blur-sm"
            )}>
              {prediction.predictedScore}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
            <p className={cn(
              "text-sm font-bold text-primary",
              prediction.isLocked && "blur-sm"
            )}>
              {prediction.confidence}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Risk</p>
            <Badge className={cn(
              "text-xs",
              getRiskColor(prediction.riskLevel),
              prediction.isLocked && "blur-sm"
            )}>
              {getRiskIcon(prediction.riskLevel)}
              <span className="ml-1 capitalize">{prediction.riskLevel}</span>
            </Badge>
          </div>
        </div>

        {/* Unlock CTA */}
        {prediction.isLocked && (
          <div className="mb-4">
            {prediction.isPremium ? (
              <Button 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={onSubscribe}
              >
                <Crown className="h-4 w-4 mr-2" />
                Subscribe to PRO
              </Button>
            ) : (
              <Button 
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                onClick={() => onUnlock?.(prediction.id)}
              >
                <Play className="h-4 w-4 mr-2" />
                <Sparkles className="h-4 w-4 mr-1" />
                Watch Ad to Unlock
              </Button>
            )}
          </div>
        )}

        {/* Expandable Analysis */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4 text-primary" />
            <span>AI Analysis</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {isExpanded && (
          <div className={cn(
            "mt-3 p-4 bg-muted/30 rounded-lg border border-border/50 animate-fade-in",
            prediction.isLocked && "relative"
          )}>
            {prediction.isLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg z-10">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <p className={cn(
              "text-sm text-muted-foreground mb-3",
              prediction.isLocked && "blur-md"
            )}>
              {prediction.analysis}
            </p>
            <div className="flex flex-wrap gap-2">
              {prediction.keyFactors.map((factor, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className={cn(
                    "text-xs bg-primary/10 text-primary border-primary/20",
                    prediction.isLocked && "blur-md"
                  )}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {factor}
                </Badge>
              ))}
            </div>
            {prediction.riskLevel === "high" && !prediction.isLocked && (
              <div className="mt-3 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  <span>High-risk prediction. Bet responsibly.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
