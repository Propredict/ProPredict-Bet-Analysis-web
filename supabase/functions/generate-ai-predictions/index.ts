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

// ============ MINIMUM DATA THRESHOLDS ============
const MIN_SEASON_MATCHES = 5;       // Teams with fewer matches get capped confidence
const MIN_SEASON_CONFIDENCE_CAP = 62; // Max confidence when team has < MIN_SEASON_MATCHES

// ============ QUALITY LEAGUE IDS (API-Football) ============
// Only these leagues can produce PREMIUM (≥85%) predictions
// Top 20 leagues with most reliable data and predictable patterns
const QUALITY_LEAGUE_IDS = new Set([
  39,   // Premier League (England)
  140,  // La Liga (Spain)
  135,  // Serie A (Italy)
  78,   // Bundesliga (Germany)
  61,   // Ligue 1 (France)
  94,   // Primeira Liga (Portugal)
  88,   // Eredivisie (Netherlands)
  144,  // Jupiler Pro League (Belgium)
  203,  // Super Lig (Turkey)
  179,  // Scottish Premiership
  235,  // Russian Premier League
  218,  // Austrian Bundesliga
  169,  // Super League (Switzerland)
  113,  // Greek Super League
  106,  // Ekstraklasa (Poland)
  119,  // Danish Superliga
  103,  // Eliteserien (Norway)
  113,  // Allsvenskan (Sweden)
  2,    // UEFA Champions League
  3,    // UEFA Europa League
  848,  // UEFA Conference League
  1,    // World Cup
  4,    // Euro Championship
  253,  // MLS (USA)
  71,   // Serie A (Brazil)
  128,  // Liga MX (Mexico)
  262,  // Liga Profesional (Argentina)
  307,  // Saudi Pro League
  188,  // J1 League (Japan)
  292,  // K League 1 (South Korea)
  333,  // A-League (Australia)
  40,   // Championship (England)
  141,  // La Liga 2 (Spain)
  79,   // 2. Bundesliga (Germany)
  136,  // Serie B (Italy)
  62,   // Ligue 2 (France)
]);

