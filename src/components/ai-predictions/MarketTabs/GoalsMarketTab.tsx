import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { calculateGoalMarketProbs, getDerivedPredictedScore, getRecommendedScoreConstraints } from "../utils/marketDerivation";
import { ArrowDownRight, ArrowUp, Brain, ChevronsUp, Lightbulb, Target, TrendingUp } from "lucide-react";

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
}

export function GoalsMarketTab({ prediction, hasAccess }: Props) {
  const probs = calculateGoalMarketProbs(prediction);
  const scoreConstraints = getRecommendedScoreConstraints(prediction);

  const goals = [
    { label: "Over 1.5", description: "Higher chance of 2+ goals", prob: probs.over15, recommended: probs.over15 >= 55, icon: ArrowUp },
    { label: "Over 2.5", description: "Possibility of 3+ goals", prob: probs.over25, recommended: probs.over25 >= 50, icon: TrendingUp },
    { label: "Under 2.5", description: "Lower chance of 3+ goals", prob: probs.under25, recommended: probs.under25 >= 55, icon: ArrowDownRight },
    { label: "Over 3.5", description: "High-scoring potential", prob: probs.over35, recommended: probs.over35 >= 45, icon: ChevronsUp },
  ];

  const strengthLabel = (prob: number) => {
    if (prob >= 80) return "Very High";
    if (prob >= 65) return "High";
    if (prob >= 45) return "Medium";
    return "Low";
  };

  return (
    <div className="min-w-0 space-y-2.5 md:space-y-3">
      <div className="rounded-lg border border-primary/25 bg-card p-2.5 md:p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary md:h-10 md:w-10">
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-black text-foreground md:text-base">Goals Markets</h4>
                <Badge className="h-5 border-primary/20 bg-secondary px-1.5 text-[9px] font-bold text-primary">
                  <Brain className="mr-1 h-2.5 w-2.5" /> AI
                </Badge>
              </div>
              <p className="text-[10px] font-medium leading-tight text-muted-foreground md:text-xs">
                AI analysis for total goals in this match
              </p>
            </div>
          </div>

          <div className="hidden max-w-[47%] items-center gap-2 rounded-lg bg-secondary px-2.5 py-2 sm:flex">
            <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold text-foreground">Goals Insight</p>
              <p className="text-[9px] leading-tight text-muted-foreground">Based on match data and team form.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-primary/20 bg-card p-2 md:p-2.5">
        {goals.map((goal) => {
          const GoalIcon = goal.icon;
          return (
            <div
              key={goal.label}
              className={cn(
                "grid min-w-0 grid-cols-[minmax(0,1fr)_104px] items-center gap-2 rounded-lg border px-2.5 py-2.5 transition-colors md:grid-cols-[minmax(0,1fr)_165px] md:px-3",
                hasAccess && goal.recommended
                  ? "border-success/35 bg-success/10"
                  : "border-primary/20 bg-secondary/60"
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-9 md:w-9",
                  hasAccess && goal.recommended ? "bg-success/15 text-success" : "bg-secondary text-primary"
                )}>
                  <GoalIcon className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black leading-tight text-foreground md:text-base">{goal.label}</p>
                  <p className="truncate text-[9px] font-medium text-muted-foreground md:text-[11px]">{goal.description}</p>
                </div>
              </div>

              <div className={cn("min-w-0", !hasAccess && "blur-md select-none opacity-60")}>
                <div className="mb-1 flex items-center justify-between gap-1.5">
                  <span className={cn(
                    "text-lg font-black tabular-nums leading-none md:text-xl",
                    goal.recommended ? "text-success" : "text-primary"
                  )}>
                    {hasAccess ? `${goal.prob}%` : "••%"}
                  </span>
                  {hasAccess && (
                    <Badge className={cn(
                      "hidden h-5 border-0 px-2 text-[9px] font-extrabold sm:inline-flex",
                      goal.recommended ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                    )}>
                      {strengthLabel(goal.prob)}
                    </Badge>
                  )}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-primary/10 md:h-2">
                  <div
                    className={cn("h-full rounded-full", goal.recommended ? "bg-success" : "bg-primary")}
                    style={{ width: hasAccess ? `${goal.prob}%` : "60%" }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasAccess && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-secondary/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground md:text-xs">AI predicted score</span>
          </div>
          <span className="text-sm font-black text-foreground md:text-base">
            {getDerivedPredictedScore(prediction, scoreConstraints)}
          </span>
        </div>
      )}
    </div>
  );
}