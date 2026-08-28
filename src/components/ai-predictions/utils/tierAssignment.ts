import { getBestEligibleProbability, getBestMarketProbability, getTierFromConfidence } from "./marketDerivation";
import { leagueTier } from "./topPicksRanking";

export type Tier = "free" | "pro" | "premium";

/**
 * Single source of truth for AI prediction tier assignment.
 *
 * Used by both the AI Predictions page and the dashboard so a match
 * classified as Pro on /ai-predictions is also Pro on the dashboard.
 *
 * A prediction is eligible when its concrete displayed market pick is at
 * least 65%. Tier caps cascade
 * Premium → Pro → Free, strongest verified predictions first.
 */
export function assignTiers(predictions: Array<any>): {
  tierMap: Map<string, Tier>;
  safeFallbackIds: Set<string>;
} {
  const map = new Map<string, Tier>();
  const fallbackIds = new Set<string>();

  const scored = predictions.map((p) => {
    // The same concrete market and percentage shown in Main determines tier.
    const verifiedStrength = getBestEligibleProbability(p);
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
  const PRO_CAP = 10;
  // Free shows up to 10 verified picks (overflow + reserved weakest qualified).
  const FREE_CAP = 10;
  // Free is never empty: reserve the weakest qualified picks for Free when
  // there are not enough picks to overflow out of Premium/Pro.
  const FREE_MIN = 5;
  let premiumCount = 0;
  let proCount = 0;
  let freeCount = 0;

  const qualified = sorted.filter((s) => s.strength >= 65);
  const reservedFree = new Set<string>();
  if (qualified.length > FREE_MIN && qualified.length <= PREMIUM_CAP + PRO_CAP) {
    const reserveSize = Math.min(FREE_MIN, Math.max(1, Math.floor(qualified.length / 3)));
    for (const s of qualified.slice(-reserveSize)) reservedFree.add(s.id);
  }

  for (const s of sorted) {
    if (reservedFree.has(s.id)) {
      if (freeCount < FREE_CAP) {
        freeCount++;
        map.set(s.id, "free");
      }
      continue;
    }

    let tier: Tier = s.baseTier;
    // Quality rule: no tier contains a card without a concrete verified pick.
    if (s.strength < 65) continue;

    // Hard cap: Pro never exceeds PRO_CAP, overflow cascades to Free.
    const proHasRoom = proCount < PRO_CAP;

    if (tier === "premium") {
      if (premiumCount < PREMIUM_CAP) premiumCount++;
      else if (proHasRoom) { tier = "pro"; proCount++; }
      else if (freeCount < FREE_CAP) { tier = "free"; freeCount++; }
      else continue;
    } else if (tier === "pro") {
      if (proHasRoom) proCount++;
      else if (freeCount < FREE_CAP) { tier = "free"; freeCount++; }
      else continue;
    } else {
      // Remaining verified picks (>=65%) fill Free directly.
      if (freeCount < FREE_CAP) { tier = "free"; freeCount++; }
      else continue;
    }

    map.set(s.id, tier);
  }

  return { tierMap: map, safeFallbackIds: fallbackIds };
}