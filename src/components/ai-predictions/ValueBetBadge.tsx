import { Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Insight strength of the predicted side (e.g. 0.12 = +12%). */
  value?: number | null;
  /** True when value > 0.10 (strong insight). */
  isValueBet?: boolean | null;
  /** Hide if reliability gate failed (data sources < 2). */
  bookmakersCount?: number | null;
  className?: string;
  compact?: boolean;
}

/**
 * High Value Insight badge — surfaces strong analytical edge detected by
 * comparing AI probability against aggregated market consensus from multiple
 * data sources. Pure analytics signal, not betting advice.
 *
 *   🔥 High Value Insight → value > 0.10 (strong analytical edge)
 *   ⚡ Emerging Insight   → 0.05–0.10 (mild analytical edge)
 *   (hidden)              → value < 0.05 OR data sources < 2
 *
 * Does NOT modify AI confidence — purely an additional analytics signal.
 */
export function ValueBetBadge({
  value,
  isValueBet,
  bookmakersCount,
  className,
  compact = false,
}: Props) {
  // Reliability gate
  if (bookmakersCount != null && bookmakersCount < 2) return null;
  if (value == null || !Number.isFinite(value)) return null;

  // Tier classification
  const isStrong = isValueBet === true || value > 0.10;
  const isSlight = !isStrong && value >= 0.05;
  if (!isStrong && !isSlight) return null;

  const Icon = isStrong ? Flame : Zap;
  const label = isStrong ? "High Value Insight" : "Emerging Insight";
  const pct = `+${Math.round(value * 100)}%`;

  const tone = isStrong
    ? "bg-gradient-to-r from-orange-500/20 to-rose-500/20 text-orange-300 border-orange-500/40 shadow-[0_0_10px_rgba(251,146,60,0.25)]"
    : "bg-amber-500/15 text-amber-300 border-amber-500/30";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-bold uppercase tracking-wide",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[11px]",
        tone,
        className
      )}
      title={`Analytical edge: ${pct} vs market consensus (${bookmakersCount ?? "?"} data sources)`}
    >
      <Icon className={cn(compact ? "w-2.5 h-2.5" : "w-3 h-3")} />
      <span>{label}</span>
      <span className="opacity-90">{pct}</span>
    </div>
  );
}
