import { useState, useCallback } from "react";
import type { Match } from "@/hooks/useFixtures";
import type { MatchAnalysis } from "@/components/match-previews/MatchPreviewAnalysis";
import { supabase } from "@/integrations/supabase/client";

/* ─── Extract real goals data from the rich analysis text ─── */
function extractGoalsFromAnalysis(text: string | null): { homeGoals: number; awayGoals: number; homeConc: number; awayConc: number } {
  if (!text) return { homeGoals: 0, awayGoals: 0, homeConc: 0, awayConc: 0 };
  let homeGoals = 0, awayGoals = 0, homeConc = 0, awayConc = 0;

  // Try "at home: ... avg X/Y"
  const homeAtHome = text.match(/at home[^.]*avg\s*([\d.]+)\/([\d.]+)/i);
  if (homeAtHome) { homeGoals = parseFloat(homeAtHome[1]); homeConc = parseFloat(homeAtHome[2]); }

  // Try "away: ... avg X/Y"
  const awayFromHome = text.match(/away[^.]*avg\s*([\d.]+)\/([\d.]+)/i);
  if (awayFromHome) { awayGoals = parseFloat(awayFromHome[1]); awayConc = parseFloat(awayFromHome[2]); }

  // Fallback: any "avg X/Y" patterns in FORM section
  if (!homeGoals) {
    const formSection = text.match(/FORM.*?(?=⚔️|🏟️|📊|$)/s);
    if (formSection) {
      const avgMatches = formSection[0].match(/avg\s*([\d.]+)\/([\d.]+)/g);
      if (avgMatches) {
        const m1 = avgMatches[0]?.match(/avg\s*([\d.]+)\/([\d.]+)/);
        if (m1) { homeGoals = parseFloat(m1[1]); homeConc = parseFloat(m1[2]); }
        const m2 = avgMatches[1]?.match(/avg\s*([\d.]+)\/([\d.]+)/);
        if (m2) { awayGoals = parseFloat(m2[1]); awayConc = parseFloat(m2[2]); }
      }
    }
  }

  // Fallback: "Avg goals: X scored, Y conceded"
  if (!homeGoals) {
    const scored = text.match(/Avg goals:\s*([\d.]+)\s*scored/gi);
    if (scored && scored.length >= 2) {
      const m1 = scored[0].match(/([\d.]+)\s*scored/i);
      const m2 = scored[1].match(/([\d.]+)\s*scored/i);
      if (m1) homeGoals = parseFloat(m1[1]);
      if (m2) awayGoals = parseFloat(m2[1]);
    }
  }

  // Fallback: "GF X GA Y" pattern
  if (!homeGoals) {
    const gfMatches = text.match(/GF\s*(\d+)\s*GA\s*(\d+)/gi);
    if (gfMatches && gfMatches.length >= 1) {
      const m1 = gfMatches[0].match(/GF\s*(\d+)\s*GA\s*(\d+)/i);
      if (m1) {
        // Estimate per-game from season total (assume ~30 games)
        const gamesEst = 30;
        homeGoals = parseFloat(m1[1]) / gamesEst;
        homeConc = parseFloat(m1[2]) / gamesEst;
      }
      if (gfMatches[1]) {
        const m2 = gfMatches[1].match(/GF\s*(\d+)\s*GA\s*(\d+)/i);
        if (m2) {
          const gamesEst = 30;
          awayGoals = parseFloat(m2[1]) / gamesEst;
          awayConc = parseFloat(m2[2]) / gamesEst;
        }
      }
    }
  }

  return { homeGoals, awayGoals, homeConc, awayConc };
}

