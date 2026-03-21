import { useState, useCallback } from "react";
import type { Match } from "@/hooks/useFixtures";
import type { MatchAnalysis } from "@/components/match-previews/MatchPreviewAnalysis";
import { supabase } from "@/integrations/supabase/client";

function buildAnalysisFromPrediction(
  match: Match,
  row: {
    prediction: string | null;
    confidence: number | null;
    analysis: string | null;
    key_factors: string[] | null;
    home_win: number | null;
    draw: number | null;
    away_win: number | null;
    predicted_score: string | null;
    risk_level: string | null;
    last_home_goals: number | null;
    last_away_goals: number | null;
  }
): MatchAnalysis {
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  const confidence = row.confidence ?? 60;
  const prediction = (row.prediction || "").toLowerCase().trim();
  const homeWin = row.home_win ?? 0;
  const awayWin = row.away_win ?? 0;
  const drawProb = row.draw ?? 0;
  const homeGoals = row.last_home_goals ?? 0;
  const awayGoals = row.last_away_goals ?? 0;
  const totalAvg = homeGoals + awayGoals;

  // Determine outcome label
  let outcome: string;
  if (prediction === "1" || prediction === "home") outcome = `${homeTeam} to win`;
  else if (prediction === "2" || prediction === "away") outcome = `${awayTeam} to win`;
  else if (prediction === "x" || prediction === "draw") outcome = "Draw likely";
  else if (prediction.includes("over")) outcome = "Over 2.5 Goals";
  else if (prediction.includes("under")) outcome = "Under 2.5 Goals";
  else if (prediction.includes("btts")) outcome = "Both Teams to Score";
  else outcome = row.prediction || "Analysis pending";

  // Generate clean, short overview — never use raw analysis text
  let overview: string;
  if (homeWin >= 60) {
    overview = `${homeTeam} enters this ${match.league} fixture as clear favorites with a ${homeWin}% win probability. Their home record shows ${homeGoals.toFixed(1)} goals per game average, suggesting they'll control proceedings. ${awayTeam}, with just ${awayWin}% away win chance, will need to be defensively disciplined.`;
  } else if (awayWin >= 55) {
    overview = `${awayTeam} carries impressive away form into this ${match.league} clash with ${awayWin}% win probability. Despite playing away, their ${awayGoals.toFixed(1)} goals average suggests they'll pose a real threat. ${homeTeam} at ${homeWin}% will need to capitalize on home advantage.`;
  } else if (drawProb >= 30) {
    overview = `This ${match.league} encounter looks set to be a tight affair with ${drawProb}% draw probability. ${homeTeam} (${homeWin}%) and ${awayTeam} (${awayWin}%) are closely matched, with a combined ${totalAvg.toFixed(1)} goals average suggesting a cagey contest.`;
  } else if (totalAvg >= 3.5) {
    overview = `Goals are expected in this ${match.league} matchup — a combined ${totalAvg.toFixed(1)} goals average points to an entertaining contest. ${homeTeam} contributes ${homeGoals.toFixed(1)} goals at home while ${awayTeam} adds ${awayGoals.toFixed(1)} away. Both defenses may struggle.`;
  } else {
    overview = `${homeTeam} hosts ${awayTeam} in this ${match.league} fixture. With ${homeWin}% home win probability and an average of ${totalAvg.toFixed(1)} total goals, our AI model has identified key patterns that inform a ${confidence}% confidence prediction.`;
  }

  // Match-specific reasoning
  let reasoning: string;
  if (row.key_factors && row.key_factors.length > 0) {
    reasoning = row.key_factors.join(". ") + ".";
  } else if (prediction === "1" || prediction === "home") {
    reasoning = `${homeTeam}'s ${homeWin}% win probability stems from strong home form with ${homeGoals.toFixed(1)} goals average. ${awayTeam}'s ${awayGoals.toFixed(1)} away goals average and ${awayWin}% win chance suggest they'll struggle. The ${Math.abs(homeWin - awayWin)} percentage point gap between the sides reinforces this prediction at ${confidence}% confidence.`;
  } else if (prediction === "2" || prediction === "away") {
    reasoning = `Despite playing away, ${awayTeam} shows ${awayWin}% win probability with ${awayGoals.toFixed(1)} goals per game. ${homeTeam}'s home advantage is diminished at just ${homeWin}%. Our model identifies ${awayTeam} as the value pick at ${confidence}% confidence.`;
  } else if (prediction.includes("over")) {
    reasoning = `Combined goal average of ${totalAvg.toFixed(1)} (${homeTeam}: ${homeGoals.toFixed(1)}, ${awayTeam}: ${awayGoals.toFixed(1)}) strongly supports the over market. Both teams show attacking intent and defensive vulnerabilities. AI confidence sits at ${confidence}%.`;
  } else if (prediction.includes("under")) {
    reasoning = `Low combined average of ${totalAvg.toFixed(1)} goals (${homeTeam}: ${homeGoals.toFixed(1)}, ${awayTeam}: ${awayGoals.toFixed(1)}) points to a tight defensive contest. Limited firepower from both sides supports the under market at ${confidence}% confidence.`;
  } else {
    reasoning = `Our AI engine analyzed team form, head-to-head records, home/away splits, and goal patterns. With ${homeTeam} at ${homeWin}% and ${awayTeam} at ${awayWin}%, this prediction carries ${confidence}% confidence.`;
  }

  const keyStats = [
    {
      label: `${homeTeam} Win`,
      value: `${homeWin}%`,
      trend: (homeWin >= 50 ? "positive" : "neutral") as "positive" | "neutral",
    },
    {
      label: `${awayTeam} Win`,
      value: `${awayWin}%`,
      trend: (awayWin >= 50 ? "positive" : "neutral") as "positive" | "neutral",
    },
    {
      label: "Draw",
      value: `${drawProb}%`,
      trend: "neutral" as const,
    },
    {
      label: "Risk Level",
      value: row.risk_level || "Medium",
      trend: (row.risk_level === "Low" ? "positive" : row.risk_level === "High" ? "negative" : "neutral") as "positive" | "negative" | "neutral",
    },
    {
      label: `${homeTeam} Goals Avg`,
      value: homeGoals.toFixed(1),
      trend: (homeGoals >= 1.5 ? "positive" : "neutral") as "positive" | "neutral",
    },
    {
      label: `${awayTeam} Goals Avg`,
      value: awayGoals.toFixed(1),
      trend: (awayGoals >= 1.5 ? "positive" : "neutral") as "positive" | "neutral",
    },
  ];

  const insights =
    row.key_factors && row.key_factors.length > 0
      ? row.key_factors
      : [
          `AI model confidence: ${confidence}%`,
          `Home win probability: ${homeWin}%`,
          `Away win probability: ${awayWin}%`,
          `Predicted risk level: ${row.risk_level || "Medium"}`,
        ];

  return {
    overview,
    keyStats,
    insights,
    prediction: {
      outcome,
      confidence,
      reasoning,
    },
  };
}

