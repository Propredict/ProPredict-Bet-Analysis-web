import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { deriveMarkets } from "../utils/marketDerivation";
import { Star, Target } from "lucide-react";

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
}

export function GoalsMarketTab({ prediction, hasAccess }: Props) {
  const markets = deriveMarkets(prediction);

  const goals = [
    { label: "Over 1.5", data: markets.goals.over15 },
    { label: "Over 2.5", data: markets.goals.over25 },
    { label: "Under 3.5", data: markets.goals.under35 },
  ];

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
        <Target className="w-3.5 md:w-4 h-3.5 md:h-4 text-blue-400" />
        <span className="text-xs md:text-sm font-medium text-foreground">Goals Markets</span>
      </div>

      <div className="space-y-1.5 md:space-y-2">
        {goals.map((goal) => (
          <div
            key={goal.label}
            className={cn(
              "flex items-center justify-between p-2 md:p-3 rounded-lg border transition-all",
              goal.data.recommended
                ? "bg-green-500/10 border-green-500/30"
                : "bg-[#1e3a5f]/20 border-[#1e3a5f]/30"
            )}
          >
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-xs md:text-sm font-medium text-foreground">{goal.label}</span>
              {goal.data.recommended && hasAccess && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] md:text-[10px] px-1 md:px-1.5 py-0 rounded-lg">
                  <Star className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 fill-current" />
                  AI
                </Badge>
              )}
            </div>
            <span className={cn(
              "text-xs md:text-sm font-semibold",
              !hasAccess && "blur-sm select-none",
              hasAccess && goal.data.recommended ? "text-green-400" : "text-muted-foreground"
            )}>
              {hasAccess ? goal.data.value : "??"}
            </span>
          </div>
        ))}
      </div>

      {hasAccess && (
        <p className="text-[10px] md:text-xs text-muted-foreground mt-2 md:mt-3">
          Predicted: <span className="font-semibold text-foreground">{prediction.predicted_score || "N/A"}</span>
        </p>
      )}
    </div>
  );
}