/* ─── Extract form string from analysis ─── */
function extractFormFromAnalysis(text: string | null, teamIndex: 0 | 1): string | null {
  if (!text) return null;
  const formMatches = text.match(/([WDL]{5,})/g);
  if (formMatches && formMatches[teamIndex]) return formMatches[teamIndex];
  return null;
}

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

  // Extract real goals data from analysis text when DB fields are null/0
  const extracted = extractGoalsFromAnalysis(row.analysis);
  const homeGoals = (row.last_home_goals && row.last_home_goals > 0) ? row.last_home_goals : extracted.homeGoals;
  const awayGoals = (row.last_away_goals && row.last_away_goals > 0) ? row.last_away_goals : extracted.awayGoals;
  const totalAvg = homeGoals + awayGoals;

  // Extract form for richer description
  const homeForm = extractFormFromAnalysis(row.analysis, 0);
  const awayForm = extractFormFromAnalysis(row.analysis, 1);
  const homeFormWins = homeForm ? (homeForm.match(/W/g) || []).length : null;
  const awayFormWins = awayForm ? (awayForm.match(/W/g) || []).length : null;

  // Determine outcome label
  let outcome: string;
  if (prediction === "1" || prediction === "home") outcome = `${homeTeam} to win`;
  else if (prediction === "2" || prediction === "away") outcome = `${awayTeam} to win`;
  else if (prediction === "x" || prediction === "draw") outcome = "Draw likely";
  else if (prediction.includes("over")) outcome = "Over 2.5 Goals";
  else if (prediction.includes("under")) outcome = "Under 2.5 Goals";
  else if (prediction.includes("btts")) outcome = "Both Teams to Score";
  else outcome = row.prediction || "Analysis pending";

  // Generate clean, match-specific overview using real extracted data
  let overview: string;
  const homeFormDesc = homeFormWins !== null ? ` with ${homeFormWins} wins in their last ${homeForm!.length} matches` : "";
  const awayFormDesc = awayFormWins !== null ? ` (${awayFormWins}/${awayForm!.length} wins recently)` : "";

  if (homeWin >= 60) {
    overview = `${homeTeam} enters this ${match.league} fixture as clear favorites with a ${homeWin}% win probability${homeFormDesc}. Averaging ${homeGoals.toFixed(1)} goals per game at home, they'll look to control proceedings from the start. ${awayTeam}${awayFormDesc}, with just ${awayWin}% away win chance and ${awayGoals.toFixed(1)} goals on the road, will need to be defensively disciplined.`;
  } else if (awayWin >= 55) {
    overview = `${awayTeam} carries impressive form into this ${match.league} clash${awayFormDesc} with ${awayWin}% win probability. Their ${awayGoals.toFixed(1)} goals per game average away suggests they'll pose a real threat. ${homeTeam}${homeFormDesc} at ${homeWin}% will need to capitalize on home advantage.`;
  } else if (drawProb >= 30) {
    overview = `This ${match.league} encounter looks set to be a tight affair with ${drawProb}% draw probability. ${homeTeam} (${homeWin}%${homeFormDesc}) and ${awayTeam} (${awayWin}%${awayFormDesc}) are closely matched, with a combined ${totalAvg.toFixed(1)} goals average suggesting a cagey contest.`;
  } else if (totalAvg >= 3.5) {
    overview = `Goals are expected in this ${match.league} matchup — a combined ${totalAvg.toFixed(1)} goals average points to an entertaining contest. ${homeTeam} contributes ${homeGoals.toFixed(1)} goals at home while ${awayTeam} adds ${awayGoals.toFixed(1)} away. Both defenses may struggle in what could be an open affair.`;
  } else {
    overview = `${homeTeam} hosts ${awayTeam} in this ${match.league} fixture. With ${homeWin}% home win probability, ${awayWin}% away win chance, and an average of ${totalAvg.toFixed(1)} total goals, our AI model has identified key patterns that inform a ${confidence}% confidence prediction.`;
  }

  // Match-specific reasoning using real data
  let reasoning: string;
  if (row.key_factors && row.key_factors.length > 0) {
    reasoning = row.key_factors.join(". ") + ".";
  } else if (prediction === "1" || prediction === "home") {
    reasoning = `${homeTeam}'s ${homeWin}% win probability is backed by ${homeGoals.toFixed(1)} goals per game at home${homeFormDesc}. ${awayTeam} averages ${awayGoals.toFixed(1)} goals away with ${awayWin}% win chance. The ${Math.abs(homeWin - awayWin)} point gap reinforces this at ${confidence}% confidence.`;
  } else if (prediction === "2" || prediction === "away") {
    reasoning = `Despite playing away, ${awayTeam} shows ${awayWin}% win probability with ${awayGoals.toFixed(1)} goals per game${awayFormDesc}. ${homeTeam}'s home advantage is reduced at ${homeWin}%. Our model identifies ${awayTeam} as the value pick at ${confidence}% confidence.`;
  } else if (prediction.includes("over")) {
    reasoning = `Combined goal average of ${totalAvg.toFixed(1)} (${homeTeam}: ${homeGoals.toFixed(1)}, ${awayTeam}: ${awayGoals.toFixed(1)}) strongly supports the over market. Both teams show attacking intent. AI confidence sits at ${confidence}%.`;
  } else if (prediction.includes("under")) {
    reasoning = `Low combined average of ${totalAvg.toFixed(1)} goals (${homeTeam}: ${homeGoals.toFixed(1)}, ${awayTeam}: ${awayGoals.toFixed(1)}) points to a tight defensive contest. Limited firepower supports the under market at ${confidence}% confidence.`;
  } else {
    reasoning = `Our AI analyzed team form, head-to-head records, home/away splits, and goal patterns. With ${homeTeam} at ${homeWin}% and ${awayTeam} at ${awayWin}%, averaging ${totalAvg.toFixed(1)} goals combined, this prediction carries ${confidence}% confidence.`;
  }

  const keyStats = [
    { label: `${homeTeam} Win`, value: `${homeWin}%`, trend: (homeWin >= 50 ? "positive" : "neutral") as "positive" | "neutral" },
    { label: `${awayTeam} Win`, value: `${awayWin}%`, trend: (awayWin >= 50 ? "positive" : "neutral") as "positive" | "neutral" },
    { label: "Draw", value: `${drawProb}%`, trend: "neutral" as const },
    { label: "Risk Level", value: row.risk_level || "Medium", trend: (row.risk_level === "Low" ? "positive" : row.risk_level === "High" ? "negative" : "neutral") as "positive" | "negative" | "neutral" },
    { label: `${homeTeam} Goals Avg`, value: homeGoals.toFixed(1), trend: (homeGoals >= 1.5 ? "positive" : "neutral") as "positive" | "neutral" },
    { label: `${awayTeam} Goals Avg`, value: awayGoals.toFixed(1), trend: (awayGoals >= 1.5 ? "positive" : "neutral") as "positive" | "neutral" },
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
    prediction: { outcome, confidence, reasoning },
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
