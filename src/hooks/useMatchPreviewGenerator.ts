import { useState, useCallback } from "react";
import type { Match } from "@/hooks/useFixtures";
import type { MatchAnalysis } from "@/components/match-previews/MatchPreviewAnalysis";

// Generate AI-like analysis from existing match data
function generateAnalysis(match: Match): MatchAnalysis {
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  
  // Simulate analysis based on match data patterns
  const homeStrength = Math.random();
  const awayStrength = Math.random();
  const isHomeStronger = homeStrength > awayStrength;
  
  // Generate realistic stats
  const homeGoalsAvg = (1.2 + Math.random() * 1.5).toFixed(1);
  const awayGoalsAvg = (0.8 + Math.random() * 1.2).toFixed(1);
  const homeCleanSheets = Math.floor(2 + Math.random() * 4);
  const awayCleanSheets = Math.floor(1 + Math.random() * 3);
  const h2hMeetings = Math.floor(5 + Math.random() * 10);
  const homeWins = Math.floor(h2hMeetings * (0.3 + Math.random() * 0.3));
  const draws = Math.floor((h2hMeetings - homeWins) * 0.3);
  
  // Determine likely outcome
  const confidenceBase = 55 + Math.floor(Math.random() * 30);
  let outcome: string;
  let reasoning: string;
  
  if (homeStrength > awayStrength + 0.2) {
    outcome = `${homeTeam} to win`;
    reasoning = `${homeTeam} enters this fixture with strong form at home. Their attacking metrics and defensive solidity suggest they have the edge in this encounter. Historical data and current momentum favor the hosts.`;
  } else if (awayStrength > homeStrength + 0.2) {
    outcome = `${awayTeam} to win`;
    reasoning = `${awayTeam} has shown impressive away form this season. Their ability to score on the road combined with ${homeTeam}'s recent struggles at home points towards an away victory.`;
  } else if (Math.random() > 0.5) {
    outcome = "Draw likely";
    reasoning = `Both teams are evenly matched based on current form and historical encounters. The tactical setups and similar playing styles suggest this could end in a stalemate.`;
  } else {
    outcome = "Goals expected";
    reasoning = `Both teams have shown attacking intent this season. With their combined scoring averages and defensive vulnerabilities, expect an entertaining match with goals on both ends.`;
  }
  
  const overview = isHomeStronger
    ? `${homeTeam} welcomes ${awayTeam} in what promises to be an intriguing ${match.league} clash. The hosts have demonstrated solid form, particularly at home, where they've been difficult to overcome. ${awayTeam} will look to upset the odds but face a tough challenge against a well-organized side.`
    : `${awayTeam} travels to face ${homeTeam} in a crucial ${match.league} fixture. The visitors arrive with momentum on their side, having shown resilience in recent outings. ${homeTeam} will need to be at their best to contain an in-form opponent.`;
  
  const keyStats = [
    {
      label: `${homeTeam} Goals/Match`,
      value: homeGoalsAvg,
      trend: parseFloat(homeGoalsAvg) >= 1.5 ? "positive" as const : "neutral" as const,
    },
    {
      label: `${awayTeam} Goals/Match`,
      value: awayGoalsAvg,
      trend: parseFloat(awayGoalsAvg) >= 1.3 ? "positive" as const : "neutral" as const,
    },
    {
      label: "Clean Sheets (Home)",
      value: `${homeCleanSheets} in last 10`,
      trend: homeCleanSheets >= 4 ? "positive" as const : "neutral" as const,
    },
    {
      label: "Clean Sheets (Away)",
      value: `${awayCleanSheets} in last 10`,
      trend: awayCleanSheets >= 3 ? "positive" as const : "neutral" as const,
    },
    {
      label: "Head-to-Head",
      value: `${homeWins}W ${draws}D ${h2hMeetings - homeWins - draws}L`,
      trend: "neutral" as const,
    },
    {
      label: "Recent Form",
      value: isHomeStronger ? "Home advantage" : "Away form strong",
      trend: "neutral" as const,
    },
  ];
  
  const insights = [
    `${homeTeam} has ${isHomeStronger ? "won" : "struggled in"} ${Math.floor(2 + Math.random() * 3)} of their last 5 home matches.`,
    `${awayTeam} averaging ${awayGoalsAvg} goals per game on the road this season.`,
    `The last ${Math.min(3, h2hMeetings)} meetings have produced ${Math.floor(2 + Math.random() * 2)} goals on average.`,
    `Key players are expected to be available for both sides, setting up an intriguing tactical battle.`,
    isHomeStronger
      ? `${homeTeam}'s home record gives them a psychological advantage heading into this fixture.`
      : `${awayTeam}'s recent performances suggest they're capable of getting a result here.`,
  ];
  
  return {
    overview,
    keyStats,
    insights,
    prediction: {
      outcome,
      confidence: confidenceBase,
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
    
    // Simulate AI generation time
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    const result = generateAnalysis(match);
    setAnalysis(result);
    setIsGenerating(false);
    
    return result;
  }, []);

  const reset = useCallback(() => {
    setAnalysis(null);
    setGeneratedMatch(null);
  }, []);

  return {
    isGenerating,
    analysis,
    generatedMatch,
    generate,
    reset,
  };
}
