import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { calculateGoalMarketProbs } from "../utils/marketDerivation";
import { Star, Users } from "lucide-react";

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
}

export function BTTSMarketTab({ prediction, hasAccess }: Props) {
  const probs = calculateGoalMarketProbs(prediction);

  const options = [
    { label: "GG (Both Teams Score)", prob: probs.bttsYes, recommended: probs.bttsYes >= 50 },
    { label: "NG (No Goal from One)", prob: probs.bttsNo, recommended: probs.bttsNo >= 50 },
  ];

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
        <Users className="w-3.5 md:w-4 h-3.5 md:h-4 text-purple-400" />
        <span className="text-xs md:text-sm font-medium text-foreground">Both Teams to Score</span>
      </div>

      <div className="space-y-1.5 md:space-y-2">
        {options.map((option) => (
          <div
            key={option.label}
            className={cn(
              "flex items-center justify-between p-2 md:p-3 rounded-lg border transition-all",
              hasAccess && option.recommended
                ? "bg-green-500/10 border-green-500/30"
                : "bg-[#1e3a5f]/20 border-[#1e3a5f]/30"
            )}
          >
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-xs md:text-sm font-medium text-foreground">
                {option.label}
              </span>
              {option.recommended && hasAccess && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] md:text-[10px] px-1 md:px-1.5 py-0 rounded-lg">
                  <Star className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 fill-current" />
                  AI
                </Badge>
              )}
            </div>
            <span className={cn(
              "text-xs md:text-sm font-bold tabular-nums",
              !hasAccess && "blur-md select-none text-muted-foreground/40",
              hasAccess && (option.recommended ? "text-green-400" : "text-muted-foreground")
            )}>
              {hasAccess ? `${option.prob}%` : "••%"}
            </span>
          </div>
        ))}
      </div>

      {hasAccess && (
        <p className="text-[10px] md:text-xs text-muted-foreground mt-2 md:mt-3">
          AI expects: <span className="font-semibold text-foreground">
            {probs.bttsYes >= 50 ? "Both teams to score" : "Clean sheet likely"}
          </span>
        </p>
      )}
    </div>
  );
}