import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { deriveMarkets } from "../utils/marketDerivation";
import { Star, Users } from "lucide-react";

interface Props {
  prediction: AIPrediction;
  hasAccess: boolean;
}

export function BTTSMarketTab({ prediction, hasAccess }: Props) {
  const markets = deriveMarkets(prediction);

  const options = [
    { label: "GG (Both Teams Score)", recommended: markets.btts.gg.recommended },
    { label: "NG (No Goal from One)", recommended: markets.btts.ng.recommended },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-foreground">Both Teams to Score</span>
      </div>

      <div className="space-y-2">
        {options.map((option) => (
          <div
            key={option.label}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all",
              option.recommended
                ? "bg-green-500/10 border-green-500/30"
                : "bg-[#1e3a5f]/20 border-[#1e3a5f]/30"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-medium",
                !hasAccess && "blur-[3px] select-none",
                hasAccess ? "text-foreground" : "text-muted-foreground"
              )}>
                {hasAccess ? option.label : "???"}
              </span>
              {option.recommended && hasAccess && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                  <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
                  AI Pick
                </Badge>
              )}
            </div>
            {hasAccess && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded",
                option.recommended 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-gray-500/20 text-gray-400"
              )}>
                {option.recommended ? "Likely" : "Less Likely"}
              </span>
            )}
          </div>
        ))}
      </div>

      {hasAccess && (
        <p className="text-xs text-muted-foreground mt-3">
          AI expects: <span className="font-semibold text-foreground">
            {markets.btts.gg.recommended ? "Both teams to find the net" : "At least one team to keep a clean sheet"}
          </span>
        </p>
      )}
    </div>
  );
}
