// Legacy generation and tier assignment must never rewrite V7 predictions.
// NULL engine_version belongs to legacy rows and remains eligible.
export const LEGACY_TIER_ENGINE_FILTER = "engine_version.is.null,engine_version.neq.v7";

export function isLegacyTierPrediction(row: { engine_version?: string | null; confidence?: number | null }): boolean {
  return row.engine_version !== "v7";
}