// ============ WEIGHTING CONSTANTS ============
const WEIGHT_FORM = 0.35;         // 35% - Recent form (last 5 real matches)
const WEIGHT_QUALITY = 0.25;      // 25% - Team quality
const WEIGHT_SQUAD = 0.15;        // 15% - Squad strength / injuries
const WEIGHT_HOME = 0.10;         // 10% - Home advantage (MAX)
const WEIGHT_H2H = 0.15;          // 15% - Head-to-Head history (increased from 10%)

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
  // Home/Away splits
  home: { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
  away: { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
  // Goals average
  goalsForAvg: number;
  goalsAgainstAvg: number;
  homeGoalsForAvg: number;
  homeGoalsAgainstAvg: number;
  awayGoalsForAvg: number;
  awayGoalsAgainstAvg: number;
  // Clean sheets & failed to score
  cleanSheets: { home: number; away: number; total: number };
  failedToScore: { home: number; away: number; total: number };
  // Penalty stats
  penalty: { scored: number; missed: number; total: number };
  // Biggest streaks
  biggestStreak: { wins: number; draws: number; losses: number };
  biggestWin: string | null;   // e.g. "5-0"
  biggestLoss: string | null;  // e.g. "0-4"
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
const topScorersCache = new Map<string, { name: string; team: string; goals: number }[]>();
const injuriesCache = new Map<string, InjuryInfo[]>();

interface InjuryInfo {
  name: string;
  team: string;
  type: string;
  reason: string;
}

interface TopPlayer {
  name: string;
  team: string;
  goals: number;
  assists: number;
}

/**
 * Fetch team's last N matches form
 */
async function fetchTeamForm(teamId: number, apiKey: string, count: number = 5): Promise<FormMatch[]> {
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
async function fetchH2H(homeTeamId: number, awayTeamId: number, apiKey: string, count: number = 5): Promise<H2HMatch[]> {
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
      // Home/Away splits
      home: {
        played: stats.fixtures?.played?.home ?? 0,
        wins: stats.fixtures?.wins?.home ?? 0,
        draws: stats.fixtures?.draws?.home ?? 0,
        losses: stats.fixtures?.loses?.home ?? 0,
        goalsFor: stats.goals?.for?.total?.home ?? 0,
        goalsAgainst: stats.goals?.against?.total?.home ?? 0,
      },
      away: {
        played: stats.fixtures?.played?.away ?? 0,
        wins: stats.fixtures?.wins?.away ?? 0,
        draws: stats.fixtures?.draws?.away ?? 0,
        losses: stats.fixtures?.loses?.away ?? 0,
        goalsFor: stats.goals?.for?.total?.away ?? 0,
        goalsAgainst: stats.goals?.against?.total?.away ?? 0,
      },
      // Goals average
      goalsForAvg: parseFloat(stats.goals?.for?.average?.total ?? "0"),
      goalsAgainstAvg: parseFloat(stats.goals?.against?.average?.total ?? "0"),
      homeGoalsForAvg: parseFloat(stats.goals?.for?.average?.home ?? "0"),
      homeGoalsAgainstAvg: parseFloat(stats.goals?.against?.average?.home ?? "0"),
      awayGoalsForAvg: parseFloat(stats.goals?.for?.average?.away ?? "0"),
      awayGoalsAgainstAvg: parseFloat(stats.goals?.against?.average?.away ?? "0"),
      // Clean sheets & failed to score
      cleanSheets: {
        home: stats.clean_sheet?.home ?? 0,
        away: stats.clean_sheet?.away ?? 0,
        total: stats.clean_sheet?.total ?? 0,
      },
      failedToScore: {
        home: stats.failed_to_score?.home ?? 0,
        away: stats.failed_to_score?.away ?? 0,
        total: stats.failed_to_score?.total ?? 0,
      },
      // Penalty stats
      penalty: {
        scored: stats.penalty?.scored?.total ?? 0,
        missed: stats.penalty?.missed?.total ?? 0,
        total: (stats.penalty?.scored?.total ?? 0) + (stats.penalty?.missed?.total ?? 0),
      },
      // Biggest streaks
      biggestStreak: {
        wins: stats.biggest?.streak?.wins ?? 0,
        draws: stats.biggest?.streak?.draws ?? 0,
        losses: stats.biggest?.streak?.loses ?? 0,
      },
      biggestWin: stats.biggest?.wins?.home && stats.biggest?.wins?.away
        ? (parseInt(stats.biggest.wins.home?.split("-")?.[0] ?? "0") > parseInt(stats.biggest.wins.away?.split("-")?.[0] ?? "0")
          ? stats.biggest.wins.home : stats.biggest.wins.away) : (stats.biggest?.wins?.home || stats.biggest?.wins?.away || null),
      biggestLoss: stats.biggest?.loses?.home && stats.biggest?.loses?.away
        ? (parseInt(stats.biggest.loses.home?.split("-")?.[1] ?? "0") > parseInt(stats.biggest.loses.away?.split("-")?.[1] ?? "0")
          ? stats.biggest.loses.home : stats.biggest.loses.away) : (stats.biggest?.loses?.home || stats.biggest?.loses?.away || null),
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
 * Calculate form score (0-100) from last 5 matches using weighted recency.
 * Most recent match has highest weight, older matches decay.
 * - Win=3, Draw=1, Loss=0
 * - Goal impact is a small stabilizer
 */
function calculateFormScore(form: FormMatch[]): number {
  if (form.length === 0) return 50;

  const matches = form.slice(0, 5);
  let weightedPoints = 0;
  let weightSum = 0;
  let gf = 0;
  let ga = 0;

  for (let i = 0; i < matches.length; i++) {
    const weight = 1.0 - (i * 0.12); // Most recent=1.0, 5th=0.52
    const pts = matches[i].result === "W" ? 3 : matches[i].result === "D" ? 1 : 0;
    weightedPoints += pts * weight;
    weightSum += 3 * weight;
    gf += matches[i].goalsFor;
    ga += matches[i].goalsAgainst;
  }

  const pointsScore = (weightedPoints / weightSum) * 100;
  const goalDiff = gf - ga;
  const gdScore = Math.max(0, Math.min(100, 50 + goalDiff * 6));

  return Math.round(pointsScore * 0.75 + gdScore * 0.25);
}

/**
 * Average goals (scored/conceded) from last 5 matches.
 */
function calculateGoalRate(form: FormMatch[]): { scored: number; conceded: number } {
  if (form.length === 0) return { scored: 1.0, conceded: 1.0 };

  const matches = form.slice(0, 5);
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
 * Poisson probability: P(X=k) = (lambda^k * e^-lambda) / k!
 */
function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial;
}

/**
 * Calculate Poisson-based goal probabilities for Over/Under and BTTS markets.
 */
function poissonGoalMarkets(homeXg: number, awayXg: number): {
  over15: number; over25: number; over35: number;
  under15: number; under25: number; under35: number;
  bttsYes: number; bttsNo: number;
  mostLikelyScore: string;
  expectedTotalGoals: number;
} {
  const maxGoals = 6;
  let scoreProbs: number[][] = [];
  
  for (let h = 0; h <= maxGoals; h++) {
    scoreProbs[h] = [];
    for (let a = 0; a <= maxGoals; a++) {
      scoreProbs[h][a] = poissonPmf(homeXg, h) * poissonPmf(awayXg, a);
    }
  }

  let over15 = 0, over25 = 0, over35 = 0;
  let bttsYes = 0;
  let bestProb = 0;
  let bestScore = "1-0";

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = scoreProbs[h][a];
      const total = h + a;
      
      if (total > 1) over15 += p;
      if (total > 2) over25 += p;
      if (total > 3) over35 += p;
      if (h > 0 && a > 0) bttsYes += p;
      
      if (p > bestProb) {
        bestProb = p;
        bestScore = `${h}-${a}`;
      }
    }
  }

  return {
    over15: Math.round(over15 * 100),
    over25: Math.round(over25 * 100),
    over35: Math.round(over35 * 100),
    under15: Math.round((1 - over15) * 100),
    under25: Math.round((1 - over25) * 100),
    under35: Math.round((1 - over35) * 100),
    bttsYes: Math.round(bttsYes * 100),
    bttsNo: Math.round((1 - bttsYes) * 100),
    mostLikelyScore: bestScore,
    expectedTotalGoals: homeXg + awayXg,
  };
}

/**
 * Calculate team quality score (0-100) from season stats.
 * Uses home/away splits, clean sheets, and defensive stability for a richer picture.
 */
function calculateQualityScore(stats: TeamStats | null): number {
  if (!stats || stats.played === 0) return 50;

  const winRate = stats.wins / stats.played;
  const goalDiffPerGame = (stats.goalsFor - stats.goalsAgainst) / stats.played;

  const winScore = winRate * 100;
  const gdScore = Math.max(0, Math.min(100, 50 + goalDiffPerGame * 12));

  // Clean sheet bonus: teams that keep more clean sheets are defensively stronger
  const cleanSheetRate = stats.played > 0 ? stats.cleanSheets.total / stats.played : 0;
  const csBonus = cleanSheetRate * 100; // 0-100

  // Failed to score penalty: teams that fail to score frequently are weaker
  const failedRate = stats.played > 0 ? stats.failedToScore.total / stats.played : 0;
  const ftsDeduction = failedRate * 100; // 0-100

  // Base: 60% win rate + 25% goal diff + 10% clean sheets - 5% failed to score
  return Math.round(
    winScore * 0.60 + gdScore * 0.25 + csBonus * 0.10 + Math.max(0, 50 - ftsDeduction) * 0.05
  );
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
 * Calibrate raw confidence to more realistic probabilities.
 * Uses a mild sigmoid dampening:
 * - Values below 60 stay roughly the same
 * - Values 60-75 get slightly reduced  
 * - Values 75-92 get more aggressively dampened
 * This prevents overconfident predictions while preserving relative ordering.
 */
function calibrateConfidence(raw: number): number {
  if (raw <= 55) return raw;
  
  // Map raw confidence through a dampening curve
  // Anchor points: 60→58, 70→67, 80→75, 85→80, 90→86
  const dampened = 55 + (raw - 55) * 0.82;
  
  // For very high values, apply additional dampening
  if (raw >= 80) {
    const excess = raw - 80;
    return Math.round(clamp(dampened + excess * 0.12, 55, 92));
  }
  
  return Math.round(clamp(dampened, 50, 92));
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
  // Enhanced: use season goals average when available, fallback to form-based
  const homeGoalRate = calculateGoalRate(homeForm);
  const awayGoalRate = calculateGoalRate(awayForm);

  // If we have season stats, use home goals avg for home team and away goals avg for away team
  const homeEffectiveScored = homeStats?.homeGoalsForAvg || homeGoalRate.scored;
  const homeEffectiveConceded = homeStats?.homeGoalsAgainstAvg || homeGoalRate.conceded;
  const awayEffectiveScored = awayStats?.awayGoalsForAvg || awayGoalRate.scored;
  const awayEffectiveConceded = awayStats?.awayGoalsAgainstAvg || awayGoalRate.conceded;

  const homeSquadScore = clamp(
    50 + (homeEffectiveScored - homeEffectiveConceded) * 18,
    0,
    100
  );
  const awaySquadScore = clamp(
    50 + (awayEffectiveScored - awayEffectiveConceded) * 18,
    0,
    100
  );

  // === HOME ADVANTAGE (10% MAX — use real home/away win rates when available) ===
  let homeAdvantageScore = 51;
  let awayAdvantageScore = 49;
  if (homeStats && homeStats.home.played > 2 && awayStats && awayStats.away.played > 2) {
    const homeWinRateAtHome = homeStats.home.wins / homeStats.home.played;
    const awayWinRateAway = awayStats.away.wins / awayStats.away.played;
    // Slight boost based on actual home/away performance, capped to avoid bias
    homeAdvantageScore = clamp(50 + (homeWinRateAtHome - 0.4) * 10, 48, 55);
    awayAdvantageScore = clamp(50 + (awayWinRateAway - 0.3) * 8, 45, 52);
  }

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

  // === GOAL MARKETS (Poisson) ===
  const homeXg = clamp((homeGoalRate.scored + awayGoalRate.conceded) / 2, 0.3, 3.0);
  const awayXg = clamp((awayGoalRate.scored + homeGoalRate.conceded) / 2, 0.3, 3.0);
  const goalMarkets = poissonGoalMarkets(homeXg, awayXg);

  // === BEST PICK SELECTION ===
  // Compare ALL markets: 1X2, Over/Under 2.5, BTTS
  // IMPORTANT: 1X2 is a 3-way market (probs sum to 100), while O/U and BTTS are 2-way (sum to 100).
  // To compare fairly, we normalize 1X2 probs: multiply by 1.33 (100/75 max) so a 75% home win
  // competes fairly against an 80% Over 2.5.
  const max1X2 = Math.max(homeWin, awayWin, draw);
  const normalizedHomeWin = Math.round(homeWin * (100 / (homeWin + Math.max(awayWin, draw))));
  const normalizedAwayWin = Math.round(awayWin * (100 / (awayWin + Math.max(homeWin, draw))));
  const normalizedDraw = Math.round(draw * (100 / (draw + Math.max(homeWin, awayWin))));

  const allPicks: { label: string; prob: number; rawProb: number }[] = [
    { label: "1", prob: normalizedHomeWin, rawProb: homeWin },
    { label: "2", prob: normalizedAwayWin, rawProb: awayWin },
    { label: "X", prob: normalizedDraw, rawProb: draw },
    { label: "Over 2.5", prob: goalMarkets.over25, rawProb: goalMarkets.over25 },
    { label: "Under 2.5", prob: goalMarkets.under25, rawProb: goalMarkets.under25 },
    { label: "BTTS Yes", prob: goalMarkets.bttsYes, rawProb: goalMarkets.bttsYes },
    { label: "BTTS No", prob: goalMarkets.bttsNo, rawProb: goalMarkets.bttsNo },
  ];
  
  // Sort by normalized probability descending, pick the best
  allPicks.sort((a, b) => b.prob - a.prob);
  const prediction = allPicks[0].label;

  // === SCORE ===
  const predictedScore = predictScoreV2({
    homeGoalRate,
    awayGoalRate,
    homeWin,
    awayWin,
    draw,
    prediction: prediction === "1" || prediction === "2" || prediction === "X" ? prediction : 
                (homeWin >= awayWin ? "1" : "2"), // For goal markets, use 1X2 for score alignment
  });

  // === CONFIDENCE (50..92) ===
  // Use the best pick's probability for confidence calculation
  const bestProb = allPicks[0].prob;
  const maxProb = Math.max(homeWin, awayWin, draw, goalMarkets.over25, goalMarkets.under25, goalMarkets.bttsYes, goalMarkets.bttsNo);

  const hasSeasonStats = !!homeStats && !!awayStats && homeStats.played > 0 && awayStats.played > 0;
  const hasMinMatches = hasSeasonStats && homeStats!.played >= MIN_SEASON_MATCHES && awayStats!.played >= MIN_SEASON_MATCHES;
  const isBalanced = bestProb < 45;

  let confidence: number;

  if (isBalanced) {
    confidence = 58 + clamp((45 - bestProb) * 0.2, 0, 4);
  } else {
    const edge = clamp((bestProb - 45) / 25, 0, 1);
    confidence = 60 + edge * 18;

    const premiumBoostEligible = hasMinMatches && bestProb >= 68;
    if (premiumBoostEligible) {
      const boost = clamp((bestProb - 68) / 10, 0, 1) * 12;
      confidence += boost;
    }
  }

  // H2H bonus: if we have 3+ H2H matches and dominant record, small boost
  if (h2h.length >= 3) {
    const h2hDominance = Math.abs(calculateH2HScore(h2h, homeTeamId, awayTeamId) - 50);
    if (h2hDominance >= 30) {
      confidence += 2; // Small boost for clear H2H dominance
    }
  }

  confidence = Math.round(clamp(confidence, 50, 92));

  // Cap confidence for teams with insufficient season data
  if (!hasMinMatches) {
    confidence = Math.min(confidence, MIN_SEASON_CONFIDENCE_CAP);
  } else if (!hasSeasonStats) {
    confidence = Math.min(confidence, 60);
  }

  // === CALIBRATION: dampen overconfident raw scores ===
  // Apply mild sigmoid calibration to prevent inflated confidence
  // This maps raw 50-92 range more conservatively
  confidence = calibrateConfidence(confidence);

  // === RISK ===
  let riskLevel: "low" | "medium" | "high";
  if (confidence >= 72 && bestProb >= 60) riskLevel = "low";
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
  const { homeGoalRate, awayGoalRate, prediction } = params;

  // Calculate xG from attack vs defense matchup
  let homeXg = (homeGoalRate.scored + awayGoalRate.conceded) / 2;
  let awayXg = (awayGoalRate.scored + homeGoalRate.conceded) / 2;

  homeXg = clamp(homeXg, 0.3, 3.0);
  awayXg = clamp(awayXg, 0.3, 3.0);

  // Use Poisson to find most likely score
  const markets = poissonGoalMarkets(homeXg, awayXg);
  let bestScore = markets.mostLikelyScore;

  // Ensure the predicted score matches the prediction direction
  const parts = bestScore.split("-").map(Number);
  let homeGoals = parts[0];
  let awayGoals = parts[1];

  if (prediction === "1" && homeGoals <= awayGoals) {
    // Force a home win score using Poisson-weighted selection
    homeGoals = Math.max(awayGoals + 1, 1);
  } else if (prediction === "2" && awayGoals <= homeGoals) {
    awayGoals = Math.max(homeGoals + 1, 1);
  } else if (prediction === "X" && homeGoals !== awayGoals) {
    const avg = Math.round((homeGoals + awayGoals) / 2);
    homeGoals = avg;
    awayGoals = avg;
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

  if (prediction === "Over 2.5") {
    return `Both attacks are productive enough to expect goals. The model projects Over 2.5 goals as the strongest pick here, with ${homeTeamName} and ${awayTeamName} combining for a high-scoring affair.`;
  }

  if (prediction === "Under 2.5") {
    return `Defensive solidity and low conversion rates point to a tight game. Under 2.5 goals is the model's top pick, with both ${homeTeamName} and ${awayTeamName} struggling to break through consistently.`;
  }

  if (prediction === "BTTS Yes") {
    return `Both ${homeTeamName} and ${awayTeamName} have been finding the net regularly. BTTS Yes stands out as the best-value pick, reflecting both teams' attacking capabilities.`;
  }

  if (prediction === "BTTS No") {
    return `At least one side is expected to keep a clean sheet. BTTS No emerges as the strongest pick, driven by defensive form from ${homeTeamName} or ${awayTeamName}.`;
  }

  const why = Math.abs(formDiff) < 10 && Math.abs(qualityDiff) < 10
    ? `both teams show similar form and quality`
    : `neither side has a clear enough advantage`;

  return `This matchup looks balanced: ${why}. The draw is a realistic outcome (${draw}%) with split win probabilities (${homeWin}% / ${awayWin}%).`;
}

// ============ PREMIUM DEEP ANALYSIS (Last 10 matches + 5 H2H) ============

interface PremiumFormData {
  last10: FormMatch[];
  winsCount: number;
  drawsCount: number;
  lossesCount: number;
  goalsScored: number;
  goalsConceded: number;
  homeRecord: { w: number; d: number; l: number };
  awayRecord: { w: number; d: number; l: number };
  streak: string; // e.g. "W3" or "L2" or "D1"
}

function analyzeLast10(form: FormMatch[]): PremiumFormData {
  let w = 0, d = 0, l = 0, gs = 0, gc = 0;
  const homeRec = { w: 0, d: 0, l: 0 };
  const awayRec = { w: 0, d: 0, l: 0 };

  for (const m of form) {
    gs += m.goalsFor;
    gc += m.goalsAgainst;
    if (m.result === "W") {
      w++;
      if (m.isHome) homeRec.w++; else awayRec.w++;
    } else if (m.result === "D") {
      d++;
      if (m.isHome) homeRec.d++; else awayRec.d++;
    } else {
      l++;
      if (m.isHome) homeRec.l++; else awayRec.l++;
    }
  }

  // Calculate streak
  let streak = "";
  if (form.length > 0) {
    const firstResult = form[0].result;
    let count = 0;
    for (const m of form) {
      if (m.result === firstResult) count++;
      else break;
    }
    streak = `${firstResult}${count}`;
  }

  return {
    last10: form,
    winsCount: w,
    drawsCount: d,
    lossesCount: l,
    goalsScored: gs,
    goalsConceded: gc,
    homeRecord: homeRec,
    awayRecord: awayRec,
    streak,
  };
}

interface H2HSummary {
  matches: H2HMatch[];
  teamAWins: number;
  teamBWins: number;
  draws: number;
  totalGoals: number;
  avgGoalsPerMatch: number;
}

function analyzeH2H(h2h: H2HMatch[], teamAId: number): H2HSummary {
  let aWins = 0, bWins = 0, draws = 0, totalGoals = 0;

  for (const m of h2h) {
    const aGoals = m.homeTeamId === teamAId ? m.homeGoals : m.awayGoals;
    const bGoals = m.homeTeamId === teamAId ? m.awayGoals : m.homeGoals;
    totalGoals += m.homeGoals + m.awayGoals;
    if (aGoals > bGoals) aWins++;
    else if (aGoals < bGoals) bWins++;
    else draws++;
  }

  return {
    matches: h2h,
    teamAWins: aWins,
    teamBWins: bWins,
    draws,
    totalGoals,
    avgGoalsPerMatch: h2h.length > 0 ? totalGoals / h2h.length : 0,
  };
}

function formatFormString(form: FormMatch[]): string {
  return form.map(m => m.result).join("");
}

/**
 * Fetch top scorers for a league (cached per invocation)
 */
async function fetchTopScorers(leagueId: number, season: number, apiKey: string): Promise<TopPlayer[]> {
  const cacheKey = `${leagueId}:${season}`;
  if (topScorersCache.has(cacheKey)) return topScorersCache.get(cacheKey) as any;

  try {
    const url = `${API_FOOTBALL_URL}/players/topscorers?league=${leagueId}&season=${season}`;
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 2, baseDelayMs: 700 });
    if (!data?.response) {
      topScorersCache.set(cacheKey, []);
      return [];
    }
    const players: TopPlayer[] = (data.response || []).slice(0, 20).map((item: any) => ({
      name: item.player?.name || "Unknown",
      team: item.statistics?.[0]?.team?.name || "",
      goals: item.statistics?.[0]?.goals?.total || 0,
      assists: item.statistics?.[0]?.goals?.assists || 0,
    }));
    topScorersCache.set(cacheKey, players as any);
    return players;
  } catch {
    topScorersCache.set(cacheKey, []);
    return [];
  }
}

/**
 * Fetch injuries for a league (cached per invocation)
 */
async function fetchInjuries(leagueId: number, season: number, apiKey: string): Promise<InjuryInfo[]> {
  const cacheKey = `${leagueId}:${season}`;
  if (injuriesCache.has(cacheKey)) return injuriesCache.get(cacheKey)!;

  try {
    const url = `${API_FOOTBALL_URL}/injuries?league=${leagueId}&season=${season}`;
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 2, baseDelayMs: 700 });
    if (!data?.response) {
      injuriesCache.set(cacheKey, []);
      return [];
    }
    const injuries: InjuryInfo[] = (data.response || []).slice(0, 50).map((item: any) => ({
      name: item.player?.name || "Unknown",
      team: item.team?.name || "",
      type: item.player?.type || "Missing",
      reason: item.player?.reason || "Unknown",
    }));
    injuriesCache.set(cacheKey, injuries);
    return injuries;
  } catch {
    injuriesCache.set(cacheKey, []);
    return [];
  }
}

