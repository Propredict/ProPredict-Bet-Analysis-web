import { describe, expect, it } from "vitest";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import {
  calculateGoalMarketProbs,
  calculateTopCorrectScores,
  calculateComboProbability,
} from "@/components/ai-predictions/utils/marketDerivation";

function predictionWithXg(homeXg: number, awayXg: number): AIPrediction {
  return {
    id: "goal-consistency-test",
    match_id: "fixture-1",
    league: "Test League",
    home_team: "Home",
    away_team: "Away",
    match_date: "2026-09-24",
    match_time: "20:00",
    prediction: "1",
    predicted_score: "3-1",
    confidence: 75,
    home_win: 70,
    draw: 18,
    away_win: 12,
    risk_level: "low",
    analysis: null,
    key_factors: null,
    is_premium: false,
    is_live: false,
    is_locked: false,
    result_status: "pending",
    xg_home: homeXg,
    xg_away: awayXg,
  };
}

describe("goal and correct-score consistency", () => {
  it("keeps a 2-1 profile near its calculated Over 2.5 probability", () => {
    const prediction = predictionWithXg(2.2, 1.2);
    const goals = calculateGoalMarketProbs(prediction);
    const scores = calculateTopCorrectScores(prediction);

    expect(scores[0]?.score).toBe("2-1");
    expect(goals.over25).toBeGreaterThanOrEqual(65);
    expect(goals.over25).toBeLessThanOrEqual(69);
  });

  it("raises Over 2.5 above 80% only when the shared xG supports a 3-1 profile", () => {
    const prediction = predictionWithXg(3.2, 1.2);
    const goals = calculateGoalMarketProbs(prediction);
    const scores = calculateTopCorrectScores(prediction);

    expect(scores[0]?.score).toBe("3-1");
    expect(goals.over25).toBeGreaterThanOrEqual(80);
  });

  it("calculates combos as joint outcomes and never exceeds the Main result", () => {
    const prediction = { ...predictionWithXg(3.2, 1.2), home_win: 85, draw: 10, away_win: 5 };
    const goals = calculateGoalMarketProbs(prediction);
    const over15 = calculateComboProbability(prediction, "1 & Over 1.5");
    const over25 = calculateComboProbability(prediction, "1 & Over 2.5");

    expect(over15).not.toBeNull();
    expect(over25).not.toBeNull();
    expect(over15).toBeLessThanOrEqual(85);
    expect(over25).toBeLessThanOrEqual(over15 ?? 0);
    expect(over25).toBeLessThanOrEqual(goals.over25 + 1);
    expect(goals.bttsYes + goals.bttsNo).toBe(100);
    expect(calculateComboProbability(prediction, "BTTS Yes + Over 2.5"))
      .toBeLessThanOrEqual(Math.min(goals.bttsYes, goals.over25) + 1);
    expect(calculateComboProbability(prediction, "Unknown + Over 2.5")).toBeNull();
  });
});