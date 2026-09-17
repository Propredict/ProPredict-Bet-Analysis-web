type MatchWithOdds = { odds: number | null | undefined };

/** Calculates the combined ticket odds by multiplying every match odd. */
export function calculateCombinedOdds(
  matches: MatchWithOdds[] | null | undefined,
  fallback = 0,
): number {
  if (!matches?.length) return fallback;

  const odds = matches.map((match) => Number(match.odds));
  if (odds.some((odd) => !Number.isFinite(odd) || odd <= 0)) return fallback;

  return odds.reduce((total, odd) => total * odd, 1);
}

/** Displays the exact combined odds to two decimal places. */
export function formatCombinedOdds(total: number | null | undefined): string {
  const n = Number(total ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "0.00";
  return n.toFixed(2);
}
