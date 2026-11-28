import { describe, expect, it } from "vitest";
import { isLegacyTierPrediction } from "../../supabase/functions/_shared/legacyTierGuard";

describe("legacy tier assignment guard", () => {
  it("never reassigns a V7 prediction in the reported 78–84% range", () => {
    expect(isLegacyTierPrediction({ engine_version: "v7", confidence: 82 })).toBe(false);
  });

  it("never reassigns high-confidence V7 predictions either", () => {
    expect(isLegacyTierPrediction({ engine_version: "v7", confidence: 95 })).toBe(false);
  });

  it("keeps legacy rows without an engine version eligible", () => {
    expect(isLegacyTierPrediction({ engine_version: null })).toBe(true);
    expect(isLegacyTierPrediction({})).toBe(true);
  });
});
