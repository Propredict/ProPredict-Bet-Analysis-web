import { getBestMarketProbability, getTierFromConfidence } from "./marketDerivation";
import { leagueTier } from "./topPicksRanking";

export type Tier = "free" | "pro" | "premium";

/**
 * Single source of truth for AI prediction tier assignment.
 *
 * Used by both the AI Predictions page and the dashboard so a match
 * classified as Pro on /ai-predictions is also Pro on the dashboard.
 *
 * A prediction is eligible only when both the AI confidence and its concrete
 * displayed market pick are at least 65%. Tier caps cascade
 * Premium → Pro → Free, strongest verified predictions first.
 */
export function assignTiers(predictions: Array<any>): {
  tierMap: Map<string, Tier>;
  safeFallbackIds: Set<string>;
} {
  const map = new Map<string, Tier>();
  const fallbackIds = new Set<string>();

  const scored = predictions.map((p) => {
    const bestPickProb = getBestMarketProbability(p);
    const aiConfidence = p.confidence ?? 0;
    // The weaker of model confidence and the actual displayed pick determines
    // quality. This prevents a 90% model row with a 41% concrete pick from
    // becoming an empty "AI Insight" card in Premium/Pro/Free.
    const verifiedStrength = Math.min(aiConfidence, bestPickProb);
    const baseTier = getTierFromConfidence(verifiedStrength) as Tier;
    return {
      id: p.id!,
      strength: verifiedStrength,
      baseTier,
      prediction: p,
    };
  });


  const sorted = [...scored].sort((a, b) => {
    if (b.strength !== a.strength) return b.strength - a.strength;
    return leagueTier(a.prediction.league) - leagueTier(b.prediction.league);
  });

  const PREMIUM_CAP = 10;
  const PRO_CAP = 15;
  // Free shows only the 10 strongest remaining verified overflow picks.
  const FREE_CAP = 10;
  let premiumCount = 0;
  let proCount = 0;
  let freeCount = 0;

  for (const s of sorted) {
    let tier: Tier = s.baseTier;
    // Quality rule: no tier contains a card without a concrete verified pick.
    if (s.strength < 65) continue;

    if (tier === "premium") {
      if (premiumCount < PREMIUM_CAP) premiumCount++;
      else if (proCount < PRO_CAP) { tier = "pro"; proCount++; }
      else if (freeCount < FREE_CAP) { tier = "free"; freeCount++; }
      else continue;
    } else if (tier === "pro") {
      if (proCount < PRO_CAP) proCount++;
      else if (freeCount < FREE_CAP) { tier = "free"; freeCount++; }
      else continue;
    } else continue;
    map.set(s.id, tier);
  }

  return { tierMap: map, safeFallbackIds: fallbackIds };
}