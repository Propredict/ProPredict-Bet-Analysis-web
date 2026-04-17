import { TrendingDown, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  trend?: string | null;
  strength?: string | null;
  movementPct?: number | null;
  className?: string;
  compact?: boolean;
}

/**
 * Market Trend badge — communicates bookmaker consensus movement
 * WITHOUT betting language. Shown alongside AI confidence.
 *
 *   📉 Odds Dropping  → smart money on our pick (positive signal)
 *   📈 Market Cooling → market fading our pick
 *   📊 Market Stable  → no meaningful movement
 */
export function MarketTrendBadge({ trend, strength, movementPct, className, compact = false }: Props) {
  if (!trend || trend === "stable") {
    return null;
  }

  const isDropping = trend === "dropping";
  const isRising = trend === "rising";

  const Icon = isDropping ? TrendingDown : isRising ? TrendingUp : Activity;
  const label = isDropping
    ? "Odds Dropping"
    : isRising
    ? "Market Cooling"
    : "Market Trend";

  const tone = isDropping
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : isRising
    ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
    : "bg-muted/20 text-muted-foreground border-border/40";

  const strengthLabel = strength === "strong" ? "Strong" : strength === "moderate" ? "Moderate" : null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-semibold",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[11px]",
        tone,
        className
      )}
      title={
        movementPct != null
          ? `Consensus odds movement: ${movementPct > 0 ? "+" : ""}${movementPct.toFixed(1)}% vs previous snapshot`
          : undefined
      }
    >
      <Icon className={cn(compact ? "w-2.5 h-2.5" : "w-3 h-3")} />
      <span>{label}</span>
      {strengthLabel && !compact && (
        <span className="opacity-70">· {strengthLabel}</span>
      )}
    </div>
  );
}
