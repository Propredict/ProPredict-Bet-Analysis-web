import { describe, expect, it } from "vitest";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { deriveMarkets } from "@/components/ai-predictions/utils/marketDerivation";

function predictionWithProbabilities(home: number, draw: number, away: number): AIPrediction {
  return {
    id: "combo-test",
    match_id: "fixture-1",
    league: "Test League",
    home_team: "Home",
    away_team: "Away",
    match_date: "2026-09-24",
    match_time: "20:00",
    prediction: "1",
    predicted_score: "1-2",
    confidence: 73,
    home_win: home,
    draw,
    away_win: away,
    risk_level: "low",
    analysis: null,
    key_factors: null,
    is_premium: false,
    is_live: false,
    is_locked: false,
    result_status: "pending",
    xg_home: 0.9,
    xg_away: 2.1,
  };
}

describe("AI combo direction", () => {
  it("uses the normalized away favourite even when the stored headline is stale", () => {
    const markets = deriveMarkets(predictionWithProbabilities(10, 17, 73));

    expect(markets.combos).toHaveLength(2);
    expect(markets.combos.every((combo) => combo.label.startsWith("2 &"))).toBe(true);
  });

  it("uses the normalized home favourite for every recommended combo", () => {
    const markets = deriveMarkets(predictionWithProbabilities(71, 18, 11));

    expect(markets.combos).toHaveLength(2);
    expect(markets.combos.every((combo) => combo.label.startsWith("1 &"))).toBe(true);
  });
});