import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { 
  deriveMarkets, 
  getBadgeStyles, 
  getBadgeLabel, 
  getRiskLevelColor,
  getConfidenceExplanation 
} from "../utils/marketDerivation";
import { Star, Shield } from "lucide-react";

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
}

export function MainMarketTab({ prediction, hasAccess }: Props) {
  const markets = deriveMarkets(prediction);
  
  const getPredictedOutcome = () => {
    if (prediction.prediction === "1") return "home";
    if (prediction.prediction === "2") return "away";
    return "draw";
  };

  const predictedOutcome = getPredictedOutcome();

  return (
    <div className="space-y-4">
      {/* AI Guidance Badge */}
      <div className="flex items-center justify-between">
        <Badge className={cn("text-xs", getBadgeStyles(markets.guidance.badge))}>
          {getBadgeLabel(markets.guidance.badge)}
        </Badge>
        {prediction.risk_level && (
          <Badge className={cn("text-xs capitalize", getRiskLevelColor(prediction.risk_level))}>
            <Shield className="w-3 h-3 mr-1" />
            {prediction.risk_level} risk
          </Badge>
        )}
      </div>

      {/* Probability Bars */}
      <div className="space-y-3">
        {/* Home Team */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-white flex items-center gap-1.5">
              {prediction.home_team}
              {predictedOutcome === "home" && hasAccess && (
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              )}
            </span>
            <span className={cn(
              "text-sm text-white/90",
              !hasAccess && "blur-[3px] select-none"
            )}>
              {hasAccess ? `${prediction.home_win}%` : "??"}
            </span>
          </div>
          <div className="h-1.5 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                predictedOutcome === "home" ? "bg-green-500" : "bg-orange-500"
              )}
              style={{ width: hasAccess ? `${Math.max(8, prediction.home_win)}%` : "65%" }}
            />
          </div>
        </div>

        {/* Draw */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-white flex items-center gap-1.5">
              Draw
              {predictedOutcome === "draw" && hasAccess && (
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              )}
            </span>
            <span className={cn(
              "text-sm text-white/90",
              !hasAccess && "blur-[3px] select-none"
            )}>
              {hasAccess ? `${prediction.draw}%` : "??"}
            </span>
          </div>
          <div className="h-1.5 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                predictedOutcome === "draw" ? "bg-green-500" : "bg-orange-500"
              )}
              style={{ width: hasAccess ? `${Math.max(8, prediction.draw)}%` : "25%" }}
            />
          </div>
        </div>

        {/* Away Team */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-white flex items-center gap-1.5">
              {prediction.away_team}
              {predictedOutcome === "away" && hasAccess && (
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              )}
            </span>
            <span className={cn(
              "text-sm text-white/90",
              !hasAccess && "blur-[3px] select-none"
            )}>
              {hasAccess ? `${prediction.away_win}%` : "??"}
            </span>
          </div>
          <div className="h-1.5 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                predictedOutcome === "away" ? "bg-green-500" : "bg-orange-500"
              )}
              style={{ width: hasAccess ? `${Math.max(8, prediction.away_win)}%` : "45%" }}
            />
          </div>
        </div>
      </div>

      {/* Predicted Score & Confidence */}
      <div className="flex items-end justify-between pt-2">
        <div>
          <div className="text-[11px] text-muted-foreground mb-1">Predicted Score</div>
          <div className={cn(
            "text-lg font-bold text-white",
            !hasAccess && "blur-[4px] select-none"
          )}>
            {hasAccess ? (prediction.predicted_score || "—") : "? - ?"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-foreground mb-1">AI Confidence</div>
          <div className={cn(
            "text-lg font-bold",
            hasAccess ? "text-green-400" : "text-white blur-[4px] select-none"
          )}>
            {hasAccess ? `${prediction.confidence}%` : "??%"}
          </div>
        </div>
      </div>

      {/* Confidence Explanation */}
      {hasAccess && (
        <p className="text-xs text-muted-foreground italic border-t border-[#1e3a5f]/30 pt-3">
          {getConfidenceExplanation(prediction.confidence)}
        </p>
      )}
    </div>
  );
}
