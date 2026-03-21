import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { 
  deriveMarkets, 
  getBadgeStyles, 
  getBadgeLabel, 
  getRiskLevelColor,
  calculateGoalMarketProbs,
} from "../utils/marketDerivation";
import { getShortConfidenceExplanation } from "../utils/aiExplanationGenerator";
import { Star, Shield, Trophy, TrendingUp, Target, Zap, ArrowUp, ArrowDown } from "lucide-react";

/** Determine the best pick across all markets with an icon */
function getBestPickWithIcon(prediction: AIPrediction) {
  const p = (prediction.prediction || "").toLowerCase();
  const hw = prediction.home_win ?? 0;
  const aw = prediction.away_win ?? 0;
  const d = prediction.draw ?? 0;
  const mainConf = prediction.confidence ?? 0;

  // Direct mapping from backend prediction value
  if (p.includes("over")) {
    return { label: "Over 2.5 Goals", conf: mainConf, icon: <TrendingUp className="w-3.5 h-3.5 text-green-400" /> };
  }
  if (p.includes("under")) {
    return { label: "Under 2.5 Goals", conf: mainConf, icon: <TrendingUp className="w-3.5 h-3.5 text-orange-400" /> };
  }
  if (p === "btts yes") {
    return { label: "BTTS Yes", conf: mainConf, icon: <Zap className="w-3.5 h-3.5 text-yellow-400" /> };
  }
  if (p === "btts no") {
    return { label: "BTTS No", conf: mainConf, icon: <Zap className="w-3.5 h-3.5 text-red-400" /> };
  }
  if (p === "x" || p === "draw") {
    return { label: "Draw", conf: Math.max(d, mainConf), icon: <Target className="w-3.5 h-3.5 text-blue-400" /> };
  }
  if (p === "2" || p === "away") {
    return { label: `${prediction.away_team} Win`, conf: Math.max(aw, mainConf), icon: <Trophy className="w-3.5 h-3.5 text-amber-400" /> };
  }
  // Default: home win
  return { label: `${prediction.home_team} Win`, conf: Math.max(hw, mainConf), icon: <Trophy className="w-3.5 h-3.5 text-amber-400" /> };
}

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
}

export function MainMarketTab({ prediction, hasAccess }: Props) {
  const markets = deriveMarkets(prediction);
  
  const getPredictedOutcome = () => {
    if (!prediction.prediction) return "unknown";
    const p = prediction.prediction.toLowerCase();
    if (p === "1" || p === "home") return "home";
    if (p === "2" || p === "away") return "away";
    if (p.includes("over") || p.includes("under") || p.includes("btts")) {
      // For goal markets, derive 1X2 from probabilities
      const hw = prediction.home_win ?? 0;
      const aw = prediction.away_win ?? 0;
      if (hw > aw) return "home";
      if (aw > hw) return "away";
      return "draw";
    }
    return "draw";
  };

  const predictedOutcome = getPredictedOutcome();

  return (
    <div className="space-y-3 md:space-y-4">
      {/* AI Guidance Badge */}
      <div className="flex items-center justify-between">
        <Badge className={cn("text-[10px] md:text-xs rounded-lg", getBadgeStyles(markets.guidance.badge))}>
          {getBadgeLabel(markets.guidance.badge)}
        </Badge>
        {prediction.risk_level && (
          <Badge className={cn("text-[10px] md:text-xs capitalize rounded-lg", getRiskLevelColor(prediction.risk_level))}>
            <Shield className="w-2.5 md:w-3 h-2.5 md:h-3 mr-0.5 md:mr-1" />
            {prediction.risk_level}
          </Badge>
        )}
      </div>

      {/* Probability Bars */}
      <div className="space-y-2 md:space-y-3">
        {/* Home Team */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs md:text-sm text-white flex items-center gap-1">
              <span className="truncate max-w-[120px] md:max-w-none">{prediction.home_team}</span>
              {predictedOutcome === "home" && hasAccess && (
                <Star className="w-2.5 md:w-3 h-2.5 md:h-3 text-amber-400 fill-amber-400" />
              )}
            </span>
            <span className={cn(
              "text-xs md:text-sm text-white/90",
              !hasAccess && "blur-sm select-none"
            )}>
              {hasAccess ? `${prediction.home_win}%` : "??"}
            </span>
          </div>
          <div className="h-1 md:h-1.5 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
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
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs md:text-sm text-white flex items-center gap-1">
              Draw
              {predictedOutcome === "draw" && hasAccess && (
                <Star className="w-2.5 md:w-3 h-2.5 md:h-3 text-amber-400 fill-amber-400" />
              )}
            </span>
            <span className={cn(
              "text-xs md:text-sm text-white/90",
              !hasAccess && "blur-sm select-none"
            )}>
              {hasAccess ? `${prediction.draw}%` : "??"}
            </span>
          </div>
          <div className="h-1 md:h-1.5 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
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
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs md:text-sm text-white flex items-center gap-1">
              <span className="truncate max-w-[120px] md:max-w-none">{prediction.away_team}</span>
              {predictedOutcome === "away" && hasAccess && (
                <Star className="w-2.5 md:w-3 h-2.5 md:h-3 text-amber-400 fill-amber-400" />
              )}
            </span>
            <span className={cn(
              "text-xs md:text-sm text-white/90",
              !hasAccess && "blur-sm select-none"
            )}>
              {hasAccess ? `${prediction.away_win}%` : "??"}
            </span>
          </div>
          <div className="h-1 md:h-1.5 bg-[#1e3a5f]/40 rounded-full overflow-hidden">
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

      {/* Best Pick & Confidence */}
      <div className="flex items-end justify-between pt-1.5 md:pt-2">
        <div>
          <div className="text-[9px] md:text-[11px] text-muted-foreground mb-0.5">Best Pick</div>
          <div className={cn(
            "text-sm md:text-base font-bold text-white flex items-center gap-1.5",
            !hasAccess && "blur-sm select-none"
          )}>
            {hasAccess ? (() => {
              const pick = getBestPickWithIcon(prediction);
              return (
                <>
                  {pick.icon}
                  {pick.label}
                </>
              );
            })() : "? ? ?"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] md:text-[11px] text-muted-foreground mb-0.5">Confidence</div>
          <div className={cn(
            "text-base md:text-lg font-bold",
            hasAccess ? "text-green-400" : "text-white blur-sm select-none"
          )}>
            {hasAccess ? `${prediction.confidence}%` : "??%"}
          </div>
        </div>
      </div>

      {/* Confidence Explanation - Dynamic based on prediction context */}
      {hasAccess && (
        <p className="text-[10px] md:text-xs text-muted-foreground italic border-t border-[#1e3a5f]/30 pt-2 md:pt-3 line-clamp-2">
          {getShortConfidenceExplanation(prediction)}
        </p>
      )}
    </div>
  );
}
