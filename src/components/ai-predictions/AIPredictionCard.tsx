import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Crown, Eye, Sparkles, ChevronDown, Activity, Brain, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";

interface Props {
  prediction: AIPrediction;
  isAdmin?: boolean;
  onWatchAd: () => void;
  onGoPremium: () => void;
}

export function AIPredictionCard({ prediction, isAdmin = false, onWatchAd, onGoPremium }: Props) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Premium if is_premium flag is true OR confidence > 70
  const isPremium = prediction.is_premium || (prediction.confidence > 70);
  
  // Access logic: admin always has access, otherwise check unlock state
  const hasAccess = isAdmin || isUnlocked;

  const handleWatchAd = async () => {
    setIsUnlocking(true);
    // Simulate ad watch delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsUnlocked(true);
    setIsUnlocking(false);
    onWatchAd();
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.slice(0, 5);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  };

  const getRiskColor = (risk: string | null) => {
    switch (risk) {
      case "low": return "text-green-400";
      case "medium": return "text-yellow-400";
      case "high": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const maxProb = Math.max(prediction.home_win, prediction.draw, prediction.away_win);

  return (
    <Card className="bg-[#0f1729]/80 border-[#1e3a5f]/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1e3a5f]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{prediction.league}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(prediction.match_date)} {formatTime(prediction.match_time)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {prediction.is_live && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                LIVE
              </Badge>
            )}
            {isPremium && (
              <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                <Crown className="w-3 h-3 mr-1" />
                AI PRO
              </Badge>
            )}
          </div>
        </div>

        {/* Match Info - Always visible */}
        <div className="px-4 py-4">
          <h3 className="font-bold text-lg text-foreground mb-4">
            {prediction.home_team} vs {prediction.away_team}
          </h3>

          {/* Win Probability Bars - Blurred if locked */}
          <div className={cn("space-y-2 mb-4", !hasAccess && "blur-sm select-none pointer-events-none")}>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-12">Home</span>
              <div className="flex-1 h-2 bg-[#1e3a5f]/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    prediction.home_win === maxProb ? "bg-green-500" : "bg-blue-500/60"
                  )}
                  style={{ width: `${prediction.home_win}%` }}
                />
              </div>
              <span className="text-xs font-medium w-10 text-right">{prediction.home_win}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-12">Draw</span>
              <div className="flex-1 h-2 bg-[#1e3a5f]/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    prediction.draw === maxProb ? "bg-green-500" : "bg-blue-500/60"
                  )}
                  style={{ width: `${prediction.draw}%` }}
                />
              </div>
              <span className="text-xs font-medium w-10 text-right">{prediction.draw}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-12">Away</span>
              <div className="flex-1 h-2 bg-[#1e3a5f]/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    prediction.away_win === maxProb ? "bg-green-500" : "bg-blue-500/60"
                  )}
                  style={{ width: `${prediction.away_win}%` }}
                />
              </div>
              <span className="text-xs font-medium w-10 text-right">{prediction.away_win}%</span>
            </div>
          </div>

          {/* Predicted Score & Confidence - Blurred if locked */}
          <div className={cn(
            "grid grid-cols-2 gap-3 mb-4",
            !hasAccess && "blur-sm select-none pointer-events-none"
          )}>
            <div className="bg-[#1e3a5f]/20 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Predicted Score</div>
              <div className="text-xl font-bold text-foreground">
                {hasAccess ? (prediction.predicted_score || "—") : "?-?"}
              </div>
            </div>
            <div className="bg-[#1e3a5f]/20 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">AI Confidence</div>
              <div className="text-xl font-bold text-green-400">
                {hasAccess ? `${prediction.confidence}%` : "??%"}
              </div>
            </div>
          </div>

          {/* Risk Level - Blurred if locked */}
          <div className={cn(
            "flex items-center justify-between mb-4",
            !hasAccess && "blur-sm select-none pointer-events-none"
          )}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Risk Level:</span>
              <span className={cn("text-xs font-semibold capitalize", getRiskColor(prediction.risk_level))}>
                {hasAccess ? prediction.risk_level : "???"}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              Prediction: {prediction.prediction}
            </Badge>
          </div>

          {/* AI Analysis - Collapsible, Blurred if locked */}
          {prediction.analysis && (
            <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-xs text-muted-foreground hover:text-foreground p-2 h-auto"
                >
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Analysis
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isAnalysisOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className={cn(
                  "mt-2 p-3 bg-[#1e3a5f]/20 rounded-lg",
                  !hasAccess && "blur-sm select-none pointer-events-none"
                )}>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {hasAccess ? prediction.analysis : "Unlock to view AI analysis..."}
                  </p>
                  {hasAccess && prediction.key_factors && prediction.key_factors.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {prediction.key_factors.map((factor, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Action Button - Only show if locked */}
        {!hasAccess && (
          <div className="px-4 pb-4">
            {isPremium ? (
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={onGoPremium}
              >
                <Crown className="w-4 h-4 mr-2" />
                Get AI Pro Access
              </Button>
            ) : (
              <Button
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                onClick={handleWatchAd}
                disabled={isUnlocking}
              >
                {isUnlocking ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Watch Ad to Unlock Prediction
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Unlocked Badge */}
        {hasAccess && !isAdmin && (
          <div className="px-4 pb-4">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              ✓ Unlocked
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIPredictionCard;