export function useMatchPreviewGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [generatedMatch, setGeneratedMatch] = useState<Match | null>(null);

  const generate = useCallback(async (match: Match) => {
    setIsGenerating(true);
    setAnalysis(null);
    setGeneratedMatch(match);

    try {
      const { data, error } = await supabase
        .from("ai_predictions")
        .select("prediction, confidence, analysis, key_factors, home_win, draw, away_win, predicted_score, risk_level, last_home_goals, last_away_goals")
        .eq("match_id", match.id)
        .maybeSingle();

      if (error) console.error("Error fetching AI prediction:", error);

      if (data) {
        const result = buildAnalysisFromPrediction(match, data);
        setAnalysis(result);
        return result;
      }

      const { data: fallbackData } = await supabase
        .from("ai_predictions")
        .select("prediction, confidence, analysis, key_factors, home_win, draw, away_win, predicted_score, risk_level, last_home_goals, last_away_goals")
        .eq("home_team", match.homeTeam)
        .eq("away_team", match.awayTeam)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackData) {
        const result = buildAnalysisFromPrediction(match, fallbackData);
        setAnalysis(result);
        return result;
      }

      const noDataAnalysis: MatchAnalysis = {
        overview: `No AI prediction data available yet for ${match.homeTeam} vs ${match.awayTeam}. Check back closer to match time.`,
        keyStats: [],
        insights: ["AI prediction data will be available when the model processes this match."],
        prediction: {
          outcome: "Pending",
          confidence: 0,
          reasoning: "This match has not yet been analyzed by our AI engine.",
        },
      };
      setAnalysis(noDataAnalysis);
      return noDataAnalysis;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAnalysis(null);
    setGeneratedMatch(null);
  }, []);

  return { isGenerating, analysis, generatedMatch, generate, reset };
}
