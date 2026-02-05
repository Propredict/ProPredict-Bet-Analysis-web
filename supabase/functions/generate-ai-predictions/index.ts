 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const API_FOOTBALL_URL = "https://v3.football.api-sports.io";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
   "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
 };
 
 // ============ PREMIUM TIER CRITERIA ============
 const PREMIUM_MIN_CONFIDENCE = 85;
 const PREMIUM_MAX_DRAWS = 1;
 const PREMIUM_MAX_COUNT = 5;
 const PREMIUM_MIN_COUNT = 3;
 const PREMIUM_ALLOWED_RISK = ["low", "medium"];
 
 // ============ WEIGHTING CONSTANTS ============
 const WEIGHT_FORM = 0.40;         // 40% - Recent form (last 3 matches)
 const WEIGHT_QUALITY = 0.25;      // 25% - Team quality
 const WEIGHT_SQUAD = 0.15;        // 15% - Squad strength / injuries
 const WEIGHT_HOME = 0.10;         // 10% - Home advantage (MAX)
 const WEIGHT_H2H = 0.10;          // 10% - Head-to-Head history
 
 interface TeamStats {
   played: number;
   wins: number;
   draws: number;
   losses: number;
   goalsFor: number;
   goalsAgainst: number;
   form: string; // e.g., "WWDLW"
 }
 
 interface H2HMatch {
   homeTeamId: number;
   awayTeamId: number;
   homeGoals: number;
   awayGoals: number;
 }
 
 interface FormMatch {
   result: "W" | "D" | "L";
   goalsFor: number;
   goalsAgainst: number;
   isHome: boolean;
 }
 
 interface PredictionResult {
   prediction: string;
   predicted_score: string;
   confidence: number;
   home_win: number;
   draw: number;
   away_win: number;
   risk_level: "low" | "medium" | "high";
   analysis: string;
 }
 
 /**
  * Fetch team's last N matches form
  */
 async function fetchTeamForm(teamId: number, apiKey: string, count: number = 3): Promise<FormMatch[]> {
   try {
     const response = await fetch(
       `${API_FOOTBALL_URL}/fixtures?team=${teamId}&last=${count}&status=FT-AET-PEN`,
       { headers: { "x-apisports-key": apiKey } }
     );
     
     if (!response.ok) return [];
     
     const data = await response.json();
     const matches = data.response || [];
     
     return matches.map((m: any) => {
       const isHome = m.teams.home.id === teamId;
       const goalsFor = isHome ? m.goals.home : m.goals.away;
       const goalsAgainst = isHome ? m.goals.away : m.goals.home;
       const won = isHome ? m.teams.home.winner : m.teams.away.winner;
       
       let result: "W" | "D" | "L" = "D";
       if (won === true) result = "W";
       else if (won === false) result = "L";
       
       return { result, goalsFor, goalsAgainst, isHome };
     });
   } catch (e) {
     console.error("Error fetching team form:", e);
     return [];
   }
 }
 
 /**
  * Fetch head-to-head matches between two teams
  */
 async function fetchH2H(homeTeamId: number, awayTeamId: number, apiKey: string, count: number = 3): Promise<H2HMatch[]> {
   try {
     const response = await fetch(
       `${API_FOOTBALL_URL}/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=${count}`,
       { headers: { "x-apisports-key": apiKey } }
     );
     
     if (!response.ok) return [];
     
     const data = await response.json();
     const matches = data.response || [];
     
     return matches.map((m: any) => ({
       homeTeamId: m.teams.home.id,
       awayTeamId: m.teams.away.id,
       homeGoals: m.goals.home ?? 0,
       awayGoals: m.goals.away ?? 0,
     }));
   } catch (e) {
     console.error("Error fetching H2H:", e);
     return [];
   }
 }
 
 /**
  * Fetch team statistics for current season
  */
 async function fetchTeamStats(teamId: number, leagueId: number, season: number, apiKey: string): Promise<TeamStats | null> {
   try {
     const response = await fetch(
       `${API_FOOTBALL_URL}/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`,
       { headers: { "x-apisports-key": apiKey } }
     );
     
     if (!response.ok) return null;
     
     const data = await response.json();
     const stats = data.response;
     
     if (!stats) return null;
     
     return {
       played: stats.fixtures?.played?.total ?? 0,
       wins: stats.fixtures?.wins?.total ?? 0,
       draws: stats.fixtures?.draws?.total ?? 0,
       losses: stats.fixtures?.loses?.total ?? 0,
       goalsFor: stats.goals?.for?.total?.total ?? 0,
       goalsAgainst: stats.goals?.against?.total?.total ?? 0,
       form: stats.form ?? "",
     };
   } catch (e) {
     console.error("Error fetching team stats:", e);
     return null;
   }
 }
 
 /**
  * Calculate form score (0-100) from last 3 matches
  * W = 33.3 points, D = 16.7 points, L = 0 points
  */
 function calculateFormScore(form: FormMatch[]): number {
   if (form.length === 0) return 50; // Neutral if no data
   
   let score = 0;
   const perMatch = 100 / 3;
   
   for (const match of form.slice(0, 3)) {
     if (match.result === "W") score += perMatch;
     else if (match.result === "D") score += perMatch / 2;
     // L adds 0
   }
   
   return Math.min(100, score);
 }
 
 /**
  * Calculate goal scoring rate from last 3 matches
  */
 function calculateGoalRate(form: FormMatch[]): { scored: number; conceded: number } {
   if (form.length === 0) return { scored: 1.0, conceded: 1.0 };
   
   let scored = 0;
   let conceded = 0;
   
   for (const match of form.slice(0, 3)) {
     scored += match.goalsFor;
     conceded += match.goalsAgainst;
   }
   
   return {
     scored: scored / form.length,
     conceded: conceded / form.length,
   };
 }
 
 /**
  * Calculate team quality score (0-100) from season stats
  */
 function calculateQualityScore(stats: TeamStats | null): number {
   if (!stats || stats.played === 0) return 50; // Neutral if no data
   
   const winRate = stats.wins / stats.played;
   const drawRate = stats.draws / stats.played;
   const goalDiff = (stats.goalsFor - stats.goalsAgainst) / stats.played;
   
   // Win rate contributes 60%, goal difference 40%
   const winScore = winRate * 100;
   const gdScore = Math.min(100, Math.max(0, 50 + goalDiff * 10));
   
   return winScore * 0.6 + gdScore * 0.4;
 }
 
 /**
  * Calculate H2H score from perspective of team A vs team B
  * Returns 0-100 where 50 = neutral
  */
 function calculateH2HScore(h2h: H2HMatch[], teamAId: number, teamBId: number): number {
   if (h2h.length === 0) return 50; // Neutral if no H2H data
   
   let teamAWins = 0;
   let teamBWins = 0;
   let draws = 0;
   
   for (const match of h2h.slice(0, 3)) {
     const isTeamAHome = match.homeTeamId === teamAId;
     const teamAGoals = isTeamAHome ? match.homeGoals : match.awayGoals;
     const teamBGoals = isTeamAHome ? match.awayGoals : match.homeGoals;
     
     if (teamAGoals > teamBGoals) teamAWins++;
     else if (teamBGoals > teamAGoals) teamBWins++;
     else draws++;
   }
   
   // Score: win = 33.3, draw = 16.7, loss = 0
   const perMatch = 100 / 3;
   return teamAWins * perMatch + draws * (perMatch / 2);
 }
 
 /**
  * Main prediction calculation using weighted factors
  */
 function calculatePrediction(
   homeForm: FormMatch[],
   awayForm: FormMatch[],
   homeStats: TeamStats | null,
   awayStats: TeamStats | null,
   h2h: H2HMatch[],
   homeTeamId: number,
   awayTeamId: number,
   homeTeamName: string,
   awayTeamName: string
 ): PredictionResult {
   
   // === FORM SCORES (40%) ===
   const homeFormScore = calculateFormScore(homeForm);
   const awayFormScore = calculateFormScore(awayForm);
   
   // === QUALITY SCORES (25%) ===
   const homeQualityScore = calculateQualityScore(homeStats);
   const awayQualityScore = calculateQualityScore(awayStats);
   
   // === SQUAD SCORE (15%) - Using goal rate as proxy ===
   const homeGoalRate = calculateGoalRate(homeForm);
   const awayGoalRate = calculateGoalRate(awayForm);
   const homeSquadScore = Math.min(100, (homeGoalRate.scored * 30) + (100 - homeGoalRate.conceded * 20));
   const awaySquadScore = Math.min(100, (awayGoalRate.scored * 30) + (100 - awayGoalRate.conceded * 20));
   
   // === HOME ADVANTAGE (10% MAX) ===
   const homeAdvantageScore = 60; // Fixed slight advantage, never dominant
   const awayAdvantageScore = 40;
   
   // === H2H SCORES (10%) ===
   const homeH2HScore = calculateH2HScore(h2h, homeTeamId, awayTeamId);
   const awayH2HScore = 100 - homeH2HScore;
   
   // === WEIGHTED TOTAL ===
   const homeTotal = 
     (homeFormScore * WEIGHT_FORM) +
     (homeQualityScore * WEIGHT_QUALITY) +
     (homeSquadScore * WEIGHT_SQUAD) +
     (homeAdvantageScore * WEIGHT_HOME) +
     (homeH2HScore * WEIGHT_H2H);
   
   const awayTotal = 
     (awayFormScore * WEIGHT_FORM) +
     (awayQualityScore * WEIGHT_QUALITY) +
     (awaySquadScore * WEIGHT_SQUAD) +
     (awayAdvantageScore * WEIGHT_HOME) +
     (awayH2HScore * WEIGHT_H2H);
   
   // === CALCULATE PROBABILITIES ===
   const diff = homeTotal - awayTotal;
   
   // Base probabilities adjusted by difference
   // Neutral = 33/33/33, adjusted based on strength difference
   let homeWin: number;
   let draw: number;
   let awayWin: number;
   
   if (Math.abs(diff) < 5) {
     // Very balanced - increased draw probability
     homeWin = 32 + diff * 0.5;
     awayWin = 32 - diff * 0.5;
     draw = 36;
   } else if (Math.abs(diff) < 15) {
     // Moderate difference
     if (diff > 0) {
       homeWin = 40 + diff * 0.8;
       awayWin = 30 - diff * 0.6;
       draw = 30 - diff * 0.2;
     } else {
       awayWin = 40 + Math.abs(diff) * 0.8;
       homeWin = 30 - Math.abs(diff) * 0.6;
       draw = 30 - Math.abs(diff) * 0.2;
     }
   } else {
     // Clear favorite
     if (diff > 0) {
       homeWin = Math.min(75, 45 + diff * 1.0);
       awayWin = Math.max(10, 25 - diff * 0.5);
       draw = 100 - homeWin - awayWin;
     } else {
       awayWin = Math.min(75, 45 + Math.abs(diff) * 1.0);
       homeWin = Math.max(10, 25 - Math.abs(diff) * 0.5);
       draw = 100 - homeWin - awayWin;
     }
   }
   
   // Ensure probabilities are valid and sum to 100
   homeWin = Math.max(5, Math.min(80, homeWin));
   awayWin = Math.max(5, Math.min(80, awayWin));
   draw = Math.max(10, Math.min(40, draw));
   
   const total = homeWin + draw + awayWin;
   homeWin = Math.round((homeWin / total) * 100);
   draw = Math.round((draw / total) * 100);
   awayWin = 100 - homeWin - draw;
   
   // === DETERMINE PREDICTION ===
   let prediction: string;
   if (homeWin > awayWin && homeWin > draw) {
     prediction = "1";
   } else if (awayWin > homeWin && awayWin > draw) {
     prediction = "2";
   } else {
     prediction = "X";
   }
   
   // === PREDICT SCORE ===
   const predictedScore = predictScore(
     homeGoalRate.scored,
     awayGoalRate.scored,
     homeGoalRate.conceded,
     awayGoalRate.conceded,
     prediction
   );
   
   // === CALCULATE CONFIDENCE ===
   // Max confidence: 92% for very clear favorites, min: 50%
   const maxProb = Math.max(homeWin, awayWin, draw);
   let confidence: number;
   
   if (maxProb >= 70) {
     // Very clear favorite: 85-92% confidence
     confidence = Math.min(92, 85 + (maxProb - 70) * 0.7);
   } else if (maxProb >= 65) {
     // Clear favorite: 78-85% confidence
     confidence = 78 + (maxProb - 65) * 1.4;
   } else if (maxProb >= 50) {
     // Moderate favorite: 60-78% confidence
     confidence = 60 + (maxProb - 50) * 1.2;
   } else {
     // Balanced match: 50-60% confidence
     confidence = Math.max(50, 50 + (maxProb - 33));
   }
   confidence = Math.round(confidence);
   
   // === RISK LEVEL ===
   let riskLevel: "low" | "medium" | "high";
   if (confidence >= 70 && maxProb >= 60) {
     riskLevel = "low";
   } else if (confidence >= 60 || maxProb >= 45) {
     riskLevel = "medium";
   } else {
     riskLevel = "high";
   }
   
   // === GENERATE ANALYSIS ===
   const analysis = generateAnalysis(
     homeTeamName,
     awayTeamName,
     prediction,
     homeFormScore,
     awayFormScore,
     homeQualityScore,
     awayQualityScore,
     confidence
   );
   
   return {
     prediction,
     predicted_score: predictedScore,
     confidence,
     home_win: homeWin,
     draw,
     away_win: awayWin,
     risk_level: riskLevel,
     analysis,
   };
 }
 
 /**
  * Predict realistic score based on goal rates and prediction
  */
 function predictScore(
   homeScoringRate: number,
   awayScoringRate: number,
   homeConcedingRate: number,
   awayConcedingRate: number,
   prediction: string
 ): string {
   // Expected goals calculation
   let homeExpected = (homeScoringRate + awayConcedingRate) / 2;
   let awayExpected = (awayScoringRate + homeConcedingRate) / 2;
   
   // Adjust based on prediction
   if (prediction === "1") {
     homeExpected = Math.max(homeExpected, awayExpected + 0.5);
   } else if (prediction === "2") {
     awayExpected = Math.max(awayExpected, homeExpected + 0.5);
   } else {
     // Draw - equalize
     const avg = (homeExpected + awayExpected) / 2;
     homeExpected = avg;
     awayExpected = avg;
   }
   
   // Round to realistic scores
   let homeGoals = Math.round(homeExpected);
   let awayGoals = Math.round(awayExpected);
   
   // Ensure prediction matches score
   if (prediction === "1" && homeGoals <= awayGoals) {
     homeGoals = awayGoals + 1;
   } else if (prediction === "2" && awayGoals <= homeGoals) {
     awayGoals = homeGoals + 1;
   } else if (prediction === "X") {
     homeGoals = Math.round((homeGoals + awayGoals) / 2);
     awayGoals = homeGoals;
   }
   
   // Cap at reasonable values
   homeGoals = Math.min(4, Math.max(0, homeGoals));
   awayGoals = Math.min(4, Math.max(0, awayGoals));
   
   return `${homeGoals}-${awayGoals}`;
 }
 
 /**
  * Generate match-specific analysis text
  */
 function generateAnalysis(
   homeTeam: string,
   awayTeam: string,
   prediction: string,
   homeFormScore: number,
   awayFormScore: number,
   homeQuality: number,
   awayQuality: number,
   confidence: number
 ): string {
   const formDiff = homeFormScore - awayFormScore;
   const qualityDiff = homeQuality - awayQuality;
   
   let analysis = "";
   
   if (prediction === "1") {
     if (formDiff > 20) {
       analysis = `${homeTeam} enters in strong recent form, winning consistently while ${awayTeam} has struggled. `;
     } else if (qualityDiff > 15) {
       analysis = `${homeTeam} has the overall quality advantage with better season stats. `;
     } else {
       analysis = `${homeTeam} holds a slight edge with home advantage and marginally better form. `;
     }
   } else if (prediction === "2") {
     if (formDiff < -20) {
       analysis = `${awayTeam} arrives in excellent form, looking confident despite playing away. ${homeTeam} has been inconsistent recently. `;
     } else if (qualityDiff < -15) {
       analysis = `${awayTeam} is the stronger side overall this season and should overcome the home factor. `;
     } else {
       analysis = `${awayTeam} has shown better quality and form, making them slight favorites despite playing away. `;
     }
   } else {
     if (Math.abs(formDiff) < 10 && Math.abs(qualityDiff) < 10) {
       analysis = `Evenly matched contest with both teams showing similar form and quality. `;
     } else {
       analysis = `Balanced matchup where neither side has a clear advantage. Both teams capable of scoring. `;
     }
   }
   
   // Add confidence context
   if (confidence >= 70) {
     analysis += "Strong statistical indicators support this outcome.";
   } else if (confidence >= 60) {
     analysis += "Moderate certainty based on available data.";
   } else {
     analysis += "Competitive fixture with inherent uncertainty.";
   }
   
   return analysis;
 }
 
 /**
  * Assign is_premium tier to qualifying predictions
  * Criteria:
  * - confidence >= 85%
  * - Not a draw prediction (max 1 draw allowed)
  * - Low or Medium risk only
  * - Keep top 3-5 by confidence if more qualify
  */
 async function assignPremiumTiers(supabase: any, todayStr: string, tomorrowStr: string): Promise<{ assigned: number }> {
   // First, reset all premium flags for today/tomorrow
   await supabase
     .from("ai_predictions")
     .update({ is_premium: false })
     .in("match_date", [todayStr, tomorrowStr]);
   
   // Fetch all predictions for today and tomorrow
   const { data: allPredictions, error } = await supabase
     .from("ai_predictions")
     .select("*")
     .in("match_date", [todayStr, tomorrowStr])
     .eq("result_status", "pending")
     .order("confidence", { ascending: false });
   
   if (error || !allPredictions) {
     console.error("Error fetching predictions for premium assignment:", error);
     return { assigned: 0 };
   }
   
   // Filter candidates: confidence >= 85%, low/medium risk
   const premiumCandidates = allPredictions.filter((p: any) => 
     p.confidence >= PREMIUM_MIN_CONFIDENCE &&
     PREMIUM_ALLOWED_RISK.includes(p.risk_level)
   );
   
   console.log(`Found ${premiumCandidates.length} premium candidates (confidence >= ${PREMIUM_MIN_CONFIDENCE}%, low/medium risk)`);
   
   if (premiumCandidates.length === 0) {
     return { assigned: 0 };
   }
   
   // Separate draws and non-draws
   const nonDraws = premiumCandidates.filter((p: any) => p.prediction !== "X");
   const draws = premiumCandidates.filter((p: any) => p.prediction === "X");
   
   // Build premium list: prioritize non-draws, allow max 1 draw
   let premiumList: any[] = [];
   
   // Add non-draws first (sorted by confidence)
   premiumList.push(...nonDraws.slice(0, PREMIUM_MAX_COUNT));
   
   // If we have room and there are qualifying draws, add max 1
   if (premiumList.length < PREMIUM_MAX_COUNT && draws.length > 0) {
     premiumList.push(draws[0]); // Only 1 draw max
   }
   
   // Trim to max 5
   premiumList = premiumList.slice(0, PREMIUM_MAX_COUNT);
   
   // Sort final list by confidence
   premiumList.sort((a: any, b: any) => b.confidence - a.confidence);
   
   // Keep minimum 3 if possible
   if (premiumList.length < PREMIUM_MIN_COUNT && premiumList.length > 0) {
     console.log(`Only ${premiumList.length} premium matches qualify (min target: ${PREMIUM_MIN_COUNT})`);
   }
   
   if (premiumList.length === 0) {
     return { assigned: 0 };
   }
   
   // Update is_premium = true for selected predictions
   const premiumIds = premiumList.map((p: any) => p.id);
   
   const { error: updateError } = await supabase
     .from("ai_predictions")
     .update({ is_premium: true })
     .in("id", premiumIds);
   
   if (updateError) {
     console.error("Error assigning premium tier:", updateError);
     return { assigned: 0 };
   }
   
   console.log(`Assigned Premium tier to ${premiumIds.length} predictions:`);
   premiumList.forEach((p: any) => {
     console.log(`  - ${p.home_team} vs ${p.away_team}: ${p.prediction} (${p.confidence}%, ${p.risk_level})`);
   });
   
   return { assigned: premiumIds.length };
 }
 
 /**
  * Regenerate predictions for existing matches in database
  */
 async function handleRegenerate(apiKey: string): Promise<Response> {
   const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
   const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
   const supabase = createClient(supabaseUrl, supabaseKey);
   
   // Fetch pending predictions for today and tomorrow
   const today = new Date();
   const tomorrow = new Date(today);
   tomorrow.setDate(tomorrow.getDate() + 1);
   
   const todayStr = today.toISOString().split("T")[0];
   const tomorrowStr = tomorrow.toISOString().split("T")[0];
   
   console.log(`Fetching predictions for ${todayStr} and ${tomorrowStr}`);
   
   const { data: predictions, error: fetchError } = await supabase
     .from("ai_predictions")
     .select("*")
     .in("match_date", [todayStr, tomorrowStr])
     .eq("result_status", "pending");
   
   if (fetchError) {
     console.error("Error fetching predictions:", fetchError);
     return new Response(
       JSON.stringify({ error: "Failed to fetch predictions", details: fetchError.message }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
   
   if (!predictions || predictions.length === 0) {
     return new Response(
       JSON.stringify({ message: "No pending predictions found to regenerate", updated: 0 }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
   
   console.log(`Found ${predictions.length} predictions to regenerate`);
   
   let updated = 0;
   const errors: string[] = [];
   
   // Process each prediction (with rate limiting)
   for (const pred of predictions) {
     try {
       const fixtureId = pred.match_id;
       
       // Fetch fixture details from API-Football
       const fixtureRes = await fetch(
         `${API_FOOTBALL_URL}/fixtures?id=${fixtureId}`,
         { headers: { "x-apisports-key": apiKey } }
       );
       
       if (!fixtureRes.ok) {
         errors.push(`Fixture ${fixtureId}: API fetch failed`);
         continue;
       }
       
       const fixtureData = await fixtureRes.json();
       const fixture = fixtureData.response?.[0];
       
       if (!fixture) {
         errors.push(`Fixture ${fixtureId}: Not found in API`);
         continue;
       }
       
       const homeTeamId = fixture.teams?.home?.id;
       const awayTeamId = fixture.teams?.away?.id;
       const homeTeamName = fixture.teams?.home?.name || pred.home_team;
       const awayTeamName = fixture.teams?.away?.name || pred.away_team;
       const leagueId = fixture.league?.id;
       const season = fixture.league?.season || new Date().getFullYear();
       
       if (!homeTeamId || !awayTeamId) {
         errors.push(`Fixture ${fixtureId}: Invalid team data`);
         continue;
       }
       
       // Fetch all data in parallel
       const [homeForm, awayForm, h2h, homeStats, awayStats] = await Promise.all([
         fetchTeamForm(homeTeamId, apiKey, 3),
         fetchTeamForm(awayTeamId, apiKey, 3),
         fetchH2H(homeTeamId, awayTeamId, apiKey, 3),
         leagueId ? fetchTeamStats(homeTeamId, leagueId, season, apiKey) : Promise.resolve(null),
         leagueId ? fetchTeamStats(awayTeamId, leagueId, season, apiKey) : Promise.resolve(null),
       ]);
       
       // Calculate new prediction
       const newPrediction = calculatePrediction(
         homeForm,
         awayForm,
         homeStats,
         awayStats,
         h2h,
         homeTeamId,
         awayTeamId,
         homeTeamName,
         awayTeamName
       );
       
       // Update prediction in database
       const { error: updateError } = await supabase
         .from("ai_predictions")
         .update({
           prediction: newPrediction.prediction,
           predicted_score: newPrediction.predicted_score,
           confidence: newPrediction.confidence,
           home_win: newPrediction.home_win,
           draw: newPrediction.draw,
           away_win: newPrediction.away_win,
           risk_level: newPrediction.risk_level,
           analysis: newPrediction.analysis,
           updated_at: new Date().toISOString(),
         })
         .eq("id", pred.id);
       
       if (updateError) {
         errors.push(`Fixture ${fixtureId}: Update failed - ${updateError.message}`);
         continue;
       }
       
       updated++;
       console.log(`Updated ${homeTeamName} vs ${awayTeamName}: ${newPrediction.prediction} (${newPrediction.home_win}/${newPrediction.draw}/${newPrediction.away_win})`);
       
       // Rate limiting: wait 200ms between API calls to avoid hitting limits
       await new Promise(resolve => setTimeout(resolve, 200));
       
     } catch (e) {
       errors.push(`Fixture ${pred.match_id}: ${e instanceof Error ? e.message : "Unknown error"}`);
     }
   }
   
   // After regeneration, assign premium tiers
   console.log("Assigning Premium tiers...");
   const premiumResult = await assignPremiumTiers(supabase, todayStr, tomorrowStr);
   
   return new Response(
     JSON.stringify({
       message: `Regeneration complete`,
       total: predictions.length,
       updated,
       premiumAssigned: premiumResult.assigned,
       errors: errors.length > 0 ? errors : undefined,
     }),
     { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
   );
 }
 
 serve(async (req: Request) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
   
   try {
     const apiKey = Deno.env.get("API_FOOTBALL_KEY");
     if (!apiKey) {
       return new Response(
         JSON.stringify({ error: "API key not configured" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
     
     // Parse request body
     const body = await req.json().catch(() => ({}));
     
     // Check for regenerate mode
     if (body.regenerate === true) {
       return handleRegenerate(apiKey);
     }
     
     // Single fixture mode
     const fixtureId = body.fixtureId;
     
     if (!fixtureId) {
       return new Response(
         JSON.stringify({ error: "Missing fixtureId parameter" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
     
     // Fetch fixture details
     const fixtureRes = await fetch(
       `${API_FOOTBALL_URL}/fixtures?id=${fixtureId}`,
       { headers: { "x-apisports-key": apiKey } }
     );
     
     if (!fixtureRes.ok) {
       return new Response(
         JSON.stringify({ error: "Failed to fetch fixture" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
     
     const fixtureData = await fixtureRes.json();
     const fixture = fixtureData.response?.[0];
     
     if (!fixture) {
       return new Response(
         JSON.stringify({ error: "Fixture not found" }),
         { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
     
     const homeTeamId = fixture.teams?.home?.id;
     const awayTeamId = fixture.teams?.away?.id;
     const homeTeamName = fixture.teams?.home?.name || "Home Team";
     const awayTeamName = fixture.teams?.away?.name || "Away Team";
     const leagueId = fixture.league?.id;
     const season = fixture.league?.season || new Date().getFullYear();
     
     if (!homeTeamId || !awayTeamId) {
       return new Response(
         JSON.stringify({ error: "Invalid team data" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
     
     // Fetch all data in parallel for efficiency
     const [homeForm, awayForm, h2h, homeStats, awayStats] = await Promise.all([
       fetchTeamForm(homeTeamId, apiKey, 3),
       fetchTeamForm(awayTeamId, apiKey, 3),
       fetchH2H(homeTeamId, awayTeamId, apiKey, 3),
       leagueId ? fetchTeamStats(homeTeamId, leagueId, season, apiKey) : Promise.resolve(null),
       leagueId ? fetchTeamStats(awayTeamId, leagueId, season, apiKey) : Promise.resolve(null),
     ]);
     
     // Calculate prediction
     const prediction = calculatePrediction(
       homeForm,
       awayForm,
       homeStats,
       awayStats,
       h2h,
       homeTeamId,
       awayTeamId,
       homeTeamName,
       awayTeamName
     );
     
     console.log(`Prediction for ${homeTeamName} vs ${awayTeamName}: ${prediction.prediction} (${prediction.home_win}/${prediction.draw}/${prediction.away_win})`);
     
     return new Response(
       JSON.stringify({
         fixtureId,
         home_team: homeTeamName,
         away_team: awayTeamName,
         ...prediction,
       }),
       { 
         status: 200, 
         headers: { ...corsHeaders, "Content-Type": "application/json" } 
       }
     );
     
   } catch (error) {
     console.error("Error generating prediction:", error);
     return new Response(
       JSON.stringify({ error: "Internal server error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });