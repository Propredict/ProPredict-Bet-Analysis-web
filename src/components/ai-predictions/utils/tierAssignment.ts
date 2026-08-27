import { getBestMarketProbability, getTierFromConfidence } from "./marketDerivation";
import { leagueTier } from "./topPicksRanking";

export type Tier = "free" | "pro" | "premium";

/**
 * Single source of truth for AI prediction tier assignment.
 *
 * Used by both the AI Predictions page and the dashboard so a match
 * classified as Pro on /ai-predictions is also Pro on the dashboard.
 *
 * Tier = strongest market probability (max of 1X2 confidence and
 * best market — BTTS/Over/Under). Caps cascade Premium → Pro → Free.
 */
export function assignTiers(predictions: Array<any>): {
  tierMap: Map<string, Tier>;
  safeFallbackIds: Set<string>;
} {
  const map = new Map<string, Tier>();
  const fallbackIds = new Set<string>();

  const scored = predictions.map((p) => {
    const bestPickProb = getBestMarketProbability(p);
    const effectiveStrength = Math.max(p.confidence ?? 0, bestPickProb);
    return {
      id: p.id!,
      strength: effectiveStrength,
      baseTier: getTierFromConfidence(effectiveStrength) as Tier,
      prediction: p,
    };
  });

  const sorted = [...scored].sort((a, b) => {
    if (b.strength !== a.strength) return b.strength - a.strength;
    return leagueTier(a.prediction.league) - leagueTier(b.prediction.league);
  });

  const PREMIUM_CAP = 10;
  const PRO_CAP = 20;
  const FREE_CAP = 15;
  let premiumCount = 0;
  let proCount = 0;
  let freeCount = 0;

  for (const s of sorted) {
    let tier: Tier = s.baseTier;
    // Quality rule: Free NEVER contains sub-65% picks. Free is filled only with
    // overflow from Premium/Pro (i.e. verified picks with strength >= 65).
    if (tier === "premium") {
      if (premiumCount < PREMIUM_CAP) premiumCount++;
      else if (proCount < PRO_CAP) { tier = "pro"; proCount++; }
      else if (freeCount < FREE_CAP) { tier = "free"; freeCount++; }
      else continue;
    } else if (tier === "pro") {
      if (proCount < PRO_CAP) proCount++;
      else if (freeCount < FREE_CAP) { tier = "free"; freeCount++; }
      else continue;
    } else {
      // strength < 65 → not shown at all
      continue;
    }
    map.set(s.id, tier);
  }

  // Fallback: if Free ended up empty (few matches today), move the weakest
  // qualified Pro picks (still >= 65%) down to Free so users always see picks.
  if (freeCount === 0) {
    const proCandidates = sorted
      .filter((s) => map.get(s.id) === "pro")
      .filter((s) => (s.prediction as any).variance_stable !== false)
      .sort((a, b) => a.strength - b.strength)
      .slice(0, Math.min(3, Math.max(1, Math.floor(proCount / 3))));
    for (const c of proCandidates) {
      map.set(c.id, "free");
      fallbackIds.add(c.id);
      proCount--;
      freeCount++;
    }
  }

  return { tierMap: map, safeFallbackIds: fallbackIds };
}