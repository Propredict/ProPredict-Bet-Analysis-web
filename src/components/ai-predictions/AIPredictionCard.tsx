import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Eye, ChevronDown, Brain, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";

interface Props {
  prediction: AIPrediction;
  isAdmin?: boolean;
  isPremiumUser?: boolean;
  onWatchAd: () => void;
  onGoPremium: () => void;
}

export function AIPredictionCard({ 
  prediction, 
  isAdmin = false, 
  isPremiumUser = false,
  onWatchAd, 
  onGoPremium 
}: Props) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Premium if is_premium flag is true OR confidence > 70
  const isPremiumPrediction = prediction.is_premium || (prediction.confidence > 70);
  
  // Access logic: admin or premium user always has access, free users can unlock non-premium via ads
  const hasAccess = isAdmin || isPremiumUser || isUnlocked;

  // Free users cannot unlock premium predictions via ads
  const canWatchAd = !isPremiumPrediction && !hasAccess;
  const needsPremiumUpgrade = isPremiumPrediction && !isAdmin && !isPremiumUser;

  const handleWatchAd = async () => {
    if (isPremiumPrediction) return; // Cannot unlock premium via ads
    setIsUnlocking(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsUnlocked(true);
    setIsUnlocking(false);
    onWatchAd();
  };

  // Format time as HH:mm - NO Date parsing
  const formatTime = (time: string | null) => {
    if (!time) return "";
    // Just take first 5 chars if it's HH:mm:ss format
    return time.length >= 5 ? time.slice(0, 5) : time;
  };

  // Format date label from match_day - NO Date parsing
  const formatDateLabel = (matchDay: string | null) => {
    if (matchDay === "today") return "Today";
    if (matchDay === "tomorrow") return "Tomorrow";
    return matchDay || "";
  };

  // Determine which outcome is predicted
  const getPredictedOutcome = () => {
    if (prediction.prediction === "1") return "home";
    if (prediction.prediction === "2") return "away";
    return "draw";
  };

  const predictedOutcome = getPredictedOutcome();

  return (
    <Card className="bg-[#0a1628] border-[#1e3a5f]/40 overflow-hidden">
      <CardContent className="p-0">
        {/* Header - League, Time, AI PRO badge */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
            <span>{prediction.league || "League"}</span>
            <span>•</span>
            <span>{formatDateLabel(prediction.match_day)}, {formatTime(prediction.match_time)}</span>
          </div>
          {isPremiumPrediction && (
            <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 text-[10px] px-2.5 py-0.5 font-semibold rounded">
              <Star className="w-3 h-3 mr-1 fill-current" />
              AI PRO
            </Badge>
          )}
        </div>

        {/* Match Title - ALWAYS VISIBLE */}
        <div className="px-4 pb-4">
          <h3 className="font-bold text-lg text-white">
            {prediction.home_team} vs {prediction.away_team}
          </h3>
        </div>

        {/* Probability Bars - Team names visible, percentages blurred when locked */}
        <div className="px-4 space-y-3 mb-5">
          {/* Home Team */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-white">{prediction.home_team}</span>
              <span className={cn(
                "text-sm text-white/90",
                !hasAccess && "blur-[3px] select-none"
              )}>
                {hasAccess ? `${prediction.home_win}%` : "??"}
              </span>
            </div>
            <div className="h-1 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  predictedOutcome === "home" ? "bg-green-500" : "bg-orange-500"
                )}
                style={{ width: hasAccess ? `${Math.max(8, prediction.home_win)}%` : "65%" }}
              />
            </div>
          </div>

          {/* Draw */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-white">Draw</span>
              <span className={cn(
                "text-sm text-white/90",
                !hasAccess && "blur-[3px] select-none"
              )}>
                {hasAccess ? `${prediction.draw}%` : "??"}
              </span>
            </div>
            <div className="h-1 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  predictedOutcome === "draw" ? "bg-green-500" : "bg-orange-500"
                )}
                style={{ width: hasAccess ? `${Math.max(8, prediction.draw)}%` : "25%" }}
              />
            </div>
          </div>

          {/* Away Team */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-white">{prediction.away_team}</span>
              <span className={cn(
                "text-sm text-white/90",
                !hasAccess && "blur-[3px] select-none"
              )}>
                {hasAccess ? `${prediction.away_win}%` : "??"}
              </span>
            </div>
            <div className="h-1 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  predictedOutcome === "away" ? "bg-green-500" : "bg-orange-500"
                )}
                style={{ width: hasAccess ? `${Math.max(8, prediction.away_win)}%` : "45%" }}
              />
            </div>
          </div>
        </div>

        {/* Predicted Score & AI Confidence */}
        <div className="px-4 pb-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground mb-1">Predicted Score</div>
            <div className={cn(
              "text-base font-bold text-white flex items-center gap-1",
              !hasAccess && "blur-[4px] select-none"
            )}>
              {hasAccess ? (
                <span>{prediction.predicted_score || "—"}</span>
              ) : (
                <>
                  <span className="text-amber-400">?</span>
                  <span className="text-amber-400">?</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground mb-1">AI Confidence</div>
            <div className={cn(
              "text-base font-bold",
              hasAccess ? "text-green-400" : "text-white blur-[4px] select-none"
            )}>
              {hasAccess ? `${prediction.confidence}%` : "??%"}
            </div>
          </div>
        </div>

        {/* AI Analysis - Only visible when unlocked */}
        {hasAccess && prediction.analysis && (
          <div className="px-4 pb-4">
            <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-xs text-muted-foreground hover:text-foreground p-2 h-auto bg-[#1e3a5f]/20 rounded"
                >
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Analysis
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isAnalysisOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 bg-[#1e3a5f]/20 rounded">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {prediction.analysis}
                  </p>
                  {prediction.key_factors && prediction.key_factors.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {prediction.key_factors.map((factor, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] bg-[#1e3a5f]/40">
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

        {/* Unlock CTA - Only show when locked */}
        {!hasAccess && (
          <div className="px-4 pb-5">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Unlock full AI analysis and predictions
            </p>
            
            {needsPremiumUpgrade ? (
              /* Premium prediction - requires subscription */
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 font-medium"
                onClick={onGoPremium}
              >
                <Star className="w-4 h-4 mr-2 fill-current" />
                Get AI Pro Access
              </Button>
            ) : canWatchAd ? (
              /* Non-premium prediction - can unlock with ad */
              <Button
                variant="outline"
                className="w-full border-[#1e3a5f]/60 bg-transparent text-white hover:bg-[#1e3a5f]/30 font-medium"
                onClick={handleWatchAd}
                disabled={isUnlocking}
              >
                <Eye className="w-4 h-4 mr-2" />
                {isUnlocking ? "Unlocking..." : "Watch Ad to Unlock Prediction"}
              </Button>
            ) : null}
          </div>
        )}

        {/* Unlocked indicator for non-admin users */}
        {hasAccess && !isAdmin && !isPremiumUser && (
          <div className="px-4 pb-4">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              ✓ Unlocked
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIPredictionCard;