function generatePremiumAnalysis(params: {
  homeTeamName: string;
  awayTeamName: string;
  prediction: string;
  predictedScore: string;
  confidence: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  homeData: PremiumFormData;
  awayData: PremiumFormData;
  h2hSummary: H2HSummary;
  homeStats: TeamStats | null;
  awayStats: TeamStats | null;
  topScorers?: TopPlayer[];
  injuries?: InjuryInfo[];
}): string {
  const {
    homeTeamName, awayTeamName, prediction, predictedScore, confidence,
    homeWin, draw, awayWin, homeData, awayData, h2hSummary, homeStats, awayStats, topScorers, injuries,
  } = params;

  const is1X2 = prediction === "1" || prediction === "2" || prediction === "X";
  const favName = prediction === "1" ? homeTeamName : prediction === "2" ? awayTeamName : prediction;
  const favProb = prediction === "1" ? homeWin : prediction === "2" ? awayWin : prediction === "X" ? draw : 0;

  const sections: string[] = [];

  // 📊 VERDICT
  if (is1X2) {
    sections.push(`📊 VERDICT: ${favName} ${prediction === "X" ? "Draw" : `to win`} (${favProb}% probability, ${confidence}% confidence). Predicted score: ${predictedScore}.`);
  } else {
    sections.push(`📊 VERDICT: ${prediction} is the strongest pick (${confidence}% confidence). Predicted score: ${predictedScore}.`);
  }

  // 🔥 FORM (Last 10)
  const homeFormStr = formatFormString(homeData.last10);
  const awayFormStr = formatFormString(awayData.last10);
  const homeAvgScored = homeData.last10.length > 0 ? (homeData.goalsScored / homeData.last10.length).toFixed(1) : "0";
  const homeAvgConceded = homeData.last10.length > 0 ? (homeData.goalsConceded / homeData.last10.length).toFixed(1) : "0";
  const awayAvgScored = awayData.last10.length > 0 ? (awayData.goalsScored / awayData.last10.length).toFixed(1) : "0";
  const awayAvgConceded = awayData.last10.length > 0 ? (awayData.goalsConceded / awayData.last10.length).toFixed(1) : "0";

  sections.push(`🔥 FORM (Last ${homeData.last10.length} matches):\n• ${homeTeamName}: ${homeFormStr} (${homeData.winsCount}W ${homeData.drawsCount}D ${homeData.lossesCount}L) — ${homeData.goalsScored} goals scored, ${homeData.goalsConceded} conceded (avg ${homeAvgScored}/${homeAvgConceded} per game). Current streak: ${homeData.streak}.\n• ${awayTeamName}: ${awayFormStr} (${awayData.winsCount}W ${awayData.drawsCount}D ${awayData.lossesCount}L) — ${awayData.goalsScored} goals scored, ${awayData.goalsConceded} conceded (avg ${awayAvgScored}/${awayAvgConceded} per game). Current streak: ${awayData.streak}.`);

  // ⚔️ H2H
  if (h2hSummary.matches.length > 0) {
    const h2hScores = h2hSummary.matches.slice(0, 5).map(m => `${m.homeGoals}-${m.awayGoals}`).join(", ");
    sections.push(`⚔️ HEAD-TO-HEAD (Last ${h2hSummary.matches.length}):\n• ${homeTeamName} wins: ${h2hSummary.teamAWins} | Draws: ${h2hSummary.draws} | ${awayTeamName} wins: ${h2hSummary.teamBWins}.\n• Recent scores: ${h2hScores}.\n• Avg goals/match: ${h2hSummary.avgGoalsPerMatch.toFixed(1)}.`);
  }

  // 🏟️ HOME/AWAY SPLITS (enhanced with season stats)
  if (homeStats && awayStats && homeStats.played > 0 && awayStats.played > 0) {
    sections.push(`🏟️ HOME/AWAY SPLITS:\n• ${homeTeamName} at home: ${homeStats.home.wins}W ${homeStats.home.draws}D ${homeStats.home.losses}L (GF ${homeStats.home.goalsFor}, GA ${homeStats.home.goalsAgainst}, avg ${homeStats.homeGoalsForAvg.toFixed(1)}/${homeStats.homeGoalsAgainstAvg.toFixed(1)}).\n• ${awayTeamName} away: ${awayStats.away.wins}W ${awayStats.away.draws}D ${awayStats.away.losses}L (GF ${awayStats.away.goalsFor}, GA ${awayStats.away.goalsAgainst}, avg ${awayStats.awayGoalsForAvg.toFixed(1)}/${awayStats.awayGoalsAgainstAvg.toFixed(1)}).`);
  } else {
    sections.push(`🏟️ HOME/AWAY SPLITS:\n• ${homeTeamName} at home: ${homeData.homeRecord.w}W ${homeData.homeRecord.d}D ${homeData.homeRecord.l}L.\n• ${awayTeamName} away: ${awayData.awayRecord.w}W ${awayData.awayRecord.d}D ${awayData.awayRecord.l}L.`);
  }

  // 📈 SEASON STATS (enhanced with clean sheets, failed to score, penalties)
  if (homeStats && awayStats && homeStats.played > 0 && awayStats.played > 0) {
    const homeWinRate = ((homeStats.wins / homeStats.played) * 100).toFixed(0);
    const awayWinRate = ((awayStats.wins / awayStats.played) * 100).toFixed(0);
    const homeGD = homeStats.goalsFor - homeStats.goalsAgainst;
    const awayGD = awayStats.goalsFor - awayStats.goalsAgainst;
    sections.push(`📈 SEASON STATS:\n• ${homeTeamName}: ${homeStats.wins}W ${homeStats.draws}D ${homeStats.losses}L (${homeWinRate}% win rate), GF ${homeStats.goalsFor} GA ${homeStats.goalsAgainst} (GD ${homeGD > 0 ? "+" : ""}${homeGD}). Avg goals: ${homeStats.goalsForAvg.toFixed(1)} scored, ${homeStats.goalsAgainstAvg.toFixed(1)} conceded.\n• ${awayTeamName}: ${awayStats.wins}W ${awayStats.draws}D ${awayStats.losses}L (${awayWinRate}% win rate), GF ${awayStats.goalsFor} GA ${awayStats.goalsAgainst} (GD ${awayGD > 0 ? "+" : ""}${awayGD}). Avg goals: ${awayStats.goalsForAvg.toFixed(1)} scored, ${awayStats.goalsAgainstAvg.toFixed(1)} conceded.`);

    // 🛡️ DEFENSIVE & ATTACK INSIGHTS
    const defensiveInsights: string[] = [];
    defensiveInsights.push(`• ${homeTeamName}: ${homeStats.cleanSheets.total} clean sheets (${homeStats.cleanSheets.home} home, ${homeStats.cleanSheets.away} away), failed to score ${homeStats.failedToScore.total}x.`);
    defensiveInsights.push(`• ${awayTeamName}: ${awayStats.cleanSheets.total} clean sheets (${awayStats.cleanSheets.home} home, ${awayStats.cleanSheets.away} away), failed to score ${awayStats.failedToScore.total}x.`);
    if (homeStats.penalty.total > 0 || awayStats.penalty.total > 0) {
      defensiveInsights.push(`• Penalties: ${homeTeamName} ${homeStats.penalty.scored}/${homeStats.penalty.total} converted | ${awayTeamName} ${awayStats.penalty.scored}/${awayStats.penalty.total} converted.`);
    }
    sections.push(`🛡️ DEFENSIVE & ATTACK INSIGHTS:\n${defensiveInsights.join("\n")}`);

    // 🔥 STREAKS
    if (homeStats.biggestStreak.wins > 2 || awayStats.biggestStreak.wins > 2) {
      sections.push(`🔥 BIGGEST STREAKS:\n• ${homeTeamName}: ${homeStats.biggestStreak.wins}W streak, ${homeStats.biggestStreak.losses}L streak${homeStats.biggestWin ? `, biggest win: ${homeStats.biggestWin}` : ""}.\n• ${awayTeamName}: ${awayStats.biggestStreak.wins}W streak, ${awayStats.biggestStreak.losses}L streak${awayStats.biggestWin ? `, biggest win: ${awayStats.biggestWin}` : ""}.`);
    }
  }

  // ⭐ KEY PLAYERS
  if (topScorers && topScorers.length > 0) {
    const matchTeam = (t: string, target: string) => t.toLowerCase().includes(target.toLowerCase().split(" ").pop() || "");
    const homePlayers = topScorers.filter(p => matchTeam(p.team, homeTeamName)).slice(0, 3);
    const awayPlayers = topScorers.filter(p => matchTeam(p.team, awayTeamName)).slice(0, 3);
    
    if (homePlayers.length > 0 || awayPlayers.length > 0) {
      const lines: string[] = [];
      if (homePlayers.length > 0) {
        lines.push(`• ${homeTeamName}: ${homePlayers.map(p => `${p.name} (${p.goals}G/${p.assists}A)`).join(", ")}.`);
      }
      if (awayPlayers.length > 0) {
        lines.push(`• ${awayTeamName}: ${awayPlayers.map(p => `${p.name} (${p.goals}G/${p.assists}A)`).join(", ")}.`);
      }
      sections.push(`⭐ KEY PLAYERS:\n${lines.join("\n")}`);
    }
  }

  // 🚑 INJURIES & SUSPENSIONS
  if (injuries && injuries.length > 0) {
    const matchTeam = (t: string, target: string) => t.toLowerCase().includes(target.toLowerCase().split(" ").pop() || "");
    const homeInjuries = injuries.filter(p => matchTeam(p.team, homeTeamName)).slice(0, 5);
    const awayInjuries = injuries.filter(p => matchTeam(p.team, awayTeamName)).slice(0, 5);
    
    if (homeInjuries.length > 0 || awayInjuries.length > 0) {
      const lines: string[] = [];
      if (homeInjuries.length > 0) {
        lines.push(`• ${homeTeamName}: ${homeInjuries.map(p => `${p.name} (${p.reason})`).join(", ")}.`);
      }
      if (awayInjuries.length > 0) {
        lines.push(`• ${awayTeamName}: ${awayInjuries.map(p => `${p.name} (${p.reason})`).join(", ")}.`);
      }
      sections.push(`🚑 INJURIES & SUSPENSIONS:\n${lines.join("\n")}`);
    }
  }

  // 🎯 PROBABILITIES
  sections.push(`🎯 WIN PROBABILITIES: ${homeTeamName} ${homeWin}% | Draw ${draw}% | ${awayTeamName} ${awayWin}%.`);

  return sections.join("\n\n");
}

