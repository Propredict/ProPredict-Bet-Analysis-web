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

// ============ API RESILIENCE (rate limit safe) ============
const MIN_API_INTERVAL_MS = 220; // ~272 req/min worst-case, stays under 300/min
let lastApiCallAt = 0;

async function throttleApi() {
  const now = Date.now();
  const waitMs = lastApiCallAt + MIN_API_INTERVAL_MS - now;
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  lastApiCallAt = Date.now();
}

async function fetchJsonWithRetry(
  url: string,
  apiKey: string,
  opts?: { retries?: number; baseDelayMs?: number }
): Promise<any | null> {
  const retries = opts?.retries ?? 3;
  const baseDelayMs = opts?.baseDelayMs ?? 600;

  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttleApi();
    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });

    // 429: respect rate limits with exponential backoff
    if (res.status === 429) {
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
      const backoffMs = Math.round(baseDelayMs * Math.pow(2, attempt));
      const waitMs = Math.max(retryAfterMs, backoffMs);
      console.warn(`API-Football rate limit (429). Waiting ${waitMs}ms then retrying: ${url}`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      // transient 5xx: retry
      if (res.status >= 500 && attempt < retries) {
        const waitMs = Math.round(baseDelayMs * Math.pow(2, attempt));
        console.warn(`API-Football ${res.status}. Waiting ${waitMs}ms then retrying: ${url}`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      return null;
    }

    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  return null;
}

// Simple in-memory caches (per function invocation) to reduce API calls
const teamFormCache = new Map<number, FormMatch[]>();
const h2hCache = new Map<string, H2HMatch[]>();
const teamStatsCache = new Map<string, TeamStats | null>();
 
/**
 * Fetch team's last N matches form
 */
async function fetchTeamForm(teamId: number, apiKey: string, count: number = 3): Promise<FormMatch[]> {
  const cached = teamFormCache.get(teamId);
  if (cached && cached.length >= count) return cached.slice(0, count);

  try {
    const url = `${API_FOOTBALL_URL}/fixtures?team=${teamId}&last=${count}&status=FT-AET-PEN`;
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 4, baseDelayMs: 700 });
    if (!data?.response) return [];

    const matches = data.response || [];
    const normalized: FormMatch[] = matches.map((m: any) => {
      const isHome = m.teams.home.id === teamId;
      const goalsFor = isHome ? m.goals.home : m.goals.away;
      const goalsAgainst = isHome ? m.goals.away : m.goals.home;
      const won = isHome ? m.teams.home.winner : m.teams.away.winner;

      let result: "W" | "D" | "L" = "D";
      if (won === true) result = "W";
      else if (won === false) result = "L";

      return { result, goalsFor, goalsAgainst, isHome };
    });

    teamFormCache.set(teamId, normalized);
    return normalized;
  } catch (e) {
    console.error("Error fetching team form:", e);
    return [];
  }
}

/**
 * Fetch head-to-head matches between two teams
 */
async function fetchH2H(homeTeamId: number, awayTeamId: number, apiKey: string, count: number = 3): Promise<H2HMatch[]> {
  const key = `${homeTeamId}-${awayTeamId}-${count}`;
  const cached = h2hCache.get(key);
  if (cached) return cached;

  try {
    const url = `${API_FOOTBALL_URL}/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=${count}`;
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 4, baseDelayMs: 700 });
    if (!data?.response) return [];

    const matches = data.response || [];
    const normalized: H2HMatch[] = matches.map((m: any) => ({
      homeTeamId: m.teams.home.id,
      awayTeamId: m.teams.away.id,
      homeGoals: m.goals.home ?? 0,
      awayGoals: m.goals.away ?? 0,
    }));

    h2hCache.set(key, normalized);
    return normalized;
  } catch (e) {
    console.error("Error fetching H2H:", e);
    return [];
  }
}

/**
 * Fetch team statistics for current season
 */
