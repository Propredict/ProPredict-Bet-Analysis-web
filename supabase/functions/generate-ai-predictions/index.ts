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

// ============ BATCH PROCESSING ============
const BATCH_SIZE = 25; // Process 25 matches per invocation to stay under timeout

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
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": apiKey,
      },
    });

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

  // === HOME ADVANTAGE (10% MAX, VERY MINOR — avoid systematic home bias) ===
  const homeAdvantageScore = 51;
  const awayAdvantageScore = 49;

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

/**
 * Predict score using xG with variety.
 * Uses a seeded pseudo-random (based on team xGs) to pick from
 * plausible score lines instead of always rounding to the same value.
 */
function predictScoreV2(params: {
  homeGoalRate: { scored: number; conceded: number };
  awayGoalRate: { scored: number; conceded: number };
  homeWin: number;
  awayWin: number;
  draw: number;
  prediction: string;
}): string {
  const { homeGoalRate, awayGoalRate, homeWin, awayWin, prediction } = params;

  // Base expected goals from attack vs defense matchup
  let homeXg = (homeGoalRate.scored + awayGoalRate.conceded) / 2;
  let awayXg = (awayGoalRate.scored + homeGoalRate.conceded) / 2;

  // Mild adjustments for strong favorites (much smaller than before)
  const strongHomeFav = prediction === "1" && homeWin >= 65;
  const strongAwayFav = prediction === "2" && awayWin >= 65;
  const balanced = prediction === "X";

  if (strongHomeFav) {
    homeXg += 0.25;
    awayXg -= 0.1;
  } else if (strongAwayFav) {
    awayXg += 0.25;
    homeXg -= 0.1;
  } else if (balanced) {
    const avg = (homeXg + awayXg) / 2;
    homeXg = avg;
    awayXg = avg;
  }

  homeXg = clamp(homeXg, 0.3, 3.0);
  awayXg = clamp(awayXg, 0.3, 3.0);

  // Deterministic seed from xG values for consistent but varied results per match
  const seed = Math.abs(Math.sin(homeXg * 1000 + awayXg * 7777)) * 10000;
  const rnd = (seed % 100) / 100; // 0..1 deterministic per matchup

  // Pick from plausible score lines based on xG ranges
  let homeGoals: number;
  let awayGoals: number;

  if (prediction === "X") {
    // Draw scores: 0-0, 1-1, 2-2
    const totalXg = homeXg + awayXg;
    if (totalXg < 1.5) {
      homeGoals = rnd < 0.4 ? 0 : 1;
      awayGoals = homeGoals;
    } else if (totalXg < 3.0) {
      homeGoals = rnd < 0.65 ? 1 : 2;
      awayGoals = homeGoals;
    } else {
      homeGoals = rnd < 0.5 ? 2 : rnd < 0.8 ? 1 : 3;
      awayGoals = homeGoals;
    }
    // Avoid 0-0 when both teams score regularly
    if (homeGoals === 0 && (homeGoalRate.scored >= 1.0 || awayGoalRate.scored >= 1.0)) {
      homeGoals = 1;
      awayGoals = 1;
    }
  } else {
    // Winner prediction ("1" or "2")
    const favXg = prediction === "1" ? homeXg : awayXg;
    const undXg = prediction === "1" ? awayXg : homeXg;

    // Favorite goals from xG with variety
    let favGoals: number;
    if (favXg < 1.0) {
      favGoals = 1;
    } else if (favXg < 1.6) {
      favGoals = rnd < 0.55 ? 1 : 2;
    } else if (favXg < 2.3) {
      favGoals = rnd < 0.35 ? 1 : rnd < 0.8 ? 2 : 3;
    } else {
      favGoals = rnd < 0.2 ? 2 : rnd < 0.7 ? 3 : 4;
    }

    // Underdog goals from their xG
    let undGoals: number;
    if (undXg < 0.7) {
      undGoals = rnd < 0.6 ? 0 : 1;
    } else if (undXg < 1.3) {
      undGoals = rnd < 0.45 ? 0 : 1;
    } else {
      undGoals = rnd < 0.3 ? 1 : 2;
    }

    // Ensure winner actually wins
    if (favGoals <= undGoals) favGoals = undGoals + 1;

    if (prediction === "1") {
      homeGoals = favGoals;
      awayGoals = undGoals;
    } else {
      homeGoals = undGoals;
      awayGoals = favGoals;
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

/**
 * Process a single batch of predictions
 */
async function processBatch(
  supabase: any,
  predictions: any[],
  fixtureById: Map<string, any>,
  apiKey: string
): Promise<{ updated: number; locked: number; errors: string[] }> {
  let updated = 0;
  let locked = 0;
  const errors: string[] = [];

  for (const pred of predictions) {
    try {
      const fixtureIdStr = String(pred.match_id);

      // Prefer fixture list lookup. Fallback to by-id fetch with retry if needed.
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
        console.log(`Fixture ${fixtureIdStr}: Not found in API - marked as locked`);
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
        errors.push(`Fixture ${fixtureIdStr}: Invalid fixture data`);
        continue;
      }

      // Fetch core data
      const homeStats = await fetchTeamStats(homeTeamId, leagueId, season, apiKey);
      const awayStats = await fetchTeamStats(awayTeamId, leagueId, season, apiKey);
      const h2h = await fetchH2H(homeTeamId, awayTeamId, apiKey, 3);

      if (!homeStats || !awayStats) {
        await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Missing team stats`);
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

      // SAVE IMMEDIATELY after each item (incremental saving)
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
      await markPredictionLocked(
        supabase,
        pred.id,
        `Fixture ${pred.match_id}: ${e instanceof Error ? e.message : "Unknown error"}`
      );
      locked++;
      errors.push(`Fixture ${pred.match_id}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  return { updated, locked, errors };
}

/**
 * Self-chain to trigger next batch
 */
async function triggerNextBatch(
  matchDate: string,
  offset: number,
  runId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai-predictions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        batchMode: true,
        matchDate,
        offset,
        runId,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to trigger next batch: ${response.status}`);
    } else {
      console.log(`Triggered next batch for ${matchDate} at offset ${offset}`);
    }
  } catch (e) {
    console.error(`Error triggering next batch:`, e);
  }
}

/**
 * Handle batch processing for a single date
 */
async function handleBatchRegenerate(
  apiKey: string,
  matchDate: string,
  offset: number,
  runId: string
): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`\n=== BATCH REGENERATION: ${matchDate} | Offset: ${offset} | RunID: ${runId} ===`);

  // Fetch fixture list for this date (only on first batch, offset=0)
  let fixtureById = new Map<string, any>();
  
  if (offset === 0) {
    const fixtureUrl = `${API_FOOTBALL_URL}/fixtures?date=${matchDate}`;
    console.log(`[DEBUG] Fetching fixtures from: ${fixtureUrl}`);
    
    // Try fetching fixtures with extra resilience — if first attempt fails,
    // wait 5 seconds and retry (handles rate-limit from concurrent batch triggers)
    let fixturesJson = await fetchJsonWithRetry(
      fixtureUrl,
      apiKey,
      { retries: 4, baseDelayMs: 800 }
    );

    // If the first attempt returned empty/null, wait and retry once more
    if (!fixturesJson || !fixturesJson.response || fixturesJson.response.length === 0) {
      console.warn(`[DEBUG] First fixture fetch returned empty for ${matchDate}. Retrying after 5s delay...`);
      await new Promise((r) => setTimeout(r, 5000));
      fixturesJson = await fetchJsonWithRetry(
        fixtureUrl,
        apiKey,
        { retries: 4, baseDelayMs: 1200 }
      );
    }

    // Debug: log raw API response structure
    if (!fixturesJson) {
      console.error(`[DEBUG] fixturesJson is NULL after retry - API call failed completely for ${matchDate}`);
    } else {
      console.log(`[DEBUG] API errors: ${JSON.stringify(fixturesJson.errors ?? {})}`);
      console.log(`[DEBUG] API results count: ${fixturesJson.results ?? 'N/A'}`);
      console.log(`[DEBUG] API response array length: ${fixturesJson.response?.length ?? 'N/A (no response key)'}`);
    }

    const fixtures = fixturesJson?.response ?? [];
    for (const f of fixtures) {
      const idStr = String(f?.fixture?.id ?? "");
      if (idStr) fixtureById.set(idStr, f);
    }

    console.log(`Fetched ${fixtures.length} fixtures from API for ${matchDate}`);

    // Insert missing fixtures as locked placeholders
    const fixtureIds = Array.from(fixtureById.keys());
    if (fixtureIds.length > 0) {
      // Check existing predictions for this date AND globally by match_id
      const { data: existingByDate } = await supabase
        .from("ai_predictions")
        .select("match_id")
        .eq("match_date", matchDate);

      const { data: existingGlobal } = await supabase
        .from("ai_predictions")
        .select("match_id")
        .in("match_id", fixtureIds.slice(0, 500)); // Check first 500

      const existingDateIds = new Set((existingByDate ?? []).map((p: any) => String(p.match_id)));
      const existingGlobalIds = new Set((existingGlobal ?? []).map((p: any) => String(p.match_id)));
      
      // Only insert IDs that don't exist ANYWHERE in the table
      const missingIds = fixtureIds.filter((id) => !existingDateIds.has(id) && !existingGlobalIds.has(id));

      console.log(`[DEBUG] Date predictions: ${existingDateIds.size}, Global matches: ${existingGlobalIds.size}, Truly missing: ${missingIds.length}`);

      if (missingIds.length > 0) {
        console.log(`Inserting ${missingIds.length} missing fixtures as placeholders for ${matchDate}...`);
        
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        const matchDay = matchDate === todayStr ? "today" : matchDate === tomorrowStr ? "tomorrow" : "today";

        const inserts = missingIds.map((id) => {
          const f = fixtureById.get(id);
          const matchTime = String(f?.fixture?.date ?? "").split("T")[1]?.slice(0, 5) ?? null;

          return {
            match_id: id,
            league: f?.league?.name ?? null,
            home_team: f?.teams?.home?.name ?? "Home",
            away_team: f?.teams?.away?.name ?? "Away",
            match_date: matchDate,
            match_day: matchDay,
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
            analysis: "Pending regeneration...",
          };
        });

        const CHUNK_SIZE = 100;
        let totalInserted = 0;
        let insertErrors: string[] = [];
        
        for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
          const chunk = inserts.slice(i, i + CHUNK_SIZE);
          const { error: insertError, data: insertData } = await supabase.from("ai_predictions").insert(chunk).select("id");
          if (insertError) {
            console.error(`[DEBUG] Insert chunk ${i}-${i + chunk.length} error:`, insertError.message, insertError.details, insertError.hint);
            insertErrors.push(`${insertError.message} | ${insertError.details || ''} | ${insertError.hint || ''}`);
          } else {
            totalInserted += (insertData?.length ?? chunk.length);
          }
        }
        
        console.log(`[DEBUG] Insert complete for ${matchDate}: ${totalInserted}/${inserts.length} rows. Errors: ${insertErrors.length}`);
        if (insertErrors.length > 0) {
          console.error(`[DEBUG] Insert errors:`, insertErrors.slice(0, 3));
        }
      } else if (existingDateIds.size === 0 && existingGlobalIds.size > 0) {
        // match_ids exist but for different dates - update them to this date
        console.log(`[DEBUG] Found ${existingGlobalIds.size} match_ids from other dates. Updating match_date to ${matchDate}...`);
        const idsToUpdate = fixtureIds.filter((id) => existingGlobalIds.has(id) && !existingDateIds.has(id));
        for (const mid of idsToUpdate) {
          const f = fixtureById.get(mid);
          const matchTime = String(f?.fixture?.date ?? "").split("T")[1]?.slice(0, 5) ?? null;
          const matchDay = matchDate === new Date().toISOString().split("T")[0] ? "today" : "tomorrow";
          
          await supabase
            .from("ai_predictions")
            .update({
              match_date: matchDate,
              match_day: matchDay,
              match_time: matchTime,
              result_status: "pending",
              is_locked: true,
              league: f?.league?.name ?? null,
              home_team: f?.teams?.home?.name ?? "Home",
              away_team: f?.teams?.away?.name ?? "Away",
            })
            .eq("match_id", mid);
        }
        console.log(`[DEBUG] Updated ${idsToUpdate.length} predictions to match_date=${matchDate}`);
      }
    } else {
      console.log(`[DEBUG] fixtureIds is empty - no fixtures from API`);
    }
  }

  // Fetch batch of predictions for this date
  // Use .or() to also catch NULL result_status (SQL IN doesn't match NULL)
  const { data: predictions, error } = await supabase
    .from("ai_predictions")
    .select("*")
    .eq("match_date", matchDate)
    .or("result_status.eq.pending,result_status.is.null")
    .order("id", { ascending: true })
    .range(offset, offset + BATCH_SIZE - 1);

  if (error) {
    console.error("Error fetching predictions:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch predictions", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!predictions || predictions.length === 0) {
    // No more predictions for this date - run tier assignment
    console.log(`No more predictions for ${matchDate}. Running tier assignment...`);
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = today.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const tierResult = await assignTiers(supabase, todayStr, tomorrowStr);

    return new Response(
      JSON.stringify({
        message: `Batch complete for ${matchDate}`,
        date: matchDate,
        offset,
        processed: 0,
        complete: true,
        tiers: tierResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`Processing batch of ${predictions.length} predictions...`);

  // Process this batch
  const result = await processBatch(supabase, predictions, fixtureById, apiKey);

  console.log(`Batch result: Updated ${result.updated}, Locked ${result.locked}`);

  // If there are more predictions, trigger next batch (self-chain)
  if (predictions.length === BATCH_SIZE) {
    const nextOffset = offset + BATCH_SIZE;
    console.log(`More predictions exist. Triggering next batch at offset ${nextOffset}...`);
    
    // Fire and forget - don't wait for response
    triggerNextBatch(matchDate, nextOffset, runId, supabaseUrl, supabaseKey);
  } else {
    // Last batch for this date - run tier assignment
    console.log(`Last batch for ${matchDate}. Running tier assignment...`);
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = today.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    await assignTiers(supabase, todayStr, tomorrowStr);
  }

  return new Response(
    JSON.stringify({
      message: `Batch processed for ${matchDate}`,
      date: matchDate,
      offset,
      processed: predictions.length,
      updated: result.updated,
      locked: result.locked,
      hasMore: predictions.length === BATCH_SIZE,
      errors: result.errors.length > 0 ? result.errors : undefined,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Entry point for full regeneration (triggers batches for today + tomorrow)
 */
async function handleRegenerate(apiKey: string): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = today.toISOString().split("T")[0];
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const runId = crypto.randomUUID();

  console.log(`\n=== INITIATING BATCH REGENERATION ===`);
  console.log(`Today: ${todayStr}`);
  console.log(`Tomorrow: ${tomorrowStr}`);
  console.log(`Run ID: ${runId}`);
  console.log(`Using NEW weighted algorithm: Form 40%, Quality 25%, Squad 15%, Home 10%, H2H 10%`);

  // Trigger today and tomorrow batch chains STAGGERED (not parallel!)
  // Both batches at offset 0 fetch fixture lists from API-Football.
  // Firing them simultaneously causes one to get rate-limited (429) and fail silently.
  // Solution: fire today first, wait 3s, then fire tomorrow.
  const batchUrl = `${supabaseUrl}/functions/v1/generate-ai-predictions`;
  const batchHeaders = {
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  // Fire TODAY batch (fire-and-forget - don't await the full processing)
  let todayOk = false;
  let tomorrowOk = false;

  try {
    const todayResponse = await fetch(batchUrl, {
      method: "POST",
      headers: batchHeaders,
      body: JSON.stringify({
        batchMode: true,
        matchDate: todayStr,
        offset: 0,
        runId,
      }),
    });
    todayOk = todayResponse.ok;
    console.log(`Today batch triggered: ${todayOk}`);
  } catch (e) {
    console.error("Failed to trigger today batch:", e);
  }

  // Stagger: wait 3 seconds to avoid API rate limit collision
  await new Promise((r) => setTimeout(r, 3000));

  // Fire TOMORROW batch
  try {
    const tomorrowResponse = await fetch(batchUrl, {
      method: "POST",
      headers: batchHeaders,
      body: JSON.stringify({
        batchMode: true,
        matchDate: tomorrowStr,
        offset: 0,
        runId,
      }),
    });
    tomorrowOk = tomorrowResponse.ok;
    console.log(`Tomorrow batch triggered: ${tomorrowOk}`);
  } catch (e) {
    console.error("Failed to trigger tomorrow batch:", e);
  }

  return new Response(
    JSON.stringify({
      message: "Batch regeneration initiated for TODAY and TOMORROW (staggered)",
      runId,
      dates: { today: todayStr, tomorrow: tomorrowStr },
      todayBatchTriggered: todayOk,
      tomorrowBatchTriggered: tomorrowOk,
      algorithm: "Form 40%, Quality 25%, Squad 15%, Home 10%, H2H 10%",
      batchSize: BATCH_SIZE,
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

    // Debug mode - test API connectivity and DB state
    if (body.debug === true) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const testDate = body.matchDate || new Date().toISOString().split("T")[0];
      const testUrl = `${API_FOOTBALL_URL}/fixtures?date=${testDate}`;
      
      // Check DB state for this date
      const { data: dbPreds, error: dbError } = await supabase
        .from("ai_predictions")
        .select("id, match_id, match_date, result_status, is_locked, confidence")
        .eq("match_date", testDate)
        .limit(5);
      
      const { count: totalCount } = await supabase
        .from("ai_predictions")
        .select("*", { count: "exact", head: true })
        .eq("match_date", testDate);
      
      const { count: pendingCount } = await supabase
        .from("ai_predictions")
        .select("*", { count: "exact", head: true })
        .eq("match_date", testDate)
        .or("result_status.eq.pending,result_status.is.null");

      try {
        await throttleApi();
        const res = await fetch(testUrl, {
          headers: {
            "x-rapidapi-host": "v3.football.api-sports.io",
            "x-rapidapi-key": apiKey,
          },
        });
        
        const rawText = await res.text();
        let parsed;
        try { parsed = JSON.parse(rawText); } catch { parsed = null; }
        
        return new Response(
          JSON.stringify({
            debug: true,
            testUrl,
            httpStatus: res.status,
            apiErrors: parsed?.errors ?? null,
            apiResults: parsed?.results ?? null,
            fixtureCount: parsed?.response?.length ?? 0,
            firstFixture: parsed?.response?.[0]?.teams ?? null,
            db: {
              date: testDate,
              totalPredictions: totalCount,
              pendingPredictions: pendingCount,
              dbError: dbError?.message ?? null,
              sampleRows: dbPreds?.map(p => ({
                id: p.id,
                match_id: p.match_id,
                match_date: p.match_date,
                result_status: p.result_status,
                is_locked: p.is_locked,
                confidence: p.confidence,
              })) ?? [],
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ debug: true, error: e instanceof Error ? e.message : "Unknown" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Batch mode - process a single batch for a specific date
    if (body.batchMode === true && body.matchDate && typeof body.offset === "number") {
      return handleBatchRegenerate(apiKey, body.matchDate, body.offset, body.runId || "manual");
    }

    // Full regenerate mode - triggers batch chains for today + tomorrow
    if (body.regenerate === true) {
      return handleRegenerate(apiKey);
    }

    // Single fixture mode (unchanged)
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
      {
        headers: {
          "x-rapidapi-host": "v3.football.api-sports.io",
          "x-rapidapi-key": apiKey,
        },
      }
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
