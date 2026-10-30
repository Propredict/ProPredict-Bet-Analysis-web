import type { AIPrediction } from "@/hooks/useAIPredictions";
import {
  applyPickDiversity,
  calculateGoalMarketProbs,
  getBestMarketPickWithLabel,
  MIN_PICK_PROBABILITY,
} from "@/components/ai-predictions/utils/marketDerivation";
import { assignTiers, type Tier } from "@/components/ai-predictions/utils/tierAssignment";

export type SeoPageVariant = "today" | "btts" | "over25";

export interface SeoPredictionItem {
  prediction: AIPrediction;
  tier: Tier;
  label: string;
  pct: number;
}

const TIER_ORDER: Record<Tier, number> = { free: 0, premium: 1, pro: 2 };

/**
 * Picks the rows shown on the public search landing pages.
 * Uses the exact same tier assignment and stored engine probabilities as the
 * AI Predictions page — nothing is recalculated or invented here.
 * Only published (tiered) predictions for matches not yet settled are listed.
 */
export function selectSeoPredictions(predictions: AIPrediction[], variant: SeoPageVariant): SeoPredictionItem[] {
  applyPickDiversity(predictions);
  const { tierMap } = assignTiers(predictions);

  const items: SeoPredictionItem[] = [];
  for (const p of predictions) {
    const tier = tierMap.get(p.id);
    if (!tier) continue;
    if (p.result_status === "won" || p.result_status === "lost") continue;

    if (variant === "today") {
      const best = getBestMarketPickWithLabel(p);
      items.push({ prediction: p, tier, label: best.label, pct: best.pct });
      continue;
    }

    const goals = calculateGoalMarketProbs(p);
    const pct = variant === "btts" ? goals.bttsYes : goals.over25;
    if (pct < MIN_PICK_PROBABILITY) continue;
    items.push({ prediction: p, tier, label: variant === "btts" ? "BTTS Yes" : "Over 2.5 Goals", pct });
  }

  return items.sort((a, b) =>
    variant === "today"
      ? TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.pct - a.pct
      : b.pct - a.pct,
  );
}
