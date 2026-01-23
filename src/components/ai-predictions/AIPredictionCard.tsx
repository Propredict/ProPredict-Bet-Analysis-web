import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Crown, Eye, ChevronDown, Brain, Star } from "lucide-react";
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
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsUnlocked(true);
    setIsUnlocking(false);
    onWatchAd();
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.slice(0, 5);
  };

  const formatDate = (date: string | null, matchDay: string | null) => {
    if (matchDay === "today") return "Today";
    if (matchDay === "tomorrow") return "Tomorrow";
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  };

  // Determine which team is predicted to win
  const getPredictedTeam = () => {
    if (prediction.prediction === "1") return "home";
    if (prediction.prediction === "2") return "away";
    return "draw";
  };

  const predictedTeam = getPredictedTeam();

  // Calculate bar widths based on probabilities
  const getBarWidth = (prob: number) => {
    return Math.max(10, prob); // minimum 10% width for visibility
  };

  return (
    <Card className="bg-[#0f1729]/90 border-[#1e3a5f]/40 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            <span>{prediction.league}</span>
            <span>•</span>
            <span>{formatDate(prediction.match_date, prediction.match_day)}, {formatTime(prediction.match_time)}</span>
          </div>
          {isPremium && (
            <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 text-[10px] px-2 py-0.5 font-semibold">
              <Star className="w-3 h-3 mr-1 fill-current" />
              AI PRO
            </Badge>
          )}
        </div>

        {/* Match Title - Always visible */}
        <div className="px-4 pb-3">
          <h3 className="font-bold text-base text-foreground">
            {prediction.home_team} vs {prediction.away_team}
          </h3>
        </div>

        {/* Team Probability Bars */}
        <div className="px-4 space-y-2 mb-4">
          {/* Home Team */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm text-foreground mb-1">{prediction.home_team}</div>
              <div className="h-1.5 bg-[#1e3a5f]/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    predictedTeam === "home" ? "bg-green-500" : "bg-orange-500"
                  )}
                  style={{ width: hasAccess ? `${getBarWidth(prediction.home_win)}%` : "60%" }}
                />
              </div>
            </div>
            <span className={cn(
              "text-sm font-medium min-w-[32px] text-right",
              !hasAccess && "blur-sm select-none"
            )}>
              {hasAccess ? `${prediction.home_win}%` : "??"}
            </span>
          </div>

          {/* Draw */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm text-foreground mb-1">Draw</div>
              <div className="h-1.5 bg-[#1e3a5f]/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    predictedTeam === "draw" ? "bg-green-500" : "bg-orange-500"
                  )}
                  style={{ width: hasAccess ? `${getBarWidth(prediction.draw)}%` : "30%" }}
                />
              </div>
            </div>
            <span className={cn(
              "text-sm font-medium min-w-[32px] text-right",
              !hasAccess && "blur-sm select-none"
            )}>
              {hasAccess ? `${prediction.draw}%` : "??"}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm text-foreground mb-1">{prediction.away_team}</div>
              <div className="h-1.5 bg-[#1e3a5f]/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    predictedTeam === "away" ? "bg-green-500" : "bg-orange-500"
                  )}
                  style={{ width: hasAccess ? `${getBarWidth(prediction.away_win)}%` : "45%" }}
                />
              </div>
            </div>
            <span className={cn(
              "text-sm font-medium min-w-[32px] text-right",
              !hasAccess && "blur-sm select-none"
            )}>
              {hasAccess ? `${prediction.away_win}%` : "??"}
            </span>
          </div>
        </div>

        {/* Predicted Score & Confidence */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Predicted Score</div>
            <div className={cn(
              "text-lg font-bold",
              !hasAccess && "blur-sm select-none"
            )}>
              {hasAccess ? (prediction.predicted_score || "—") : "? ?"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">AI Confidence</div>
            <div className={cn(
              "text-lg font-bold text-green-400",
              !hasAccess && "blur-sm select-none"
            )}>
              {hasAccess ? `${prediction.confidence}%` : "??%"}
            </div>
          </div>
        </div>

        {/* AI Analysis - Collapsible (only when unlocked) */}
        {hasAccess && prediction.analysis && (
          <div className="px-4 pb-4">
            <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-xs text-muted-foreground hover:text-foreground p-2 h-auto bg-[#1e3a5f]/20"
                >
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Analysis
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isAnalysisOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 bg-[#1e3a5f]/20 rounded-lg">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {prediction.analysis}
                  </p>
                  {prediction.key_factors && prediction.key_factors.length > 0 && (
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
          </div>
        )}

        {/* Unlock Section - Only show if locked */}
        {!hasAccess && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Unlock full AI analysis and predictions
            </p>
            {isPremium ? (
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0"
                onClick={onGoPremium}
              >
                <Star className="w-4 h-4 mr-2 fill-current" />
                Get AI Pro Access
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full border-[#1e3a5f] text-foreground hover:bg-[#1e3a5f]/30"
                onClick={handleWatchAd}
                disabled={isUnlocking}
              >
                <Eye className="w-4 h-4 mr-2" />
                {isUnlocking ? "Unlocking..." : "Watch Ad to Unlock Prediction"}
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