/**
 * Premium enhancement: fetch last 10 real matches + 5 H2H for high-confidence predictions.
 * Recalculates with deeper data and generates detailed analysis.
 */
async function premiumEnhance(
  pred: any,
  initialResult: PredictionResult,
  homeTeamId: number,
  awayTeamId: number,
  homeTeamName: string,
  awayTeamName: string,
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  apiKey: string,
  leagueId?: number,
  season?: number
): Promise<PredictionResult> {
  console.log(`⭐ Premium deep-dive for ${homeTeamName} vs ${awayTeamName} (confidence: ${initialResult.confidence}%)`);

  // Fetch last 10 real matches + 5 H2H + top scorers + injuries (more data than standard)
  const [homeForm10, awayForm10, h2h5, topScorers, injuries] = await Promise.all([
    fetchTeamForm(homeTeamId, apiKey, 10),
    fetchTeamForm(awayTeamId, apiKey, 10),
    fetchH2H(homeTeamId, awayTeamId, apiKey, 5),
    leagueId && season ? fetchTopScorers(leagueId, season, apiKey) : Promise.resolve([]),
    leagueId && season ? fetchInjuries(leagueId, season, apiKey) : Promise.resolve([]),
  ]);

  // Recalculate with deeper form data (use last 10 for form score)
  const deepHomeFormScore = calculateFormScoreDeep(homeForm10);
  const deepAwayFormScore = calculateFormScoreDeep(awayForm10);
  const deepH2HScore = calculateH2HScore(h2h5, homeTeamId, awayTeamId);

  // Recalculate prediction with deep data
  const deepResult = calculatePrediction(
    homeForm10.slice(0, 5), // Use last 5 for core calculation (more than 3)
    awayForm10.slice(0, 5),
    homeStats,
    awayStats,
    h2h5,
    homeTeamId,
    awayTeamId,
    homeTeamName,
    awayTeamName
  );

  // Keep the higher confidence (deep analysis should confirm or raise)
  const finalConfidence = Math.max(initialResult.confidence, deepResult.confidence);

  // Analyze last 10 data for detailed report
  const homeData = analyzeLast10(homeForm10);
  const awayData = analyzeLast10(awayForm10);
  const h2hSummary = analyzeH2H(h2h5, homeTeamId);

  // Use the deep result's prediction/probabilities
  const analysis = generatePremiumAnalysis({
    homeTeamName,
    awayTeamName,
    prediction: deepResult.prediction,
    predictedScore: deepResult.predicted_score,
    confidence: finalConfidence,
    homeWin: deepResult.home_win,
    draw: deepResult.draw,
    awayWin: deepResult.away_win,
    homeData,
    awayData,
    h2hSummary,
    homeStats,
    awayStats,
    topScorers,
    injuries,
  });

  return {
    ...deepResult,
    confidence: finalConfidence,
    analysis,
  };
}

