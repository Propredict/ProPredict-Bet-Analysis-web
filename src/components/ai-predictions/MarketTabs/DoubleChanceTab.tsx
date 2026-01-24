import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { deriveMarkets } from "../utils/marketDerivation";
import { Star, Shield } from "lucide-react";

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
}

export function DoubleChanceTab({ prediction, hasAccess }: Props) {
  const markets = deriveMarkets(prediction);

  const getDoubleChanceLabel = (option: string) => {
    switch (option) {
      case "1X":
        return `${prediction.home_team} or Draw`;
      case "12":
        return `${prediction.home_team} or ${prediction.away_team}`;
      case "X2":
        return `Draw or ${prediction.away_team}`;
      default:
        return option;
    }
  };

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
        <Shield className="w-3.5 md:w-4 h-3.5 md:h-4 text-cyan-400" />
        <span className="text-xs md:text-sm font-medium text-foreground">Double Chance</span>
      </div>

      <div className={cn(
        "p-2.5 md:p-4 rounded-lg border bg-green-500/10 border-green-500/30"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className={cn(
              "text-base md:text-lg font-bold",
              !hasAccess && "blur-sm select-none",
              hasAccess ? "text-foreground" : "text-muted-foreground"
            )}>
              {hasAccess ? markets.doubleChance.option : "??"}
            </span>
            {hasAccess && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] md:text-[10px] px-1 md:px-1.5 py-0 rounded-lg">
                <Star className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 fill-current" />
                AI
              </Badge>
            )}
          </div>
        </div>
        
        {hasAccess && (
          <p className="text-xs md:text-sm text-muted-foreground mt-1.5 md:mt-2">
            {getDoubleChanceLabel(markets.doubleChance.option)}
          </p>
        )}
      </div>

      {hasAccess && (
        <div className="bg-[#1e3a5f]/20 rounded-lg p-2 md:p-3 border border-[#1e3a5f]/30">
          <p className="text-[10px] md:text-xs text-muted-foreground">
            <span className="font-semibold text-cyan-400">Safer bet:</span> Covers two outcomes.
          </p>
        </div>
      )}
    </div>
  );
}
