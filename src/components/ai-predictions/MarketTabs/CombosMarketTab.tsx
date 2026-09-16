import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { deriveMarkets, getConsistentSafeCombo } from "../utils/marketDerivation";
import { Sparkles, Star, Zap } from "lucide-react";

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
}

export function CombosMarketTab({ prediction, hasAccess }: Props) {
  const markets = deriveMarkets(prediction);
  const taggedCombo = prediction.key_factors
    ?.find((factor) => factor.startsWith("[TAG]SAFE_COMBO:"))
    ?.replace("[TAG]SAFE_COMBO:", "") ?? null;
  const riskCombo = getConsistentSafeCombo(prediction, taggedCombo);

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
        <Zap className="w-3.5 md:w-4 h-3.5 md:h-4 text-blue-400" />
        <span className="text-xs md:text-sm font-medium text-foreground">Smart Combos</span>
      </div>

      <div className="space-y-1.5 md:space-y-2">
        {markets.combos.map((combo, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center justify-between p-2 md:p-3 rounded-lg border transition-all",
              hasAccess && combo.recommended
                ? "bg-gradient-to-r from-blue-500/10 to-blue-500/10 border-blue-500/30"
                : "bg-[#1e3a5f]/20 border-[#1e3a5f]/30"
            )}
          >
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className={cn(
                "text-xs md:text-sm font-semibold text-foreground",
                !hasAccess && "blur-md select-none"
              )}>
                {hasAccess ? combo.label : "•••••• ••••"}
              </span>
              {combo.recommended && hasAccess && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[9px] md:text-[10px] px-1 md:px-1.5 py-0 rounded-lg">
                  <Star className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 fill-current" />
                  AI
                </Badge>
              )}
            </div>
            <span className={cn(
              "text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-lg font-medium",
              !hasAccess && "blur-md select-none bg-muted-foreground/10 text-muted-foreground/40",
              hasAccess && (combo.recommended ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400")
            )}>
              {hasAccess ? (combo.recommended ? "Strong" : "Moderate") : "•••••"}
            </span>
          </div>
        ))}
      </div>

      {riskCombo && (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-xs md:text-sm font-semibold uppercase text-blue-400">Risk Combo</span>
          </div>
          <span className={cn(
            "text-base md:text-lg font-bold text-foreground",
            !hasAccess && "blur-[5px] select-none"
          )}>
            {hasAccess ? riskCombo : "•••••• • •••• •••"}
          </span>
        </div>
      )}

      {hasAccess && (
        <div className="bg-[#1e3a5f]/20 rounded-lg p-2 md:p-3 border border-[#1e3a5f]/30 mt-2 md:mt-3">
          <p className="text-[10px] md:text-xs text-muted-foreground">
            <span className="font-semibold text-blue-400">Higher value:</span> Combines result + goals.
          </p>
        </div>
      )}
    </div>
  );
}
