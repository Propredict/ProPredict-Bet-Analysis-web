import { describe, expect, it } from "vitest";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { selectSeoPredictions } from "@/lib/seoPredictionPages";

function v7(id: string, raw: Record<string, number>, extra: Partial<AIPrediction> = {}): AIPrediction {
  return {
    id,
    match_id: id,
    league: "Test League",
    home_team: `Home ${id}`,
    away_team: `Away ${id}`,
    match_date: "2026-10-30",
    match_time: "20:00",
    prediction: null,
    predicted_score: null,
    confidence: 70,
    home_win: 40,
    draw: 30,
    away_win: 30,
    risk_level: "low",
    analysis: null,
    key_factors: null,
    is_premium: false,
    is_live: false,
    is_locked: false,
    result_status: "pending",
    xg_home: 1.5,
    xg_away: 1.3,
    engine_version: "v7",
    market_probs: { raw },
    ...extra,
  };
}

const rows = [
  v7("a", { "BTTS Yes": 72, "BTTS No": 28, "Over 2.5": 66, "Under 2.5": 34 }),
  v7("b", { "BTTS Yes": 64, "BTTS No": 36, "Over 2.5": 70, "Under 2.5": 30 }),
  v7("c", { "BTTS Yes": 30, "BTTS No": 70, "Over 2.5": 25, "Under 2.5": 75 }),
  v7("d", { "BTTS Yes": 80, "BTTS No": 20, "Over 2.5": 78, "Under 2.5": 22 }, { result_status: "won" }),
];

describe("search landing pages", () => {
  it("BTTS page lists only matches with BTTS Yes of at least 65%", () => {
    const ids = selectSeoPredictions(rows, "btts").map((i) => i.prediction.id);
    expect(ids).toEqual(["a"]);
  });

  it("Over 2.5 page lists only matches with Over 2.5 of at least 65%, strongest first", () => {
    const items = selectSeoPredictions(rows, "over25");
    expect(items.map((i) => i.prediction.id)).toEqual(["b", "a"]);
    expect(items.map((i) => i.pct)).toEqual([70, 66]);
  });

  it("never lists matches that are already settled", () => {
    const all = [...selectSeoPredictions(rows, "today"), ...selectSeoPredictions(rows, "btts")];
    expect(all.some((i) => i.prediction.id === "d")).toBe(false);
  });

  it("shows the stored engine probability, not a recalculated one", () => {
    const a = selectSeoPredictions(rows, "btts").find((i) => i.prediction.id === "a");
    expect(a?.pct).toBe(72);
  });
});