async function fetchTeamStats(teamId: number, leagueId: number, season: number, apiKey: string): Promise<TeamStats | null> {
  const cacheKey = `${teamId}:${leagueId}:${season}`;
  if (teamStatsCache.has(cacheKey)) return teamStatsCache.get(cacheKey) ?? null;

  try {
    const url = `${API_FOOTBALL_URL}/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`;
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 4, baseDelayMs: 700 });
    const stats = data?.response;
    if (!stats) {
      teamStatsCache.set(cacheKey, null);
      return null;
    }

    const normalized: TeamStats = {
      played: stats.fixtures?.played?.total ?? 0,
      wins: stats.fixtures?.wins?.total ?? 0,
      draws: stats.fixtures?.draws?.total ?? 0,
      losses: stats.fixtures?.loses?.total ?? 0,
      goalsFor: stats.goals?.for?.total?.total ?? 0,
      goalsAgainst: stats.goals?.against?.total?.total ?? 0,
      form: stats.form ?? "",
    };

    teamStatsCache.set(cacheKey, normalized);
    return normalized;
  } catch (e) {
    console.error("Error fetching team stats:", e);
    teamStatsCache.set(cacheKey, null);
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

    // === CONFIDENCE (50..92) ===
    // Rules:
    // - Balanced match: 60–65
    // - Clear favorite: 72–78
    // - Very clear favorite (premium-class): 85–92 (never 95%+)
    // - Weak leagues / missing season stats: cap at 65
    const maxProb = Math.max(homeWin, awayWin, draw);

    const hasSeasonStats = !!homeStats && !!awayStats && homeStats.played > 0 && awayStats.played > 0;
    const isBalanced = Math.abs(homeWin - awayWin) < 8 && maxProb < 45;

    let confidence: number;

    if (isBalanced) {
      // Balanced: keep in 60–65 band
      confidence = 60 + clamp((45 - maxProb) * 0.25, 0, 5);
    } else {
      // Base confidence from how decisive the favorite probability is
      // maxProb 45 -> ~62, maxProb 70 -> ~80 ("normal" cap)
      const edge = clamp((maxProb - 45) / 25, 0, 1);
      confidence = 62 + edge * 18; // 62..80

      // Premium boost only when data is strong and favorite is very clear
      // This allows 85–92 for the very best matches.
      const premiumBoostEligible = hasSeasonStats && maxProb >= 68;
      if (premiumBoostEligible) {
        const boost = clamp((maxProb - 68) / 10, 0, 1) * 12; // up to +12
        confidence += boost; // up to ~92
      }
    }

    confidence = Math.round(clamp(confidence, 50, 92));

    // Weak signal / weak league proxy: without season stats, don't exceed 65
    if (!hasSeasonStats) {
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
  * Assign tiers to all predictions based on confidence (STRICT):
  * - FREE: confidence < 65%
  * - PRO: 65–84%
  * - PREMIUM: >= 85%
  * No exceptions (risk/draw caps must NOT downgrade >=85% into PRO).
  * Tier assignment must run AFTER regeneration.
  */
async function assignTiers(
  supabase: any,
  todayStr: string,
  tomorrowStr: string
): Promise<{ free: number; pro: number; premium: number }> {
  // Fetch unlocked predictions for today and tomorrow
  // Include both "pending" and NULL (some rows may be NULL historically)
  const { data: allPredictions, error } = await supabase
    .from("ai_predictions")
    .select("id, confidence, is_locked, result_status")
    .in("match_date", [todayStr, tomorrowStr])
    .in("result_status", ["pending", null])
    .eq("is_locked", false)
    .order("confidence", { ascending: false });

  if (error || !allPredictions) {
    console.error("Error fetching predictions for tier assignment:", error);
    return { free: 0, pro: 0, premium: 0 };
  }

  const premiumIds = allPredictions
    .filter((p: any) => (p.confidence ?? 0) >= PREMIUM_MIN_CONFIDENCE)
    .map((p: any) => p.id);

  const proIds = allPredictions
    .filter(
      (p: any) =>
        (p.confidence ?? 0) >= PRO_MIN_CONFIDENCE && (p.confidence ?? 0) <= PRO_MAX_CONFIDENCE
    )
    .map((p: any) => p.id);

  const freeIds = allPredictions
    .filter((p: any) => (p.confidence ?? 0) <= FREE_MAX_CONFIDENCE)
    .map((p: any) => p.id);

  console.log(`\n=== STRICT TIER ASSIGNMENT (by confidence only) ===`);
  console.log(`FREE (<65%): ${freeIds.length}`);
  console.log(`PRO (65–84%): ${proIds.length}`);
  console.log(`PREMIUM (>=85%): ${premiumIds.length}`);

  // Reset all to not premium for the two dates, then set premium = true
  // (Other tiers are derived from confidence, but PREMIUM must be explicit in DB.)
  const { error: resetError } = await supabase
    .from("ai_predictions")
    .update({ is_premium: false })
    .in("match_date", [todayStr, tomorrowStr]);

  if (resetError) {
    console.error("Error resetting premium flags:", resetError);
  }

  if (premiumIds.length > 0) {
    const { error: premiumError } = await supabase
      .from("ai_predictions")
      .update({ is_premium: true })
      .in("id", premiumIds);

    if (premiumError) {
      console.error("Error assigning premium flags:", premiumError);
    }
  }

  return { free: freeIds.length, pro: proIds.length, premium: premiumIds.length };
}
  
  async function markPredictionLocked(
    supabase: any,
    predictionId: string,
    reason: string
  ) {
    const updatedAt = new Date().toISOString();

    const { error } = await supabase
      .from("ai_predictions")
      .update({
        is_locked: true,
        // Overwrite old engine outputs so UI never shows misleading stale predictions
        prediction: "X",
        predicted_score: null,
        confidence: 50,
        home_win: 33,
        draw: 34,
        away_win: 33,
        risk_level: "high",
        analysis: `Pending data from API-Football. ${reason}`,
        updated_at: updatedAt,
      })
      .eq("id", predictionId);

    if (error) {
      console.error("Error marking prediction as locked:", error);
    }
  }

  /**
   * Regenerate predictions for existing matches in database
   */
  async function handleRegenerate(apiKey: string): Promise<Response> {
   const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
   const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
   const supabase = createClient(supabaseUrl, supabaseKey);
   
   // === ALWAYS regenerate TODAY and TOMORROW using the NEW algorithm ===
   // Fetches ALL predictions for these dates (not just "pending"),
   // so every cron run recalculates with fresh API data.
   const today = new Date();
   const tomorrow = new Date(today);
   tomorrow.setDate(tomorrow.getDate() + 1);
   
   const todayStr = today.toISOString().split("T")[0];
   const tomorrowStr = tomorrow.toISOString().split("T")[0];
   
   console.log(`\n=== REGENERATING PREDICTIONS FOR ${todayStr} AND ${tomorrowStr} ===`);
   console.log(`Using NEW weighted algorithm: Form 40%, Quality 25%, Squad 15%, Home 10%, H2H 10%`);
   
    // Fetch fixture lists once (TODAY + TOMORROW) to avoid per-fixture requests.
    // This also lets us guarantee that TOMORROW fixtures exist in DB (no silent missing data).
    const [todayFixturesJson, tomorrowFixturesJson] = await Promise.all([
      fetchJsonWithRetry(`${API_FOOTBALL_URL}/fixtures?date=${todayStr}`, apiKey, { retries: 4, baseDelayMs: 800 }),
      fetchJsonWithRetry(`${API_FOOTBALL_URL}/fixtures?date=${tomorrowStr}`, apiKey, { retries: 4, baseDelayMs: 800 }),
    ]);

    const todayFixtures = todayFixturesJson?.response ?? [];
    const tomorrowFixtures = tomorrowFixturesJson?.response ?? [];

    const fixtureById = new Map<string, any>();
    const expectedDateByFixtureId = new Map<string, string>();

    for (const f of [...todayFixtures, ...tomorrowFixtures]) {
      const idStr = String(f?.fixture?.id ?? "");
      if (!idStr) continue;
      fixtureById.set(idStr, f);
      const d = String(f?.fixture?.date ?? "").split("T")[0];
      expectedDateByFixtureId.set(idStr, d || todayStr);
    }

    const fixtureIds = Array.from(fixtureById.keys());

    // If fixture listing failed (rate limit/outage), we still regenerate whatever is already in DB.
    const shouldUseFixtureList = fixtureIds.length > 0;

    // Fetch existing predictions for TODAY + TOMORROW (small query; avoids huge URL from match_id IN (...))
    const { data: predictionsFromDb, error: fetchError } = await supabase
      .from("ai_predictions")
      .select("*")
      .in("match_date", [todayStr, tomorrowStr])
      .in("result_status", ["pending", null]);

    if (fetchError) {
      console.error("Error fetching predictions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch predictions", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let predictions = predictionsFromDb ?? [];

    // Ensure fixtures exist in DB (especially TOMORROW).
    // - Never silently fall back: if we can't fetch fixtures, we won't insert anything.
    // - If DB is missing a fixture row, we insert a locked placeholder.
    if (shouldUseFixtureList) {
      const existingMatchIds = new Set(predictions.map((p: any) => String(p.match_id)));
      let missingFixtureIds = fixtureIds.filter((id) => !existingMatchIds.has(String(id)));

      // 1) Try to "rescue" historical rows that exist but have NULL match_date (so UI couldn't show TOMORROW)
      // Do this in chunks to avoid enormous URLs.
      if (missingFixtureIds.length > 0) {
        const CHUNK = 150;
        const idsToSetToday: string[] = [];
        const idsToSetTomorrow: string[] = [];

        for (let i = 0; i < missingFixtureIds.length; i += CHUNK) {
          const chunk = missingFixtureIds.slice(i, i + CHUNK);

          const { data: nullDateRows, error: nullDateError } = await supabase
            .from("ai_predictions")
            .select("id, match_id")
            .in("match_id", chunk)
            .is("match_date", null)
            .in("result_status", ["pending", null]);

          if (nullDateError) {
            console.error("Error fetching NULL match_date rows:", nullDateError);
            continue;
          }

          for (const r of nullDateRows ?? []) {
            const expected = expectedDateByFixtureId.get(String(r.match_id));
            if (expected === todayStr) idsToSetToday.push(String(r.id));
            else if (expected === tomorrowStr) idsToSetTomorrow.push(String(r.id));
          }
        }

        if (idsToSetToday.length > 0) {
          await supabase.from("ai_predictions").update({ match_date: todayStr }).in("id", idsToSetToday);
        }
        if (idsToSetTomorrow.length > 0) {
          await supabase.from("ai_predictions").update({ match_date: tomorrowStr }).in("id", idsToSetTomorrow);
        }

        // Re-fetch after rescue so regenerated set includes rescued rows
        const { data: refetched } = await supabase
          .from("ai_predictions")
          .select("*")
          .in("match_date", [todayStr, tomorrowStr])
          .in("result_status", ["pending", null]);

        predictions = refetched ?? predictions;
        const refreshedMatchIds = new Set(predictions.map((p: any) => String(p.match_id)));
        missingFixtureIds = fixtureIds.filter((id) => !refreshedMatchIds.has(String(id)));
      }

      // 2) Insert remaining missing fixtures as locked placeholders (chunked)
      if (missingFixtureIds.length > 0) {
        console.log(`Missing fixtures in DB after rescue: ${missingFixtureIds.length}. Inserting locked placeholders...`);

        const CHUNK = 100;
        for (let i = 0; i < missingFixtureIds.length; i += CHUNK) {
          const chunk = missingFixtureIds.slice(i, i + CHUNK);

          const inserts = chunk.map((id) => {
            const f = fixtureById.get(String(id));
            const matchDate = expectedDateByFixtureId.get(String(id)) ?? todayStr;
            const matchTime = String(f?.fixture?.date ?? "").split("T")[1]?.slice(0, 5) ?? null;

            return {
              match_id: String(id),
              league: f?.league?.name ?? null,
              home_team: f?.teams?.home?.name ?? "Home",
              away_team: f?.teams?.away?.name ?? "Away",
              match_date: matchDate,
              match_time: matchTime,
              result_status: "pending",
              is_premium: false,
              is_locked: true,
              prediction: "X",
              predicted_score: null,
              confidence: 50,
              home_win: 33,
              draw: 34,
              away_win: 33,
              risk_level: "high",
              analysis: "Pending data from API-Football (placeholder inserted during regeneration).",
            };
          });

          const { data: insertedRows, error: insertError } = await supabase
            .from("ai_predictions")
            .insert(inserts)
            .select("*");

          if (insertError) {
            console.error("Error inserting missing fixtures:", insertError);
          } else if (insertedRows?.length) {
            predictions = [...predictions, ...insertedRows];
          }
        }
      }
    }

    if (!predictions || predictions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No predictions found to regenerate for today/tomorrow", updated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${predictions.length} predictions to regenerate (today + tomorrow)`);
    console.log(`Matches will be recalculated using NEW algorithm - no fallback to old values`);

    // Build pseudo-form from TeamStats (avoids 2 extra API calls per match)
    const buildPseudoFormFromStats = (stats: TeamStats | null): FormMatch[] => {
      if (!stats?.form) return [];

      const avgScored = stats.played > 0 ? stats.goalsFor / stats.played : 1.0;
      const avgConceded = stats.played > 0 ? stats.goalsAgainst / stats.played : 1.0;

      const recent = stats.form.slice(-3).split("");
      return recent.map((ch) => {
        const result = ch === "W" ? "W" : ch === "L" ? "L" : "D";
        return {
          result,
          goalsFor: avgScored,
          goalsAgainst: avgConceded,
          isHome: true,
        };
      });
    };

    let updated = 0;
    let locked = 0;
    let skipped = 0; // Track matches skipped due to already having results
    const errors: string[] = [];

    // Process each prediction
    for (const pred of predictions) {
      try {
        const fixtureId = pred.match_id;
        
        const fixtureIdStr = String(fixtureId);

        // Prefer fixture list lookup (2 calls total per run). Fallback to by-id fetch with retry if needed.
        let fixture = fixtureById.get(fixtureIdStr);
        if (!fixture) {
          const byId = await fetchJsonWithRetry(
            `${API_FOOTBALL_URL}/fixtures?id=${fixtureIdStr}`,
            apiKey,
            { retries: 4, baseDelayMs: 800 }
          );
          fixture = byId?.response?.[0];
        }

        if (!fixture) {
          await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Not found in API`);
          locked++;
          console.log(`Fixture ${fixtureIdStr}: Not found in API - marked as locked (pending data)`);
          continue;
        }

        const homeTeamId = fixture.teams?.home?.id;
        const awayTeamId = fixture.teams?.away?.id;
        const homeTeamName = fixture.teams?.home?.name || pred.home_team;
        const awayTeamName = fixture.teams?.away?.name || pred.away_team;
        const leagueId = fixture.league?.id;
        const season = fixture.league?.season || new Date().getFullYear();

        if (!homeTeamId || !awayTeamId || !leagueId) {
          await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Invalid fixture data`);
          locked++;
          errors.push(`Fixture ${fixtureIdStr}: Invalid fixture data - marked as locked`);
          continue;
        }

        // Fetch core data (STRICT: if we can't fetch, we lock & overwrite neutral values; never keep old output)
        // NOTE: We intentionally avoid calling fetchTeamForm here to keep API usage under rate limits.
        const homeStats = await fetchTeamStats(homeTeamId, leagueId, season, apiKey);
        const awayStats = await fetchTeamStats(awayTeamId, leagueId, season, apiKey);
        const h2h = await fetchH2H(homeTeamId, awayTeamId, apiKey, 3);

        if (!homeStats || !awayStats) {
          await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Missing team stats (rate limit or no data)`);
          locked++;
          continue;
        }

        const homeForm = buildPseudoFormFromStats(homeStats);
        const awayForm = buildPseudoFormFromStats(awayStats);

        if (homeForm.length === 0 && awayForm.length === 0) {
          await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Insufficient form data`);
          locked++;
          continue;
        }

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
            is_locked: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pred.id);

        if (updateError) {
          errors.push(`Fixture ${fixtureIdStr}: Update failed - ${updateError.message}`);
          continue;
        }

        updated++;
        console.log(
          `Updated ${homeTeamName} vs ${awayTeamName}: ${newPrediction.prediction} (${newPrediction.home_win}/${newPrediction.draw}/${newPrediction.away_win})`
        );
        
      } catch (e) {
        // On error, mark as locked
        await markPredictionLocked(
          supabase,
          pred.id,
          `Fixture ${pred.match_id}: ${e instanceof Error ? e.message : "Unknown error"}`
        );
        locked++;
        errors.push(`Fixture ${pred.match_id}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }
    
    // After regeneration, assign tiers ONLY for unlocked predictions
    // Locked predictions (no data) should NOT receive tier assignments based on old data
    console.log(`\n=== REGENERATION SUMMARY ===`);
    console.log(`Total processed: ${predictions.length}`);
    console.log(`Successfully updated with NEW algorithm: ${updated}`);
    console.log(`Locked (pending API data): ${locked}`);
    console.log(`Skipped (already won/lost): ${skipped}`);
    
    console.log("\n=== Assigning tiers based on NEW confidence values (unlocked only)... ===");
    const tierResult = await assignTiers(supabase, todayStr, tomorrowStr);
    
    return new Response(
      JSON.stringify({
        message: `Regeneration complete using NEW weighted algorithm`,
        algorithm: "Form 40%, Quality 25%, Squad 15%, Home 10%, H2H 10%",
        dates: { today: todayStr, tomorrow: tomorrowStr },
        total: predictions.length,
        updated,
        locked,
        skipped,
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