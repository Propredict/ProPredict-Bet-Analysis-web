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
      <div className="text-center py-6">
        <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No combo recommendations for this match</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-foreground">Smart Combos</span>
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
          Max 2
        </Badge>
      </div>

      <div className="space-y-2">
        {markets.combos.map((combo, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all",
              combo.recommended
                ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30"
                : "bg-[#1e3a5f]/20 border-[#1e3a5f]/30"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-semibold",
                !hasAccess && "blur-[4px] select-none",
                hasAccess ? "text-foreground" : "text-muted-foreground"
              )}>
                {hasAccess ? combo.label : "?? & ??"}
              </span>
              {combo.recommended && hasAccess && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                  <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
                  AI Pick
                </Badge>
              )}
            </div>
            {hasAccess && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded font-medium",
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
        <div className="bg-[#1e3a5f]/20 rounded-lg p-3 border border-[#1e3a5f]/30 mt-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-amber-400">Higher value:</span> Combo bets combine result with goals for better odds. Only recommended when AI confidence is high.
          </p>
        </div>
      )}
    </div>
  );
}
