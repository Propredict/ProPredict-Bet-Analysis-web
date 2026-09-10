import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import {
  getConsistentTopCorrectScores,
  getRecommendedScoreConstraints,
  getBestPickType,
  getRawProbMap,
  getBestEligibleProbability,
  type MarketType,
} from "../utils/marketDerivation";
import { Crosshair } from "lucide-react";

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
  displayTier?: "free" | "pro" | "premium";
}

const ONE_X_TWO: MarketType[] = ["home_win", "away_win", "draw"];

function getBestPick(prediction: AIPrediction) {
  const bestType = getBestPickType(prediction);
  const strongest = getBestEligibleProbability(prediction);
  const own = getRawProbMap(prediction)[bestType] ?? 0;
  const conf = ONE_X_TWO.includes(bestType)
    ? own
    : strongest >= 80 ? Math.max(own, strongest) : own;
  return { type: bestType, conf };
}

export function CorrectScoreTab({ prediction, hasAccess, displayTier = "free" }: Props) {
  const pick = getBestPick(prediction);
  const scoreConstraints = getRecommendedScoreConstraints(prediction);
  const topScores = getConsistentTopCorrectScores(
    prediction,
    { ...scoreConstraints, extraMarketTypes: [scoreConstraints.marketType, pick.type], marketType: pick.type },
    3
  );

  if (topScores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
        <Crosshair className="w-6 h-6 mb-2 opacity-50" />
        <p className="text-xs">No correct score predictions available for this match.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
        <Crosshair className={cn("w-3.5 md:w-4 h-3.5 md:h-4", displayTier === "premium" ? "text-fuchsia-400" : "text-amber-400")} />
        <span className="text-xs md:text-sm font-medium text-foreground">Top Correct Scores</span>
        <span className="text-[10px] md:text-xs text-muted-foreground font-medium">
          (1 of {Math.max(topScores.length, 1)})
        </span>
      </div>

      <div className={cn(
        "grid gap-1.5 md:gap-2",
        topScores.length === 1 ? "grid-cols-1" : topScores.length === 2 ? "grid-cols-2" : "grid-cols-3"
      )}>
        {topScores.map((s, i) => (
          <div
            key={s.score}
            className={cn(
              "text-center py-3 md:py-4 rounded-md border",
              i === 0
                ? displayTier === "premium"
                  ? "border-fuchsia-500/40 bg-fuchsia-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
                : "border-border/30 bg-card/20"
            )}
          >
            <div className={cn(
              "text-base md:text-lg font-bold text-foreground",
              !hasAccess && "blur-[5px] select-none"
            )}>
              {s.score}
            </div>
            <div className={cn(
              "text-[10px] md:text-xs font-medium",
              !hasAccess && "blur-[5px] select-none",
              i === 0
                ? displayTier === "premium" ? "text-fuchsia-400" : "text-amber-400"
                : "text-muted-foreground"
            )}>
              {s.probability}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
