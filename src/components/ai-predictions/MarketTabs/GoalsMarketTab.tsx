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
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-foreground">Goals Markets</span>
      </div>

      <div className="space-y-2">
        {goals.map((goal) => (
          <div
            key={goal.label}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all",
              goal.data.recommended
                ? "bg-green-500/10 border-green-500/30"
                : "bg-[#1e3a5f]/20 border-[#1e3a5f]/30"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{goal.label}</span>
              {goal.data.recommended && hasAccess && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                  <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
                  AI Pick
                </Badge>
              )}
            </div>
            <span className={cn(
              "text-sm font-semibold",
              !hasAccess && "blur-[3px] select-none",
              hasAccess && goal.data.recommended ? "text-green-400" : "text-muted-foreground"
            )}>
              {hasAccess ? goal.data.value : "??"}
            </span>
          </div>
        ))}
      </div>

      {hasAccess && (
        <p className="text-xs text-muted-foreground mt-3">
          Based on predicted score: <span className="font-semibold text-foreground">{prediction.predicted_score || "N/A"}</span>
        </p>
      )}
    </div>
  );
}
