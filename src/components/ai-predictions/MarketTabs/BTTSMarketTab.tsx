import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { calculateGoalMarketProbs } from "../utils/marketDerivation";
import { Brain, Lightbulb, Users } from "lucide-react";

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
}

export function BTTSMarketTab({ prediction, hasAccess }: Props) {
  const probs = calculateGoalMarketProbs(prediction);

  const yesRecommended = probs.bttsYes >= 50;

  const fairOdds = (prob: number) => (prob > 0 ? (100 / prob).toFixed(2) : "—");

  const options = [
    {
      label: "YES (GG)",
      description: "Both teams to score",
      prob: probs.bttsYes,
      odds: fairOdds(probs.bttsYes),
      recommended: yesRecommended,
    },
    {
      label: "NO (NG)",
      description: "At least one team keeps a clean sheet",
      prob: probs.bttsNo,
      odds: fairOdds(probs.bttsNo),
      recommended: !yesRecommended && probs.bttsNo >= 50,
    },
  ];

  const insight = (prediction.analysis || "").trim();

  return (
    <div className="min-w-0 space-y-2.5 md:space-y-3">
      {/* Header */}
      <div className="rounded-lg border border-primary/25 bg-card p-2.5 md:p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary md:h-10 md:w-10">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-black text-foreground md:text-base">Both Teams to Score</h4>
                <Badge className="h-5 border-primary/20 bg-secondary px-1.5 text-[9px] font-bold text-primary">
                  <Brain className="mr-1 h-2.5 w-2.5" /> AI
                </Badge>
              </div>
              <p className="text-[10px] font-medium leading-tight text-muted-foreground md:text-xs">
                AI analysis for the BTTS market
              </p>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-2 sm:flex">
            <Brain className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-[10px] font-extrabold text-foreground">AI Analysis</span>
          </div>
        </div>
      </div>

      {/* Two outcome cards */}
      <div className="grid min-w-0 grid-cols-2 gap-2 md:gap-3">
        {options.map((option) => (
          <div
            key={option.label}
            className={cn(
              "flex min-w-0 flex-col rounded-lg border p-2.5 transition-colors md:p-3",
              hasAccess && option.recommended
                ? "border-success/40 bg-success/10"
                : "border-primary/20 bg-secondary/60"
            )}
          >
            <div className="flex min-w-0 items-start justify-between gap-1.5">
              <div className="min-w-0">
                <p className={cn(
                  "text-sm font-black leading-tight md:text-base",
                  hasAccess && option.recommended ? "text-success" : "text-foreground"
                )}>
                  {option.label}
                </p>
                <p className="mt-0.5 text-[9px] font-medium leading-tight text-muted-foreground md:text-[11px]">
                  {option.description}
                </p>
              </div>
              <div className={cn("shrink-0 text-right", !hasAccess && "blur-md select-none")}>
                <span className={cn(
                  "block text-xl font-black tabular-nums leading-none md:text-2xl",
                  hasAccess && option.recommended ? "text-success" : "text-foreground"
                )}>
                  {hasAccess ? `${option.prob}%` : "••%"}
                </span>
                {hasAccess && (
                  <span className={cn(
                    "mt-0.5 block text-[10px] font-bold tabular-nums md:text-xs",
                    option.recommended ? "text-success" : "text-muted-foreground"
                  )}>
                    {option.odds}
                  </span>
                )}
              </div>
            </div>
            <div className={cn("mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10 md:mt-2.5 md:h-2", !hasAccess && "opacity-50")}>
              <div
                className={cn(
                  "h-full rounded-full",
                  hasAccess && option.recommended ? "bg-success" : "bg-primary/60"
                )}
                style={{ width: hasAccess ? `${option.prob}%` : "50%" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      {hasAccess && insight && (
        <div className="rounded-lg border border-primary/20 bg-secondary/50 p-2.5 md:p-3">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-xs font-extrabold text-primary md:text-sm">AI Insight</span>
          </div>
          <p className="mt-1.5 text-[10px] font-medium leading-snug text-foreground/90 md:text-xs md:leading-relaxed">
            {insight}
          </p>
        </div>
      )}

      {hasAccess && (
        <p className="text-[10px] font-medium text-muted-foreground md:text-xs">
          AI expects: <span className="font-bold text-foreground">
            {probs.bttsYes >= 50 ? "Both teams to score" : "Clean sheet likely"}
          </span>
          <span className="ml-1.5 text-[9px] md:text-[10px]">(Fair odds from our model)</span>
        </p>
      )}
    </div>
  );
}
