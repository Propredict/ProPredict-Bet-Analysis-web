/**
 * Bucket combined ticket odds into a friendly range label.
 * Hides the exact multiplier and shows a tier indicator instead:
 *   ≥10 → ">10"
 *   ≥5  → ">5"
 *   ≥3  → ">3"
 *   else → ">2"
 */
export function formatCombinedOdds(total: number | null | undefined): string {
  const n = Number(total ?? 0);
  if (!Number.isFinite(n) || n <= 1) return ">2";
  if (n >= 10) return ">10";
  if (n >= 5) return ">5";
  if (n >= 3) return ">3";
  return ">2";
}
