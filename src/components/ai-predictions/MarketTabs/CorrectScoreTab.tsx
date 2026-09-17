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
import { Crosshair, Lightbulb, Sparkles, BarChart3 } from "lucide-react";

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

const RANK_STYLES = [
  "bg-warning text-warning-foreground",
  "bg-muted text-muted-foreground",
  "bg-primary/20 text-primary",
];

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

  const maxProb = Math.max(...topScores.map((s) => Number(s.probability) || 0), 1);

  return (
    <div className="space-y-2.5">
      {/* Header */}
      <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Crosshair className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-extrabold text-foreground sm:text-base">
            Top Correct Scores
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
            (1 of {Math.max(topScores.length, 1)})
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
            <Sparkles className="h-3 w-3" /> AI
          </span>
        </div>
        <div className="flex items-start gap-1.5 rounded-lg border border-primary/20 bg-card px-2 py-1.5">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-[10px] font-medium leading-snug text-muted-foreground">
            Correct score predictions are based on team form, attacking strength and defensive records.
          </p>
        </div>
      </div>

      {/* Score cards */}
      <div
        className={cn(
          "grid gap-2",
          topScores.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3",
          topScores.length === 3 && "grid-cols-3"
        )}
      >
        {topScores.map((s, i) => {
          const prob = Number(s.probability) || 0;
          const fairOdds = prob > 0 ? (100 / prob).toFixed(2) : "-";
          const top = i === 0;
          return (
            <div
              key={s.score}
              className={cn(
                "relative rounded-xl border p-2.5 pt-4 text-center transition-colors",
                top
                  ? "border-success/50 bg-success/10 shadow-sm"
                  : "border-border bg-card"
              )}
            >
              <span
                className={cn(
                  "absolute -top-2.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full text-[10px] font-extrabold shadow",
                  RANK_STYLES[i] ?? RANK_STYLES[2]
                )}
              >
                {i + 1}
              </span>

              <div
                className={cn(
                  "text-xl font-extrabold tracking-tight sm:text-2xl",
                  top ? "text-success" : "text-foreground",
                  !hasAccess && "blur-[5px] select-none"
                )}
              >
                {s.score}
              </div>

              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span
                  className={cn(
                    "text-xs font-bold",
                    top ? "text-success" : "text-muted-foreground",
                    !hasAccess && "blur-[5px] select-none"
                  )}
                >
                  {prob}%
                </span>
                <span
                  className={cn(
                    "rounded-md border px-1.5 py-0.5 text-[10px] font-bold",
                    top
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border bg-secondary text-foreground",
                    !hasAccess && "blur-[5px] select-none"
                  )}
                >
                  {fairOdds}
                </span>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full", top ? "bg-success" : "bg-primary")}
                  style={{ width: `${Math.max(6, Math.round((prob / maxProb) * 100))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
        <BarChart3 className="h-3.5 w-3.5" />
        More Likely Correct Scores
      </div>
    </div>
  );
}
