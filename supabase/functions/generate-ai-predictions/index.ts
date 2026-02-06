 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const API_FOOTBALL_URL = "https://v3.football.api-sports.io";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
   "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
 };
 
 // ============ TIER CRITERIA ============
 // FREE: confidence < 65%
 // PRO (exclusive): confidence >= 65% AND < 85%
 // PREMIUM: confidence >= 85%
 const FREE_MAX_CONFIDENCE = 64;
 const PRO_MIN_CONFIDENCE = 65;
 const PRO_MAX_CONFIDENCE = 84;
 const PREMIUM_MIN_CONFIDENCE = 85;
 
 const PREMIUM_MAX_DRAWS = 1;
 const PREMIUM_MAX_COUNT = 10;
 const PREMIUM_MIN_COUNT = 5;
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
   * Calculate form score (0-100) from last 3 matches using points + goal diff.
   * - Win=3, Draw=1, Loss=0 (max 9)
   * - Goal impact is a small stabilizer
   */
  function calculateFormScore(form: FormMatch[]): number {
    if (form.length === 0) return 50;

    const matches = form.slice(0, 3);
    let points = 0;
    let gf = 0;
    let ga = 0;

    for (const m of matches) {
      if (m.result === "W") points += 3;
      else if (m.result === "D") points += 1;
      gf += m.goalsFor;
      ga += m.goalsAgainst;
    }

    const pointsScore = (points / 9) * 100; // 0..100
    const goalDiff = gf - ga;
    const gdScore = Math.max(0, Math.min(100, 50 + goalDiff * 8));

    return Math.round(pointsScore * 0.75 + gdScore * 0.25);
  }

  /**
   * Average goals (scored/conceded) from last 3 matches.
   */
  function calculateGoalRate(form: FormMatch[]): { scored: number; conceded: number } {
    if (form.length === 0) return { scored: 1.0, conceded: 1.0 };

    const matches = form.slice(0, 3);
    let scored = 0;
    let conceded = 0;

    for (const match of matches) {
      scored += match.goalsFor;
      conceded += match.goalsAgainst;
    }

    return {
      scored: scored / matches.length,
      conceded: conceded / matches.length,
    };
  }

  /**
   * Calculate team quality score (0-100) from season stats.
   */
  function calculateQualityScore(stats: TeamStats | null): number {
    if (!stats || stats.played === 0) return 50;

    const winRate = stats.wins / stats.played;
    const goalDiffPerGame = (stats.goalsFor - stats.goalsAgainst) / stats.played;

    const winScore = winRate * 100;
    const gdScore = Math.max(0, Math.min(100, 50 + goalDiffPerGame * 12));

    return Math.round(winScore * 0.65 + gdScore * 0.35);
  }

  /**
   * Calculate H2H score from perspective of team A vs team B (0-100, 50 neutral)
   */
  function calculateH2HScore(h2h: H2HMatch[], teamAId: number, teamBId: number): number {
    if (h2h.length === 0) return 50;

    const matches = h2h.slice(0, 3);
    let points = 0;

    for (const match of matches) {
      const isTeamAHome = match.homeTeamId === teamAId;
      const teamAGoals = isTeamAHome ? match.homeGoals : match.awayGoals;
      const teamBGoals = isTeamAHome ? match.awayGoals : match.homeGoals;

      if (teamAGoals > teamBGoals) points += 3;
      else if (teamAGoals === teamBGoals) points += 1;
    }

    return Math.round((points / 9) * 100);
  }

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function sigmoid(x: number) {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Main prediction calculation using required weights:
   * Form 40%, Quality 25%, Squad 15%, Home 10% max, H2H 10%.
   *
   * Constraints:
   * - Home advantage is minor (never dominant)
   * - Probabilities always sum to 100
   * - Confidence capped at 78% (no 90%+)
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
    // === FORM (40%) ===
    const homeFormScore = calculateFormScore(homeForm);
    const awayFormScore = calculateFormScore(awayForm);

    // === QUALITY (25%) ===
    const homeQualityScore = calculateQualityScore(homeStats);
    const awayQualityScore = calculateQualityScore(awayStats);

    // === SQUAD / AVAILABILITY (15%) ===
    // Conservative proxy from last-3 attacking output + defensive stability.
    const homeGoalRate = calculateGoalRate(homeForm);
    const awayGoalRate = calculateGoalRate(awayForm);

    const homeSquadScore = clamp(
      50 + (homeGoalRate.scored - homeGoalRate.conceded) * 18,
      0,
      100
    );
    const awaySquadScore = clamp(
      50 + (awayGoalRate.scored - awayGoalRate.conceded) * 18,
      0,
      100
    );

    // === HOME ADVANTAGE (10% MAX, MINOR) ===
    const homeAdvantageScore = 52;
    const awayAdvantageScore = 48;

    // === H2H (10%, secondary) ===
    const homeH2HScore = calculateH2HScore(h2h, homeTeamId, awayTeamId);
    const awayH2HScore = 100 - homeH2HScore;

    const homeTotal =
      homeFormScore * WEIGHT_FORM +
      homeQualityScore * WEIGHT_QUALITY +
      homeSquadScore * WEIGHT_SQUAD +
      homeAdvantageScore * WEIGHT_HOME +
      homeH2HScore * WEIGHT_H2H;

    const awayTotal =
      awayFormScore * WEIGHT_FORM +
      awayQualityScore * WEIGHT_QUALITY +
      awaySquadScore * WEIGHT_SQUAD +
      awayAdvantageScore * WEIGHT_HOME +
      awayH2HScore * WEIGHT_H2H;

    // === PROBABILITIES ===
    const diff = homeTotal - awayTotal;
    const diffAbs = Math.abs(diff);

    // 0..1 where 0=balanced, 1=clear favorite
    const strength = clamp(diffAbs / 18, 0, 1);

    // Draw 30% when balanced, down to ~16% when strong favorite
    let draw = 30 - strength * 14;

    // Home share of non-draw outcomes
    const homeShare = sigmoid(diff / 7);

    let homeWin = (100 - draw) * homeShare;
    let awayWin = 100 - draw - homeWin;

    // Normalize + round into realistic ranges
    homeWin = Math.round(clamp(homeWin, 10, 75));
    draw = Math.round(clamp(draw, 15, 30));
    awayWin = 100 - homeWin - draw;

    // Rebalance if rounding pushed bounds
    if (awayWin < 10) {
      const delta = 10 - awayWin;
      awayWin = 10;
      const takeDraw = Math.min(delta, Math.max(0, draw - 15));
      draw -= takeDraw;
      homeWin = 100 - draw - awayWin;
    }
    if (homeWin < 10) {
      const delta = 10 - homeWin;
      homeWin = 10;
      const takeDraw = Math.min(delta, Math.max(0, draw - 15));
      draw -= takeDraw;
      awayWin = 100 - draw - homeWin;
    }

    // === OUTCOME ===
    let prediction: string;
    if (homeWin > awayWin && homeWin > draw) prediction = "1";
    else if (awayWin > homeWin && awayWin > draw) prediction = "2";
    else prediction = "X";

    // === SCORE ===
    const predictedScore = predictScoreV2({
      homeGoalRate,
      awayGoalRate,
      homeWin,
      awayWin,
      draw,
      prediction,
    });

    // === CONFIDENCE (50..78) ===
    const maxProb = Math.max(homeWin, awayWin, draw);
    let confidence: number;

    if (maxProb < 40) confidence = 60;
    else if (maxProb < 50) confidence = 62;
    else if (maxProb < 60) confidence = 60 + (maxProb - 50) * 0.8; // 60..68
    else confidence = 70 + (maxProb - 60) * 0.4; // 70..76

    confidence = Math.round(clamp(confidence, 50, 78));

    // Weak signal -> cap at 65
    if (!homeStats && !awayStats) {
      confidence = Math.min(confidence, 65);
    }

    // === RISK ===
    let riskLevel: "low" | "medium" | "high";
    if (confidence >= 72 && maxProb >= 60) riskLevel = "low";
    else if (confidence >= 62) riskLevel = "medium";
    else riskLevel = "high";

    const analysis = generateAnalysisV2({
      homeTeamName,
      awayTeamName,
      prediction,
      homeWin,
      draw,
      awayWin,
      homeFormScore,
      awayFormScore,
      homeQualityScore,
      awayQualityScore,
    });

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

  function predictScoreV2(params: {
    homeGoalRate: { scored: number; conceded: number };
    awayGoalRate: { scored: number; conceded: number };
    homeWin: number;
    awayWin: number;
    draw: number;
    prediction: string;
  }): string {
    const { homeGoalRate, awayGoalRate, homeWin, awayWin, prediction } = params;

    let homeXg = (homeGoalRate.scored + awayGoalRate.conceded) / 2;
    let awayXg = (awayGoalRate.scored + homeGoalRate.conceded) / 2;

    const strongHomeFav = prediction === "1" && homeWin >= 65;
    const strongAwayFav = prediction === "2" && awayWin >= 65;
    const balanced = prediction === "X";

    if (strongHomeFav) {
      homeXg += 0.6;
      awayXg -= 0.2;
    } else if (strongAwayFav) {
      awayXg += 0.6;
      homeXg -= 0.2;
    } else if (balanced) {
      const avg = (homeXg + awayXg) / 2;
      homeXg = avg;
      awayXg = avg;
    }

    homeXg = clamp(homeXg, 0, 3.2);
    awayXg = clamp(awayXg, 0, 3.2);

    let homeGoals = Math.round(homeXg);
    let awayGoals = Math.round(awayXg);

    if (prediction === "1" && homeGoals <= awayGoals) homeGoals = awayGoals + 1;
    if (prediction === "2" && awayGoals <= homeGoals) awayGoals = homeGoals + 1;

    if (prediction === "X") {
      const g = Math.round((homeGoals + awayGoals) / 2);
      homeGoals = g;
      awayGoals = g;
      if (g === 0 && (homeGoalRate.scored >= 1 || awayGoalRate.scored >= 1)) {
        homeGoals = 1;
        awayGoals = 1;
      }
    }

    homeGoals = clamp(homeGoals, 0, 4);
    awayGoals = clamp(awayGoals, 0, 4);

    return `${homeGoals}-${awayGoals}`;
  }

  function generateAnalysisV2(params: {
    homeTeamName: string;
    awayTeamName: string;
    prediction: string;
    homeWin: number;
    draw: number;
    awayWin: number;
    homeFormScore: number;
    awayFormScore: number;
    homeQualityScore: number;
    awayQualityScore: number;
  }): string {
    const {
      homeTeamName,
      awayTeamName,
      prediction,
      homeWin,
      draw,
      awayWin,
      homeFormScore,
      awayFormScore,
      homeQualityScore,
      awayQualityScore,
    } = params;

    const formDiff = homeFormScore - awayFormScore;
    const qualityDiff = homeQualityScore - awayQualityScore;

    if (prediction === "1") {
      return `${homeTeamName} looks the more reliable side here, with an edge in recent form/overall quality. Home advantage is a minor factor, but the numbers still favor ${homeTeamName} (${homeWin}% vs ${awayWin}%).`;
    }

    if (prediction === "2") {
      return `${awayTeamName} enters with stronger recent indicators and can be the favorite even away from home. The model leans toward ${awayTeamName} (${awayWin}% vs ${homeWin}%) with a controlled draw probability (${draw}%).`;
    }

    const why = Math.abs(formDiff) < 10 && Math.abs(qualityDiff) < 10
      ? `both teams show similar form and quality`
      : `neither side has a clear enough advantage`;

    return `This matchup looks balanced: ${why}. The draw is a realistic outcome (${draw}%) with split win probabilities (${homeWin}% / ${awayWin}%).`;
  }

 /**
  * Assign tiers to all predictions based on confidence:
  * - FREE: confidence < 65%
  * - PRO (exclusive): confidence >= 65% AND < 85% 
  * - PREMIUM: confidence >= 85%, low/medium risk only, max 1 draw, top 5-10
  */
async function assignTiers(supabase: any, todayStr: string, tomorrowStr: string): Promise<{ free: number; pro: number; premium: number }> {
    // Fetch ONLY unlocked predictions for today and tomorrow
    // Locked predictions have missing API data and should NOT receive tier assignment
    const { data: allPredictions, error } = await supabase
      .from("ai_predictions")
      .select("*")
      .in("match_date", [todayStr, tomorrowStr])
      .eq("result_status", "pending")
      .eq("is_locked", false) // Only assign tiers to unlocked predictions
      .order("confidence", { ascending: false });
   
   if (error || !allPredictions) {
     console.error("Error fetching predictions for premium assignment:", error);
     return { free: 0, pro: 0, premium: 0 };
   }
   
   // === TIER ASSIGNMENT ===
   // 1. FREE: confidence < 65%
   const freeTier = allPredictions.filter((p: any) => p.confidence <= FREE_MAX_CONFIDENCE);
   
   // 2. PRO: confidence >= 65% AND < 85%
   const proTier = allPredictions.filter((p: any) => 
     p.confidence >= PRO_MIN_CONFIDENCE && p.confidence <= PRO_MAX_CONFIDENCE
   );
   
   // 3. PREMIUM candidates: confidence >= 85%, low/medium risk only
   const premiumCandidates = allPredictions.filter((p: any) => 
     p.confidence >= PREMIUM_MIN_CONFIDENCE &&
     PREMIUM_ALLOWED_RISK.includes(p.risk_level)
   );
   
   console.log(`Tier distribution - FREE (conf<65%): ${freeTier.length}, PRO (65-84%): ${proTier.length}, PREMIUM candidates (>=85%, low/med risk): ${premiumCandidates.length}`);
   
   // === BUILD PREMIUM LIST ===
   let premiumList: any[] = [];
   
   if (premiumCandidates.length > 0) {
     // Separate draws and non-draws
     const nonDraws = premiumCandidates.filter((p: any) => p.prediction !== "X");
     const draws = premiumCandidates.filter((p: any) => p.prediction === "X");
     
     // Add non-draws first (sorted by confidence)
     premiumList.push(...nonDraws.slice(0, PREMIUM_MAX_COUNT));
     
     // If we have room and there are qualifying draws, add max 1
     if (premiumList.length < PREMIUM_MAX_COUNT && draws.length > 0) {
       premiumList.push(draws[0]); // Only 1 draw max
     }
     
     // Trim to max 10
     premiumList = premiumList.slice(0, PREMIUM_MAX_COUNT);
     
     // Sort final list by confidence
     premiumList.sort((a: any, b: any) => b.confidence - a.confidence);
     
     // Keep minimum 5 if possible
     if (premiumList.length < PREMIUM_MIN_COUNT && premiumList.length > 0) {
       console.log(`Only ${premiumList.length} premium matches qualify (min target: ${PREMIUM_MIN_COUNT})`);
     }
   }
   
   const premiumIds = premiumList.map((p: any) => p.id);
   const proIds = proTier.map((p: any) => p.id);
   const freeIds = freeTier.map((p: any) => p.id);
   
   // === UPDATE ALL TIERS IN DATABASE ===
   // First reset all to not premium
   await supabase
     .from("ai_predictions")
     .update({ is_premium: false })
     .in("match_date", [todayStr, tomorrowStr]);
   
   // Set Premium tier (is_premium = true)
   if (premiumIds.length > 0) {
     const { error: premiumError } = await supabase
       .from("ai_predictions")
       .update({ is_premium: true })
       .in("id", premiumIds);
     
     if (premiumError) {
       console.error("Error assigning premium tier:", premiumError);
     }
   }
   
   // Log tier assignments
   console.log(`\n=== TIER ASSIGNMENTS ===`);
   console.log(`FREE (confidence < 65%): ${freeIds.length} matches`);
   console.log(`PRO (confidence 65-84%): ${proIds.length} matches`);
   console.log(`PREMIUM (confidence >= 85%, low/med risk): ${premiumIds.length} matches`);
   
   if (premiumList.length > 0) {
     console.log(`\nPremium matches:`);
   premiumList.forEach((p: any) => {
       console.log(`  - ${p.home_team} vs ${p.away_team}: ${p.prediction} (${p.confidence}%, ${p.risk_level})`);
     });
   }
   
   return { 
     free: freeIds.length, 
     pro: proIds.length, 
     premium: premiumIds.length 
   };
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
    let locked = 0;
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
          // API fetch failed - mark as locked (pending data)
          await supabase
            .from("ai_predictions")
            .update({ is_locked: true, updated_at: new Date().toISOString() })
            .eq("id", pred.id);
          locked++;
          errors.push(`Fixture ${fixtureId}: API fetch failed - marked as locked`);
          continue;
        }
        
        const fixtureData = await fixtureRes.json();
        const fixture = fixtureData.response?.[0];
        
        if (!fixture) {
          // Fixture not found in API - mark as locked (pending data)
          // Do NOT apply tier assignment or use old probabilities
          await supabase
            .from("ai_predictions")
            .update({ is_locked: true, updated_at: new Date().toISOString() })
            .eq("id", pred.id);
          locked++;
          console.log(`Fixture ${fixtureId}: Not found in API - marked as locked (pending data)`);
          continue;
        }
        
        const homeTeamId = fixture.teams?.home?.id;
        const awayTeamId = fixture.teams?.away?.id;
        const homeTeamName = fixture.teams?.home?.name || pred.home_team;
        const awayTeamName = fixture.teams?.away?.name || pred.away_team;
        const leagueId = fixture.league?.id;
        const season = fixture.league?.season || new Date().getFullYear();
        
        if (!homeTeamId || !awayTeamId) {
          // Invalid team data - mark as locked
          await supabase
            .from("ai_predictions")
            .update({ is_locked: true, updated_at: new Date().toISOString() })
            .eq("id", pred.id);
          locked++;
          errors.push(`Fixture ${fixtureId}: Invalid team data - marked as locked`);
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
        
        // Check if we have sufficient data to calculate prediction
        // If no form data available, mark as locked
        if (homeForm.length === 0 && awayForm.length === 0 && !homeStats && !awayStats) {
          await supabase
            .from("ai_predictions")
            .update({ is_locked: true, updated_at: new Date().toISOString() })
            .eq("id", pred.id);
          locked++;
          console.log(`Fixture ${fixtureId}: Insufficient data - marked as locked`);
          continue;
        }
        
        // Calculate new prediction using full AI engine
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
        
        // Update prediction in database - unlock since we have valid data
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
            is_locked: false, // Unlock - data is now valid
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
        // On error, mark as locked
        await supabase
          .from("ai_predictions")
          .update({ is_locked: true, updated_at: new Date().toISOString() })
          .eq("id", pred.id);
        locked++;
        errors.push(`Fixture ${pred.match_id}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }
    
    // After regeneration, assign tiers ONLY for unlocked predictions
    // Locked predictions (no data) should NOT receive tier assignments based on old data
    console.log(`\n=== Summary: ${updated} updated, ${locked} locked (pending data) ===`);
    console.log("\n=== Assigning tiers based on confidence (unlocked predictions only)... ===");
    const tierResult = await assignTiers(supabase, todayStr, tomorrowStr);
    
    return new Response(
      JSON.stringify({
        message: `Regeneration complete`,
        total: predictions.length,
        updated,
        locked,
        tiers: {
          free: tierResult.free,
          pro: tierResult.pro,
          premium: tierResult.premium,
        },
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