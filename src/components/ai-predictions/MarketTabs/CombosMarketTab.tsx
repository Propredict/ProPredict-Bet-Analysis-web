import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { deriveMarkets } from "../utils/marketDerivation";
import { Star, Zap } from "lucide-react";

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
}

export function CombosMarketTab({ prediction, hasAccess }: Props) {
  const markets = deriveMarkets(prediction);

  if (markets.combos.length === 0) {
    return (
      <div className="text-center py-4 md:py-6">
        <Zap className="w-6 md:w-8 h-6 md:h-8 text-muted-foreground mx-auto mb-1.5 md:mb-2" />
        <p className="text-xs md:text-sm text-muted-foreground">No combos for this match</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
        <Zap className="w-3.5 md:w-4 h-3.5 md:h-4 text-amber-400" />
        <span className="text-xs md:text-sm font-medium text-foreground">Smart Combos</span>
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[9px] md:text-[10px] rounded-lg">
          Max 2
        </Badge>
      </div>

      <div className="space-y-1.5 md:space-y-2">
        {markets.combos.map((combo, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center justify-between p-2 md:p-3 rounded-lg border transition-all",
              combo.recommended
                ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30"
                : "bg-[#1e3a5f]/20 border-[#1e3a5f]/30"
            )}
          >
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className={cn(
                "text-xs md:text-sm font-semibold",
                !hasAccess && "blur-sm select-none",
                hasAccess ? "text-foreground" : "text-muted-foreground"
              )}>
                {hasAccess ? combo.label : "?? & ??"}
              </span>
              {combo.recommended && hasAccess && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] md:text-[10px] px-1 md:px-1.5 py-0 rounded-lg">
                  <Star className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 fill-current" />
                  AI
                </Badge>
              )}
            </div>
            {hasAccess && (
              <span className={cn(
                "text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-lg font-medium",
                combo.recommended 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-yellow-500/20 text-yellow-400"
              )}>
                {combo.recommended ? "Strong" : "Moderate"}
              </span>
            )}
          </div>
        ))}
      </div>

      {hasAccess && (
        <div className="bg-[#1e3a5f]/20 rounded-lg p-2 md:p-3 border border-[#1e3a5f]/30 mt-2 md:mt-3">
          <p className="text-[10px] md:text-xs text-muted-foreground">
            <span className="font-semibold text-amber-400">Higher value:</span> Combines result + goals.
          </p>
        </div>
      )}
    </div>
  );
}