/**
 * Extended form score using up to 10 matches (weighted: recent matches count more)
 */
function calculateFormScoreDeep(form: FormMatch[]): number {
  if (form.length === 0) return 50;

  let weightedPoints = 0;
  let weightSum = 0;

  for (let i = 0; i < form.length; i++) {
    const weight = 1.0 - (i * 0.07); // Most recent = 1.0, 10th = 0.37
    const pts = form[i].result === "W" ? 3 : form[i].result === "D" ? 1 : 0;
    weightedPoints += pts * weight;
    weightSum += 3 * weight; // Max possible per match
  }

  return Math.round((weightedPoints / weightSum) * 100);
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

  const recent = stats.form.slice(-5).split("");
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
 * Generate specific key_factors from real match data instead of generic ones.
 */
function generateKeyFactors(
  homeTeamName: string,
  awayTeamName: string,
  homeForm: FormMatch[],
  awayForm: FormMatch[],
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  h2h: H2HMatch[],
  homeTeamId: number,
  prediction: string,
  goalMarkets: { over25: number; bttsYes: number; expectedTotalGoals: number }
): string[] {
  const factors: string[] = [];

  // 1. Form streaks
  if (homeForm.length >= 3) {
    const lastThree = homeForm.slice(0, 3);
    const wins = lastThree.filter(m => m.result === "W").length;
    const losses = lastThree.filter(m => m.result === "L").length;
    if (wins === 3) factors.push(`${homeTeamName}: 3 wins in a row`);
    else if (losses >= 2) factors.push(`${homeTeamName}: Poor recent form`);
  }
  if (awayForm.length >= 3) {
    const lastThree = awayForm.slice(0, 3);
    const wins = lastThree.filter(m => m.result === "W").length;
    const losses = lastThree.filter(m => m.result === "L").length;
    if (wins === 3) factors.push(`${awayTeamName}: 3 wins in a row`);
    else if (losses >= 2) factors.push(`${awayTeamName}: Poor recent form`);
  }

  // 2. Home/Away strength
  if (homeStats && homeStats.home.played > 3) {
    const homeWinRate = homeStats.home.wins / homeStats.home.played;
    if (homeWinRate >= 0.7) factors.push(`Strong home record (${Math.round(homeWinRate * 100)}% wins)`);
    else if (homeWinRate <= 0.25) factors.push(`Weak home record`);
  }
  if (awayStats && awayStats.away.played > 3) {
    const awayWinRate = awayStats.away.wins / awayStats.away.played;
    if (awayWinRate >= 0.5) factors.push(`${awayTeamName}: Strong away form`);
    else if (awayWinRate <= 0.2) factors.push(`${awayTeamName}: Struggles away`);
  }

  // 3. H2H dominance
  if (h2h.length >= 3) {
    const homeH2HWins = h2h.filter(m => {
      const isHome = m.homeTeamId === homeTeamId;
      const hGoals = isHome ? m.homeGoals : m.awayGoals;
      const aGoals = isHome ? m.awayGoals : m.homeGoals;
      return hGoals > aGoals;
    }).length;
    if (homeH2HWins >= 3) factors.push(`H2H: ${homeTeamName} dominates`);
    else if (homeH2HWins === 0) factors.push(`H2H: ${awayTeamName} dominates`);
  }

  // 4. Clean sheets / defensive
  if (homeStats && homeStats.cleanSheets.total > 0) {
    const csRate = homeStats.cleanSheets.total / homeStats.played;
    if (csRate >= 0.4) factors.push(`${homeTeamName}: Strong defense (${homeStats.cleanSheets.total} clean sheets)`);
  }

  // 5. Goal market insights (Poisson-derived)
  if (goalMarkets.over25 >= 65) factors.push(`High-scoring trend (Over 2.5: ${goalMarkets.over25}%)`);
  else if (goalMarkets.over25 <= 35) factors.push(`Low-scoring trend (Under 2.5: ${100 - goalMarkets.over25}%)`);
  
  if (goalMarkets.bttsYes >= 65) factors.push(`Both teams likely to score (${goalMarkets.bttsYes}%)`);
  else if (goalMarkets.bttsYes <= 30) factors.push(`Clean sheet expected (BTTS No: ${100 - goalMarkets.bttsYes}%)`);

  // 6. Season goal averages
  if (homeStats && awayStats) {
    const totalAvg = homeStats.goalsForAvg + awayStats.goalsForAvg;
    if (totalAvg >= 3.5) factors.push(`High-scoring teams (avg ${totalAvg.toFixed(1)} goals combined)`);
  }

  // Limit to 5 most relevant factors
  return factors.slice(0, 5);
}

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

      // Fetch core data — use real last 5 matches for form (not pseudo-form)
      const [homeStats, awayStats, h2h, realHomeForm, realAwayForm] = await Promise.all([
        fetchTeamStats(homeTeamId, leagueId, season, apiKey),
        fetchTeamStats(awayTeamId, leagueId, season, apiKey),
        fetchH2H(homeTeamId, awayTeamId, apiKey, 5),
        fetchTeamForm(homeTeamId, apiKey, 5),
        fetchTeamForm(awayTeamId, apiKey, 5),
      ]);

      if (!homeStats || !awayStats) {
        await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Missing team stats`);
        locked++;
        continue;
      }

      // Prefer real form data; fallback to pseudo-form from season stats
      const homeForm = realHomeForm.length >= 3 ? realHomeForm : buildPseudoFormFromStats(homeStats);
      const awayForm = realAwayForm.length >= 3 ? realAwayForm : buildPseudoFormFromStats(awayStats);

      if (homeForm.length === 0 && awayForm.length === 0) {
        await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Insufficient form data`);
        locked++;
        continue;
      }

      let newPrediction = calculatePrediction(
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

      // Calculate Poisson goal markets for key_factors and more accurate score
      const homeGoalRate = calculateGoalRate(homeForm);
      const awayGoalRate = calculateGoalRate(awayForm);
      const homeXg = clamp((homeGoalRate.scored + awayGoalRate.conceded) / 2, 0.3, 3.0);
      const awayXg = clamp((awayGoalRate.scored + homeGoalRate.conceded) / 2, 0.3, 3.0);
      const goalMarkets = poissonGoalMarkets(homeXg, awayXg);

      // Generate data-driven key_factors
      const keyFactors = generateKeyFactors(
        homeTeamName, awayTeamName,
        homeForm, awayForm,
        homeStats, awayStats,
        h2h, homeTeamId,
        newPrediction.prediction,
        goalMarkets
      );

      // === LEAGUE QUALITY GATE ===
      // Non-quality leagues get capped confidence (can't reach PREMIUM)
      const isQualityLeague = QUALITY_LEAGUE_IDS.has(leagueId);
      if (!isQualityLeague && newPrediction.confidence >= PREMIUM_MIN_CONFIDENCE) {
        newPrediction.confidence = PREMIUM_MIN_CONFIDENCE - 1; // Cap at 84%
        console.log(`[QUALITY GATE] ${pred.league} (ID: ${leagueId}) capped from PREMIUM to PRO`);
      }

      // ⭐ PREMIUM DEEP DIVE: Only for quality leagues with initial confidence >= 85%
      if (newPrediction.confidence >= PREMIUM_MIN_CONFIDENCE && isQualityLeague) {
        try {
          newPrediction = await premiumEnhance(
            pred,
            newPrediction,
            homeTeamId,
            awayTeamId,
            homeTeamName,
            awayTeamName,
            homeStats,
            awayStats,
            apiKey,
            leagueId,
            season
          );
        } catch (e) {
          console.warn(`Premium enhance failed for ${homeTeamName} vs ${awayTeamName}, keeping standard result:`, e);
        }
      }

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
          key_factors: keyFactors.length > 0 ? keyFactors : null,
          last_home_goals: Math.round(homeXg * 10) / 10,
          last_away_goals: Math.round(awayXg * 10) / 10,
          is_locked: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pred.id);

      if (updateError) {
        errors.push(`Fixture ${fixtureIdStr}: Update failed - ${updateError.message}`);
        continue;
      }

      updated++;
      const tier = newPrediction.confidence >= PREMIUM_MIN_CONFIDENCE ? "⭐PREMIUM" : "STD";
      console.log(
        `[${tier}] Updated ${homeTeamName} vs ${awayTeamName}: ${newPrediction.prediction} (${newPrediction.home_win}/${newPrediction.draw}/${newPrediction.away_win}) conf=${newPrediction.confidence}% factors=[${keyFactors.join(", ")}]`
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

      // Check all fixture IDs in chunks of 500 (Supabase .in() limit)
      let existingGlobalAll: any[] = [];
      for (let i = 0; i < fixtureIds.length; i += 500) {
        const chunk = fixtureIds.slice(i, i + 500);
        const { data: chunkData } = await supabase
          .from("ai_predictions")
          .select("match_id")
          .in("match_id", chunk);
        if (chunkData) existingGlobalAll = existingGlobalAll.concat(chunkData);
      }
      const existingGlobal = { data: existingGlobalAll };

      const existingDateIds = new Set((existingByDate ?? []).map((p: any) => String(p.match_id)));
      const existingGlobalIds = new Set((existingGlobal.data ?? []).map((p: any) => String(p.match_id)));
      
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
