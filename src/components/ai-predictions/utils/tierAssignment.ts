import { getBestEligibleProbability } from "./marketDerivation";
import { leagueTier } from "./topPicksRanking";

export type Tier = "free" | "pro" | "premium";

const TOP_PRIORITY_RE = /nations league|euro championship|euro qualification|european championship/i;

/**
 * Single source of truth for AI prediction tier assignment (page + dashboard).
 *
 * - Free: the 3 strongest picks of the day (showcase — Premium users see these too).
 * - Premium: next strongest, up to 15.
 * - Pro: the rest, up to 10.
 * Order everywhere: Nations League / Euro first, then top leagues, then the rest.
 * Only concrete picks ≥65% are eligible.
 */
export const TIER_CAPS = { free: 3, premium: 15, pro: 10 };

export function assignTiers(predictions: Array<any>): {
  tierMap: Map<string, Tier>;
  safeFallbackIds: Set<string>;
} {
  const map = new Map<string, Tier>();

  const qualified = predictions
    .map((p) => ({ id: p.id!, strength: getBestEligibleProbability(p), prediction: p }))
    .filter((s) => s.strength >= 65);

  const prio = (s: (typeof qualified)[0]) => (TOP_PRIORITY_RE.test(s.prediction.league ?? "") ? 0 : 1);
  const tier3 = (s: (typeof qualified)[0]) => (leagueTier(s.prediction.league) >= 3 ? 1 : 0);

  const sorted = [...qualified].sort(
    (a, b) =>
      prio(a) - prio(b) ||
      tier3(a) - tier3(b) ||
      b.strength - a.strength ||
      leagueTier(a.prediction.league) - leagueTier(b.prediction.league),
  );

  let free = 0, premium = 0, pro = 0;
  for (const s of sorted) {
    if (free < TIER_CAPS.free) { map.set(s.id, "free"); free++; }
    else if (premium < TIER_CAPS.premium) { map.set(s.id, "premium"); premium++; }
    else if (pro < TIER_CAPS.pro) { map.set(s.id, "pro"); pro++; }
    else break;
  }

  return { tierMap: map, safeFallbackIds: new Set<string>() };
}
