import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";

interface Props {
  prediction: AIPrediction;
  /** Compact = chip with only count, used inside dense card headers */
  compact?: boolean;
}

type Signal = {
  key: "form" | "xg" | "h2h" | "odds" | "lineups";
  label: string;
  present: boolean;
  detail: string;
};

/**
 * Data Quality Badge — shows which real-data signals back this prediction.
 * Hover/tap to see Form ✓ xG ✓ H2H ✓ Odds ✓ Lineups ✓ breakdown.
 * Verifies the AI has actual analytical inputs (not fabricated/fallback).
 */
export const DataQualityBadge = ({ prediction, compact = false }: Props) => {
  const signals = useMemo<Signal[]>(() => {
    const p = prediction as any;
    const factors: string[] = Array.isArray(p.key_factors) ? p.key_factors : [];

    // Form: pipeline stores last-N goals when it had real fixture history
    const hasForm =
      (p.last_home_goals !== null && p.last_home_goals !== undefined) ||
      (p.last_away_goals !== null && p.last_away_goals !== undefined);

    // xG: Poisson signal for both sides
    const hasXg =
      typeof p.xg_home === "number" && p.xg_home > 0 &&
      typeof p.xg_away === "number" && p.xg_away > 0;

    // H2H: factor strings start with "H2H " when there's real head-to-head data
    const hasH2H = factors.some(
      (f) => typeof f === "string" && /^h2h\b/i.test(f.trim()),
    );

    // Odds: bookmaker consensus from at least 2 books
    const bookmakers = typeof p.bookmakers_count === "number" ? p.bookmakers_count : 0;
    const hasConsensus =
      (typeof p.consensus_home === "number" && p.consensus_home > 0) ||
      (typeof p.consensus_draw === "number" && p.consensus_draw > 0) ||
      (typeof p.consensus_away === "number" && p.consensus_away > 0);
    const hasOdds = bookmakers >= 2 && hasConsensus;

    // Lineups: confirmed lineups from API
    const hasLineups = p.lineup_confirmed === true;

    return [
      { key: "form", label: "Form", present: hasForm, detail: hasForm ? "Recent matches analyzed" : "No recent form data" },
      { key: "xg", label: "xG", present: hasXg, detail: hasXg ? `Expected goals ${(p.xg_home ?? 0).toFixed(2)} – ${(p.xg_away ?? 0).toFixed(2)}` : "No xG signal" },
      { key: "h2h", label: "H2H", present: hasH2H, detail: hasH2H ? "Head-to-head history factored" : "No H2H sample" },
      { key: "odds", label: "Odds", present: hasOdds, detail: hasOdds ? `${bookmakers} bookmakers consensus` : "No bookmaker consensus" },
      { key: "lineups", label: "Lineups", present: hasLineups, detail: hasLineups ? "Starting XI confirmed" : "Lineups not yet confirmed" },
    ];
  }, [prediction]);

  const presentCount = signals.filter((s) => s.present).length;
  const total = signals.length;

  // Color tier: 4-5 → emerald, 3 → amber, ≤2 → muted (still informative, not alarming)
  const tone =
    presentCount >= 4 ? "emerald" :
    presentCount >= 3 ? "amber" : "muted";

  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
      : tone === "amber"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
      : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/40";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex items-center gap-1 rounded border font-semibold transition-colors",
              "text-[8px] md:text-[9px] px-1 md:px-1.5 py-0.5",
              toneClasses,
            )}
            aria-label={`Data quality: ${presentCount} of ${total} signals available`}
          >
            <ShieldCheck className="w-2 md:w-2.5 h-2 md:h-2.5" />
            {compact ? (
              <span>{presentCount}/{total}</span>
            ) : (
              <span>DATA {presentCount}/{total}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          className="max-w-[220px] p-2.5 bg-[#0a1628] border-[#1e3a5f] text-foreground"
        >
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-foreground border-b border-[#1e3a5f] pb-1.5 mb-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Data Quality · {presentCount}/{total}
            </div>
            {signals.map((s) => (
              <div key={s.key} className="flex items-start gap-2">
                {s.present ? (
                  <Check className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <X className="w-3 h-3 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-[10px] font-semibold",
                    s.present ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {s.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground leading-tight">
                    {s.detail}
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-1.5 mt-1.5 border-t border-[#1e3a5f] text-[9px] text-muted-foreground/80 leading-tight">
              {presentCount >= 4
                ? "Backed by full analytical pipeline."
                : presentCount >= 3
                ? "Solid analytical baseline."
                : "Limited signals — interpret with care."}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};