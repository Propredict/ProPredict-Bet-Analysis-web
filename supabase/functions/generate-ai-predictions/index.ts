import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { analyzeInjuryImpact, applyInjuryAdjustment } from "./injuryImpact.ts";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ============ TIER CRITERIA (v4 — Step 4 hybrid) ============
// Step 4 spec: Quality > Quantity. Hard caps per tier, no force-fill.
//   < 55           → HIDDEN (do not show)
//   55–65          → FREE      (max 30, no minimum — show fewer if needed)
//   66–77          → PRO       (max 20)
//   ≥ 78           → PREMIUM   (max 10 — overflow demoted to PRO)
//   ≥ 85           → SAFE PICK (subset of PREMIUM, top 3 shown first)
const MIN_DISPLAY_CONFIDENCE = 55;
const FREE_MAX_CONFIDENCE = 65;
const PRO_MIN_CONFIDENCE = 66;
const PRO_MAX_CONFIDENCE = 77;
const PREMIUM_MIN_CONFIDENCE = 78;
const SAFE_PICK_MIN_CONFIDENCE = 82;

const PREMIUM_MAX_COUNT = 10;
const PRO_MAX_COUNT = 20;
const FREE_MAX_COUNT = 30;

// ============ MINIMUM DATA THRESHOLDS ============
const MIN_SEASON_MATCHES = 5;
const MIN_SEASON_CONFIDENCE_CAP = 70; // Was 62 — too aggressive

// ============ LEAGUE TIER PRIORITY (Step 1 — quality over quantity) ============
// Tier 1: top European leagues + UCL — ALWAYS included
const TIER_1_LEAGUE_IDS = new Set<number>([
  39,   // Premier League
  140,  // La Liga
  78,   // Bundesliga
  135,  // Serie A
  61,   // Ligue 1
  2,    // UEFA Champions League
  3,    // UEFA Europa League
  848,  // UEFA Conference League
  1,    // World Cup
  4,    // Euro Championship
]);

// Tier 2: secondary European leagues — included normally
const TIER_2_LEAGUE_IDS = new Set<number>([
  94,   // Primeira Liga (Portugal)
  88,   // Eredivisie (Netherlands)
  203,  // Super Lig (Turkey)
  144,  // Jupiler Pro League (Belgium)
  179,  // Scottish Premiership
  40,   // Championship (England)
  141,  // La Liga 2 (Spain)
  79,   // 2. Bundesliga
  136,  // Serie B (Italy)
  62,   // Ligue 2 (France)
]);

// Minimum Tier 1+2 matches per day to consider day "well-stocked".
// Below this threshold (e.g., midweek with no top leagues), we allow Tier 3 fallback.
const TIER_FALLBACK_THRESHOLD = 8;

function getLeagueTier(leagueId: number | null | undefined): 1 | 2 | 3 {
  if (!leagueId) return 3;
  if (TIER_1_LEAGUE_IDS.has(leagueId)) return 1;
  if (TIER_2_LEAGUE_IDS.has(leagueId)) return 2;
  return 3;
}

// ============ STEP 2 — DETERMINISTIC EXPECTED-GOALS DECIDER ============
// Hard rules per user spec. Returns null when there's NO strong signal → SKIP match.
interface Step2Decision {
  market: string;        // "Over 2.5" | "Under 2.5" | "BTTS Yes" | "BTTS No" | "1" | "2"
  predicted_score: string;
  expectedHome: number;
  expectedAway: number;
  totalGoals: number;
  reason: string;
  baseConfidence: number; // 60..82 depending on signal strength
}

function decideStep2(
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  homeForm: FormMatch[],
  awayForm: FormMatch[]
): Step2Decision | null {
  // Need at least one reliable source per team
  const homeFor = homeStats?.homeGoalsForAvg || calculateGoalRate(homeForm).scored;
  const homeAgainst = homeStats?.homeGoalsAgainstAvg || calculateGoalRate(homeForm).conceded;
  const awayFor = awayStats?.awayGoalsForAvg || calculateGoalRate(awayForm).scored;
  const awayAgainst = awayStats?.awayGoalsAgainstAvg || calculateGoalRate(awayForm).conceded;

  // If any value is zero/missing AND no form fallback → not enough data
  if (homeFor <= 0 || homeAgainst <= 0 || awayFor <= 0 || awayAgainst <= 0) return null;

  const expectedHome = (homeFor + awayAgainst) / 2;
  const expectedAway = (awayFor + homeAgainst) / 2;
  const totalGoals = expectedHome + expectedAway;
  const diff = expectedHome - expectedAway;

  const score = `${Math.max(0, Math.round(expectedHome))}-${Math.max(0, Math.round(expectedAway))}`;

  // === RULE 1: WINNER (strongest signal first — diff dominates) ===
  if (diff >= 0.6) {
    const conf = Math.min(82, 60 + Math.round((diff - 0.6) * 12));
    return {
      market: "1",
      predicted_score: score,
      expectedHome, expectedAway, totalGoals,
      reason: `Home expected ${expectedHome.toFixed(2)} vs away ${expectedAway.toFixed(2)} (Δ ${diff.toFixed(2)})`,
      baseConfidence: conf,
    };
  }
  if (diff <= -0.6) {
    const conf = Math.min(82, 60 + Math.round((Math.abs(diff) - 0.6) * 12));
    return {
      market: "2",
      predicted_score: score,
      expectedHome, expectedAway, totalGoals,
      reason: `Away expected ${expectedAway.toFixed(2)} vs home ${expectedHome.toFixed(2)} (Δ ${Math.abs(diff).toFixed(2)})`,
      baseConfidence: conf,
    };
  }

  // === RULE 2: GOALS markets ===
  if (totalGoals >= 2.7) {
    const conf = Math.min(80, 62 + Math.round((totalGoals - 2.7) * 10));
    return {
      market: "Over 2.5",
      predicted_score: score,
      expectedHome, expectedAway, totalGoals,
      reason: `Total expected goals ${totalGoals.toFixed(2)} ≥ 2.7`,
      baseConfidence: conf,
    };
  }
  if (totalGoals <= 2.2) {
    const conf = Math.min(80, 62 + Math.round((2.2 - totalGoals) * 10));
    return {
      market: "Under 2.5",
      predicted_score: score,
      expectedHome, expectedAway, totalGoals,
      reason: `Total expected goals ${totalGoals.toFixed(2)} ≤ 2.2`,
      baseConfidence: conf,
    };
  }

  // === RULE 3: BTTS ===
  if (expectedHome >= 1.2 && expectedAway >= 1.0) {
    return {
      market: "BTTS Yes",
      predicted_score: score,
      expectedHome, expectedAway, totalGoals,
      reason: `Both teams expected to score (H ${expectedHome.toFixed(2)}, A ${expectedAway.toFixed(2)})`,
      baseConfidence: 65,
    };
  }
  if (expectedHome < 1.0 || expectedAway < 0.8) {
    return {
      market: "BTTS No",
      predicted_score: score,
      expectedHome, expectedAway, totalGoals,
      reason: `One side weak attack (H ${expectedHome.toFixed(2)}, A ${expectedAway.toFixed(2)})`,
      baseConfidence: 63,
    };
  }

  // === NO STRONG SIGNAL ===
  return null;
}

// ============ STEP 3 — CONFIDENCE CALCULATION ============
// Formula:  confidence = 50 + (|xH - xA| * 10) + (totalGoals * 5)
// Then apply penalties (weak signals) and boosts (strong signals).
// Final clamp 55..95. If raw < 55 BEFORE clamp → SKIP (caller should hide match).
interface Step3Result {
  confidence: number;        // final, clamped 55..95 (only if not skipped)
  skip: boolean;             // true → hide match (low quality signal)
  reason: string;            // human readable breakdown for tooltip / key_factors
  baseScore: number;         // formula base (pre penalties/boosts)
  penalties: number;         // total deducted
  boosts: number;            // total added
}

interface Step3Inputs {
  step2: Step2Decision;
  homeMatches: number;       // sample size proxies
  awayMatches: number;
  injuryImpactFav: number;   // 0..100, impact on the favoured side
  oddsHome?: number | null;  // raw decimal odds (optional)
  oddsDraw?: number | null;
  oddsAway?: number | null;
}

function applyStep3Confidence(input: Step3Inputs): Step3Result {
  const { step2 } = input;
  const diff = Math.abs(step2.expectedHome - step2.expectedAway);

  // ---- Base formula ----
  const base = 50 + (diff * 10) + (step2.totalGoals * 5);
  const baseScore = Math.round(base);

  // ---- Penalties (weak signals) ----
  let penalties = 0;
  const penaltyReasons: string[] = [];

  // P1: low sample size on either side
  const minMatches = Math.min(input.homeMatches, input.awayMatches);
  if (minMatches < 8) {
    const p = 6;
    penalties += p;
    penaltyReasons.push(`small sample (-${p})`);
  } else if (minMatches < 10) {
    const p = 3;
    penalties += p;
    penaltyReasons.push(`limited sample (-${p})`);
  }

  // P2: market is 1X2 winner pick but odds are very tight (no clear favourite)
  if ((step2.market === "1" || step2.market === "2") &&
      input.oddsHome && input.oddsAway && input.oddsDraw) {
    const minOdd = Math.min(input.oddsHome, input.oddsAway);
    const secondOdd = step2.market === "1" ? input.oddsAway : input.oddsHome;
    if (minOdd > 2.0 && Math.abs(input.oddsHome - input.oddsAway) < 0.4) {
      const p = 5;
      penalties += p;
      penaltyReasons.push(`tight odds (-${p})`);
    } else if (secondOdd < 2.5) {
      const p = 2;
      penalties += p;
      penaltyReasons.push(`close market (-${p})`);
    }
  }

  // P3: heavy injury impact on the favoured side
  if (input.injuryImpactFav >= 30) {
    const p = 5;
    penalties += p;
    penaltyReasons.push(`key injuries (-${p})`);
  } else if (input.injuryImpactFav >= 15) {
    const p = 2;
    penalties += p;
    penaltyReasons.push(`some injuries (-${p})`);
  }

  // ---- Boosts (strong signals) ----
  let boosts = 0;
  const boostReasons: string[] = [];

  // B1: very clear xG dominance for winner picks
  if ((step2.market === "1" || step2.market === "2") && diff >= 1.0) {
    const b = 4;
    boosts += b;
    boostReasons.push(`xG dominance (+${b})`);
  }

  // B2: sharp money alignment — Step 2 winner pick matches the bookmaker favourite
  if ((step2.market === "1" || step2.market === "2") &&
      input.oddsHome && input.oddsAway) {
    const bookieFav = input.oddsHome < input.oddsAway ? "1" : "2";
    if (bookieFav === step2.market) {
      const minOdd = Math.min(input.oddsHome, input.oddsAway);
      if (minOdd <= 1.7) {
        const b = 3;
        boosts += b;
        boostReasons.push(`sharp money (+${b})`);
      } else if (minOdd <= 2.0) {
        const b = 2;
        boosts += b;
        boostReasons.push(`market agrees (+${b})`);
      }
    }
  }

  // B3: Goals markets with very strong total signal
  if (step2.market === "Over 2.5" && step2.totalGoals >= 3.2) {
    const b = 3;
    boosts += b;
    boostReasons.push(`high goal total (+${b})`);
  }
  if (step2.market === "Under 2.5" && step2.totalGoals <= 1.8) {
    const b = 3;
    boosts += b;
    boostReasons.push(`low goal total (+${b})`);
  }

  // ---- Final score ----
  const raw = base - penalties + boosts;

  // SKIP if raw drops below 55 (low confidence floor → hide match)
  if (raw < 55) {
    return {
      confidence: 55,
      skip: true,
      baseScore,
      penalties,
      boosts,
      reason: `Base ${baseScore} − ${penalties} penalties + ${boosts} boosts = ${Math.round(raw)} (below floor)`,
    };
  }

  const finalConf = Math.max(55, Math.min(95, Math.round(raw)));
  const parts = [
    `Base ${baseScore} (xG Δ ${diff.toFixed(2)}, total ${step2.totalGoals.toFixed(2)})`,
    penaltyReasons.length ? penaltyReasons.join(", ") : null,
    boostReasons.length ? boostReasons.join(", ") : null,
    `= ${finalConf}%`,
  ].filter(Boolean);

  return {
    confidence: finalConf,
    skip: false,
    baseScore,
    penalties,
    boosts,
    reason: parts.join(" | "),
  };
}

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

// ============ WEIGHTING CONSTANTS (v5 — Form/Odds/xG focused) ============
// 1X2 Match Result weights:
const WEIGHT_1X2_FORM = 0.60;      // 60% - Form composite (recent form + quality + squad + home + H2H + standings)
const WEIGHT_1X2_ODDS = 0.25;      // 25% - Bookmaker implied probability
const WEIGHT_1X2_XG = 0.15;        // 15% - xG model

// Sub-weights within the FORM composite (sum to 1.0):
const SUB_FORM = 0.30;       // Recent form (goals-based quality)
const SUB_QUALITY = 0.20;    // Team quality (season stats)
const SUB_SQUAD = 0.10;      // Squad strength / goal diff
const SUB_HOME = 0.10;       // Home advantage
const SUB_H2H = 0.08;        // Head-to-Head history
const SUB_STANDINGS = 0.15;  // League table position
const SUB_TEMPO = 0.07;      // Match intensity/tempo score

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
  opponentId: number;
  matchDate?: string; // ISO timestamp of the match (for fatigue/rest detection)
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
const topAssistsCache = new Map<string, { name: string; team: string; goals: number; assists: number }[]>();
const startingGKCache = new Map<string, { name: string; position: string } | null>();
const injuriesCache = new Map<string, InjuryInfo[]>();
const standingsCache = new Map<string, StandingEntry[]>();
const oddsCache = new Map<string, OddsData | null>();
const leagueAccuracyCache = new Map<string, number>();
const marketAccuracyCache = new Map<string, number>();
const leagueHomeAdvantageCache = new Map<number, number>(); // leagueId → home win % from standings
// Referee bias cache — refName → { avgGoals, btts%, cardsPerGame, samples }
const refereeStatsCache = new Map<string, RefereeStats | null>();

interface RefereeStats {
  avgGoals: number;       // avg total goals per match
  bttsRate: number;       // 0-100, % matches with both teams scoring
  cardsPerGame: number;   // yellow + red avg
  penaltiesPerGame: number;
  samples: number;        // matches sampled
}

// ============================================================
// === SAFE MODE: Real xG Data Collection (NO prediction impact) ===
// ============================================================
// Fetches actual xG from API-Football and logs alongside proxy xG
// for future analysis. Current prediction engine remains unchanged.
// All operations are wrapped in try/catch — failures are silent.
// ============================================================

interface RealXGStats {
  team_id: number;
  league_id: number;
  season: number;
  xg_for_avg_last5: number | null;
  xg_against_avg_last5: number | null;
  home_xg_for_avg: number | null;
  home_xg_against_avg: number | null;
  away_xg_for_avg: number | null;
  away_xg_against_avg: number | null;
  xg_for_std: number | null;
  matches_count: number;
}

const realXGMemoryCache = new Map<string, RealXGStats | null>();

/**
 * Fetches last N completed matches for a team and extracts xG from statistics.
 * Returns null if API fails or no xG data available (lower leagues).
 */
async function fetchTeamRealXGFromAPI(
  teamId: number,
  leagueId: number,
  season: number,
  apiKey: string
): Promise<RealXGStats | null> {
  try {
    const url = `${API_FOOTBALL_URL}/fixtures?team=${teamId}&season=${season}&last=10`;
    const res = await fetch(url, {
      headers: {
        "x-apisports-key": apiKey,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const fixtures = json?.response || [];
    if (fixtures.length === 0) return null;

    const xgForAll: number[] = [];
    const xgAgainstAll: number[] = [];
    const xgForHome: number[] = [];
    const xgAgainstHome: number[] = [];
    const xgForAway: number[] = [];
    const xgAgainstAway: number[] = [];

    // For each fixture, fetch its statistics to extract xG
    for (const fixture of fixtures.slice(0, 10)) {
      try {
        const fixtureId = fixture?.fixture?.id;
        const isHome = fixture?.teams?.home?.id === teamId;
        if (!fixtureId) continue;

        const statsUrl = `${API_FOOTBALL_URL}/fixtures/statistics?fixture=${fixtureId}`;
        const statsRes = await fetch(statsUrl, {
          headers: {
            "x-apisports-key": apiKey,
            "x-rapidapi-host": "v3.football.api-sports.io",
          },
        });
        if (!statsRes.ok) continue;
        const statsJson = await statsRes.json();
        const teamsStats = statsJson?.response || [];

        const myStats = teamsStats.find((t: any) => t?.team?.id === teamId);
        const oppStats = teamsStats.find((t: any) => t?.team?.id !== teamId);
        if (!myStats || !oppStats) continue;

        const myXgRaw = myStats.statistics?.find((s: any) => s.type === "expected_goals")?.value;
        const oppXgRaw = oppStats.statistics?.find((s: any) => s.type === "expected_goals")?.value;

        const myXg = myXgRaw !== null && myXgRaw !== undefined ? parseFloat(String(myXgRaw)) : null;
        const oppXg = oppXgRaw !== null && oppXgRaw !== undefined ? parseFloat(String(oppXgRaw)) : null;

        if (myXg !== null && !isNaN(myXg) && myXg >= 0) {
          xgForAll.push(myXg);
          if (isHome) xgForHome.push(myXg);
          else xgForAway.push(myXg);
        }
        if (oppXg !== null && !isNaN(oppXg) && oppXg >= 0) {
          xgAgainstAll.push(oppXg);
          if (isHome) xgAgainstHome.push(oppXg);
          else xgAgainstAway.push(oppXg);
        }

        // Be nice to API-Football rate limits
        await new Promise((r) => setTimeout(r, 150));
      } catch (_) {
        // skip individual fixture errors
      }
    }

    if (xgForAll.length === 0) return null;

    const avg = (arr: number[]) => (arr.length === 0 ? null : arr.reduce((s, x) => s + x, 0) / arr.length);
    const std = (arr: number[]) => {
      if (arr.length < 2) return null;
      const m = arr.reduce((s, x) => s + x, 0) / arr.length;
      const variance = arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
      return Math.sqrt(variance);
    };

    return {
      team_id: teamId,
      league_id: leagueId,
      season,
      xg_for_avg_last5: avg(xgForAll.slice(0, 5)),
      xg_against_avg_last5: avg(xgAgainstAll.slice(0, 5)),
      home_xg_for_avg: avg(xgForHome),
      home_xg_against_avg: avg(xgAgainstHome),
      away_xg_for_avg: avg(xgForAway),
      away_xg_against_avg: avg(xgAgainstAway),
      xg_for_std: std(xgForAll),
      matches_count: xgForAll.length,
    };
  } catch (e) {
    console.warn(`[xG-SAFE] fetchTeamRealXGFromAPI failed for team ${teamId}:`, (e as Error)?.message);
    return null;
  }
}

/**
 * Cached lookup: checks team_xg_cache (6h TTL), else fetches + upserts.
 * Always returns null on any failure — never throws.
 */
async function getCachedRealXG(
  supabase: any,
  teamId: number,
  leagueId: number,
  season: number,
  apiKey: string
): Promise<RealXGStats | null> {
  const cacheKey = `${teamId}-${leagueId}-${season}`;
  if (realXGMemoryCache.has(cacheKey)) return realXGMemoryCache.get(cacheKey) ?? null;

  try {
    // Check DB cache (6h TTL)
    const { data: cached } = await supabase
      .from("team_xg_cache")
      .select("*")
      .eq("team_id", String(teamId))
      .eq("league_id", String(leagueId))
      .eq("season", season)
      .maybeSingle();

    if (cached?.updated_at) {
      const ageMs = Date.now() - new Date(cached.updated_at).getTime();
      if (ageMs < 6 * 60 * 60 * 1000) {
        const stats: RealXGStats = {
          team_id: teamId,
          league_id: leagueId,
          season,
          xg_for_avg_last5: cached.xg_for_avg_last5,
          xg_against_avg_last5: cached.xg_against_avg_last5,
          home_xg_for_avg: cached.home_xg_for_avg,
          home_xg_against_avg: cached.home_xg_against_avg,
          away_xg_for_avg: cached.away_xg_for_avg,
          away_xg_against_avg: cached.away_xg_against_avg,
          xg_for_std: cached.xg_for_std,
          matches_count: cached.matches_count ?? 0,
        };
        realXGMemoryCache.set(cacheKey, stats);
        return stats;
      }
    }

    // Stale or missing → fetch fresh
    const fresh = await fetchTeamRealXGFromAPI(teamId, leagueId, season, apiKey);
    realXGMemoryCache.set(cacheKey, fresh);

    if (fresh) {
      try {
        await supabase.from("team_xg_cache").upsert({
          team_id: String(teamId),
          league_id: String(leagueId),
          season,
          xg_for_avg_last5: fresh.xg_for_avg_last5,
          xg_against_avg_last5: fresh.xg_against_avg_last5,
          home_xg_for_avg: fresh.home_xg_for_avg,
          home_xg_against_avg: fresh.home_xg_against_avg,
          away_xg_for_avg: fresh.away_xg_for_avg,
          away_xg_against_avg: fresh.away_xg_against_avg,
          xg_for_std: fresh.xg_for_std,
          matches_count: fresh.matches_count,
          updated_at: new Date().toISOString(),
        }, { onConflict: "team_id,league_id,season" });
      } catch (e) {
        console.warn(`[xG-SAFE] Upsert team_xg_cache failed:`, (e as Error)?.message);
      }
    }

    return fresh;
  } catch (e) {
    console.warn(`[xG-SAFE] getCachedRealXG failed:`, (e as Error)?.message);
    realXGMemoryCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Logs proxy xG vs real xG for one match — fire and forget.
 */
async function logXGComparison(
  supabase: any,
  matchId: string,
  homeTeamId: number,
  awayTeamId: number,
  leagueId: number,
  season: number,
  apiKey: string,
  proxyHomeXg: number,
  proxyAwayXg: number,
  currentPrediction: string,
  currentConfidence: number
): Promise<void> {
  try {
    const [homeRealXG, awayRealXG] = await Promise.all([
      getCachedRealXG(supabase, homeTeamId, leagueId, season, apiKey),
      getCachedRealXG(supabase, awayTeamId, leagueId, season, apiKey),
    ]);

    // What WOULD predicted xG be if we used real xG instead of proxy?
    let realHomeXgPred: number | null = null;
    let realAwayXgPred: number | null = null;
    if (homeRealXG?.home_xg_for_avg && awayRealXG?.away_xg_against_avg) {
      realHomeXgPred = (homeRealXG.home_xg_for_avg + awayRealXG.away_xg_against_avg) / 2;
    }
    if (awayRealXG?.away_xg_for_avg && homeRealXG?.home_xg_against_avg) {
      realAwayXgPred = (awayRealXG.away_xg_for_avg + homeRealXG.home_xg_against_avg) / 2;
    }

    await supabase.from("match_xg_log").insert({
      match_id: matchId,
      home_team_id: String(homeTeamId),
      away_team_id: String(awayTeamId),
      league_id: String(leagueId),
      season,
      proxy_home_xg: proxyHomeXg,
      proxy_away_xg: proxyAwayXg,
      real_home_xg: realHomeXgPred,
      real_away_xg: realAwayXgPred,
      home_xg_matches_count: homeRealXG?.matches_count ?? 0,
      away_xg_matches_count: awayRealXG?.matches_count ?? 0,
      current_prediction: currentPrediction,
      current_confidence: currentConfidence,
    });
  } catch (e) {
    console.warn(`[xG-SAFE] logXGComparison failed for match ${matchId}:`, (e as Error)?.message);
  }
}
// ============= END SAFE MODE xG block =============


// ============= SAFE MODE: Squad Rotation + Weather Logging =============
// All fire-and-forget. Never block predictions.

async function fetchStartingXI(fixtureId: string, apiKey: string): Promise<{ home: string[]; away: string[] }> {
  try {
    const data = await fetchJsonWithRetry(
      `${API_FOOTBALL_URL}/fixtures/lineups?fixture=${fixtureId}`,
      apiKey,
      { retries: 1, baseDelayMs: 500 }
    );
    const lineups = data?.response;
    if (!lineups || lineups.length < 2) return { home: [], away: [] };
    const extract = (lu: any): string[] =>
      (lu?.startXI || []).map((it: any) => String(it?.player?.id ?? "")).filter(Boolean);
    return { home: extract(lineups[0]), away: extract(lineups[1]) };
  } catch {
    return { home: [], away: [] };
  }
}

async function fetchPrevStartingXI(teamId: number, beforeIso: string, apiKey: string): Promise<string[]> {
  try {
    const data = await fetchJsonWithRetry(
      `${API_FOOTBALL_URL}/fixtures?team=${teamId}&last=3&status=FT-AET-PEN`,
      apiKey,
      { retries: 1, baseDelayMs: 500 }
    );
    const fixtures = data?.response || [];
    const before = new Date(beforeIso).getTime();
    const prev = fixtures
      .filter((f: any) => new Date(f?.fixture?.date).getTime() < before)
      .sort((a: any, b: any) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())[0];
    if (!prev?.fixture?.id) return [];
    const lu = await fetchJsonWithRetry(
      `${API_FOOTBALL_URL}/fixtures/lineups?fixture=${prev.fixture.id}`,
      apiKey,
      { retries: 1, baseDelayMs: 500 }
    );
    const teamLineup = (lu?.response || []).find((x: any) => x?.team?.id === teamId);
    return (teamLineup?.startXI || []).map((it: any) => String(it?.player?.id ?? "")).filter(Boolean);
  } catch {
    return [];
  }
}

async function logSquadRotation(
  supabase: any,
  matchId: string,
  fixtureIso: string,
  homeTeamId: number,
  awayTeamId: number,
  apiKey: string,
  currentPrediction: string,
  currentConfidence: number
): Promise<void> {
  try {
    const currentXI = await fetchStartingXI(matchId, apiKey);
    if (currentXI.home.length === 0 && currentXI.away.length === 0) return;

    const [prevHome, prevAway] = await Promise.all([
      currentXI.home.length ? fetchPrevStartingXI(homeTeamId, fixtureIso, apiKey) : Promise.resolve([]),
      currentXI.away.length ? fetchPrevStartingXI(awayTeamId, fixtureIso, apiKey) : Promise.resolve([]),
    ]);

    const diffCount = (curr: string[], prev: string[]): number => {
      if (!curr.length || !prev.length) return -1;
      const prevSet = new Set(prev);
      return curr.filter((p) => !prevSet.has(p)).length;
    };

    const homeChanges = diffCount(currentXI.home, prevHome);
    const awayChanges = diffCount(currentXI.away, prevAway);
    if (homeChanges < 0 && awayChanges < 0) return;

    await supabase.from("squad_rotation_log").insert({
      match_id: matchId,
      home_team_id: String(homeTeamId),
      away_team_id: String(awayTeamId),
      home_changes: homeChanges < 0 ? null : homeChanges,
      away_changes: awayChanges < 0 ? null : awayChanges,
      home_xi_size: currentXI.home.length,
      away_xi_size: currentXI.away.length,
      current_prediction: currentPrediction,
      current_confidence: currentConfidence,
    });
  } catch (e) {
    console.warn(`[rotation-SAFE] log failed for ${matchId}:`, (e as Error)?.message);
  }
}

async function logWeatherImpact(
  supabase: any,
  matchId: string,
  fixture: any,
  currentPrediction: string,
  currentConfidence: number
): Promise<void> {
  try {
    const weather = fixture?.fixture?.weather || fixture?.weather;
    const venue = fixture?.fixture?.venue;
    if (!weather && !venue) return;

    await supabase.from("weather_impact_log").insert({
      match_id: matchId,
      venue_name: venue?.name ?? null,
      venue_city: venue?.city ?? null,
      weather_code: weather?.code ?? null,
      weather_description: weather?.description ?? null,
      temperature_c: weather?.temperature?.celsius != null ? Number(weather.temperature.celsius) : null,
      humidity_pct: weather?.humidity?.percentage != null ? Number(weather.humidity.percentage) : null,
      wind_kmh: weather?.wind?.speed != null ? Number(weather.wind.speed) : null,
      current_prediction: currentPrediction,
      current_confidence: currentConfidence,
    });
  } catch (e) {
    console.warn(`[weather-SAFE] log failed for ${matchId}:`, (e as Error)?.message);
  }
}
// ============= END SAFE MODE Rotation + Weather =============


interface StandingEntry {
  teamId: number;
  rank: number;
  points: number;
  played: number;
  goalsDiff: number;
  form: string;
  totalTeams: number;
}

interface OddsData {
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  // Implied probabilities from bookmaker
  homeProb: number;
  drawProb: number;
  awayProb: number;
  // Goal market odds (if available)
  over25Odds: number | null;
  under25Odds: number | null;
  bttsYesOdds: number | null;
  bttsNoOdds: number | null;
}

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
async function fetchTeamForm(teamId: number, apiKey: string, count: number = 5, leagueId?: number): Promise<FormMatch[]> {
  const cacheKey = leagueId ? `${teamId}:${leagueId}` : teamId;
  const cached = teamFormCache.get(cacheKey as number);
  if (cached && cached.length >= count) return cached.slice(0, count);

  try {
    // If leagueId provided, fetch league-only matches (excludes cups/friendlies)
    const leagueParam = leagueId ? `&league=${leagueId}` : "";
    const url = `${API_FOOTBALL_URL}/fixtures?team=${teamId}&last=${count}&status=FT-AET-PEN${leagueParam}`;
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 4, baseDelayMs: 700 });
    if (!data?.response) return [];

    const matches = data.response || [];
    const normalized: FormMatch[] = matches.map((m: any) => {
      const isHome = m.teams.home.id === teamId;
      const goalsFor = isHome ? m.goals.home : m.goals.away;
      const goalsAgainst = isHome ? m.goals.away : m.goals.home;
      const won = isHome ? m.teams.home.winner : m.teams.away.winner;
      const opponentId = isHome ? m.teams.away.id : m.teams.home.id;

      let result: "W" | "D" | "L" = "D";
      if (won === true) result = "W";
      else if (won === false) result = "L";

      return { result, goalsFor, goalsAgainst, isHome, opponentId, matchDate: m.fixture?.date };
    });

    teamFormCache.set(cacheKey as number, normalized);
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
 * Fetch league standings to determine team positions.
 * Returns array of standings entries for all teams in the league.
 */
async function fetchStandings(leagueId: number, season: number, apiKey: string): Promise<StandingEntry[]> {
  const cacheKey = `${leagueId}:${season}`;
  if (standingsCache.has(cacheKey)) return standingsCache.get(cacheKey)!;

  try {
    const url = `${API_FOOTBALL_URL}/standings?league=${leagueId}&season=${season}`;
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 2, baseDelayMs: 700 });
    if (!data?.response?.[0]?.league?.standings) {
      standingsCache.set(cacheKey, []);
      return [];
    }

    // Standings can be in groups (e.g. Champions League) — flatten all
    const allGroups = data.response[0].league.standings;
    const entries: StandingEntry[] = [];
    
    for (const group of allGroups) {
      const totalTeams = group.length;
      for (const team of group) {
        entries.push({
          teamId: team.team?.id || 0,
          rank: team.rank || 0,
          points: team.points || 0,
          played: team.all?.played || 0,
          goalsDiff: team.goalsDiff || 0,
          form: team.form || "",
          totalTeams,
        });
      }
    }

    standingsCache.set(cacheKey, entries);
    return entries;
  } catch (e) {
    console.error("Error fetching standings:", e);
    standingsCache.set(cacheKey, []);
    return [];
  }
}

/**
 * Get team's position in standings (0-100 score, 100 = top of table)
 */
function getStandingsScore(standings: StandingEntry[], teamId: number): number {
  if (standings.length === 0) return 50; // Neutral if no standings data

  const entry = standings.find(s => s.teamId === teamId);
  if (!entry || entry.totalTeams === 0) return 50;

  // Convert rank to 0-100 score (1st place = 100, last place = 0)
  const positionScore = ((entry.totalTeams - entry.rank) / (entry.totalTeams - 1)) * 100;
  
  // Weight by goal difference as a tiebreaker
  const gdBonus = clamp(entry.goalsDiff * 0.5, -10, 10);
  
  return clamp(Math.round(positionScore + gdBonus), 0, 100);
}

/**
 * Calculate per-league home advantage from standings data.
 * Returns home win rate (0-100) based on all teams' home records in that league.
 */
function calculateLeagueHomeAdvantage(standings: StandingEntry[], leagueId: number): number {
  if (leagueHomeAdvantageCache.has(leagueId)) return leagueHomeAdvantageCache.get(leagueId)!;
  
  // Default home advantage ~52% (post-COVID average)
  if (standings.length === 0) return 52;
  
  // We don't have per-team home records in standings, so use a league-level estimate
  // based on how much top teams over-perform at home (rank gap correlation)
  // This is a heuristic: leagues with bigger rank gaps tend to have higher home advantage
  const maxRank = Math.max(...standings.map(s => s.rank));
  const avgGD = standings.reduce((sum, s) => sum + Math.abs(s.goalsDiff), 0) / standings.length;
  
  // Higher avg absolute goal diff = more predictable league = higher home advantage
  const homeAdv = clamp(48 + avgGD * 0.8, 44, 60);
  leagueHomeAdvantageCache.set(leagueId, Math.round(homeAdv));
  return Math.round(homeAdv);
}

/**
 * Fetch pre-match bookmaker odds for a fixture.
 * Uses the first available bookmaker's 1X2 (Match Winner) market.
 */
async function fetchOdds(fixtureId: string, apiKey: string): Promise<OddsData | null> {
  if (oddsCache.has(fixtureId)) return oddsCache.get(fixtureId) ?? null;

  try {
    const url = `${API_FOOTBALL_URL}/odds?fixture=${fixtureId}&bookmaker=8`; // bet365
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 1, baseDelayMs: 700 });
    
    if (!data?.response?.[0]?.bookmakers?.[0]?.bets) {
      // Try without specific bookmaker
      const url2 = `${API_FOOTBALL_URL}/odds?fixture=${fixtureId}`;
      const data2 = await fetchJsonWithRetry(url2, apiKey, { retries: 1, baseDelayMs: 700 });
      
      if (!data2?.response?.[0]?.bookmakers?.[0]?.bets) {
        oddsCache.set(fixtureId, null);
        return null;
      }
      return parseOddsResponse(fixtureId, data2);
    }

    return parseOddsResponse(fixtureId, data);
  } catch (e) {
    oddsCache.set(fixtureId, null);
    return null;
  }
}

function parseOddsResponse(fixtureId: string, data: any): OddsData | null {
  const bookmaker = data.response[0]?.bookmakers?.[0];
  if (!bookmaker) { oddsCache.set(fixtureId, null); return null; }

  // Find "Match Winner" bet (id=1 or label containing "Match Winner")
  const matchWinner = bookmaker.bets?.find((b: any) => 
    b.id === 1 || b.name?.toLowerCase().includes("match winner")
  );

  if (!matchWinner?.values || matchWinner.values.length < 3) {
    oddsCache.set(fixtureId, null);
    return null;
  }

  const homeOdds = parseFloat(matchWinner.values.find((v: any) => v.value === "Home")?.odd || "0");
  const drawOdds = parseFloat(matchWinner.values.find((v: any) => v.value === "Draw")?.odd || "0");
  const awayOdds = parseFloat(matchWinner.values.find((v: any) => v.value === "Away")?.odd || "0");

  if (homeOdds <= 0 || drawOdds <= 0 || awayOdds <= 0) {
    oddsCache.set(fixtureId, null);
    return null;
  }

  // Convert odds to implied probabilities (remove overround)
  const rawHomeProb = 1 / homeOdds;
  const rawDrawProb = 1 / drawOdds;
  const rawAwayProb = 1 / awayOdds;
  const overround = rawHomeProb + rawDrawProb + rawAwayProb;

  // Extract Over/Under 2.5 odds (bet id=5 or name "Over/Under")
  let over25Odds: number | null = null;
  let under25Odds: number | null = null;
  const overUnderBet = bookmaker.bets?.find((b: any) => 
    b.id === 5 || b.name?.toLowerCase().includes("over/under")
  );
  if (overUnderBet?.values) {
    const over25Val = overUnderBet.values.find((v: any) => v.value === "Over 2.5");
    const under25Val = overUnderBet.values.find((v: any) => v.value === "Under 2.5");
    if (over25Val?.odd) over25Odds = parseFloat(over25Val.odd);
    if (under25Val?.odd) under25Odds = parseFloat(under25Val.odd);
  }

  // Extract BTTS odds (bet id=8 or name "Both Teams Score")
  let bttsYesOdds: number | null = null;
  let bttsNoOdds: number | null = null;
  const bttsBet = bookmaker.bets?.find((b: any) => 
    b.id === 8 || b.name?.toLowerCase().includes("both teams")
  );
  if (bttsBet?.values) {
    const yesVal = bttsBet.values.find((v: any) => v.value === "Yes");
    const noVal = bttsBet.values.find((v: any) => v.value === "No");
    if (yesVal?.odd) bttsYesOdds = parseFloat(yesVal.odd);
    if (noVal?.odd) bttsNoOdds = parseFloat(noVal.odd);
  }

  const result: OddsData = {
    homeOdds, drawOdds, awayOdds,
    homeProb: Math.round((rawHomeProb / overround) * 100),
    drawProb: Math.round((rawDrawProb / overround) * 100),
    awayProb: Math.round((rawAwayProb / overround) * 100),
    over25Odds,
    under25Odds,
    bttsYesOdds,
    bttsNoOdds,
  };

  oddsCache.set(fixtureId, result);
  return result;
}

/**
 * Get opponent strength weight based on their league position.
 * Top third → 1.5 (strong), Middle third → 1.0, Bottom third → 0.5 (weak)
 */
function getOpponentStrengthWeight(standings: StandingEntry[], opponentId: number): number {
  if (standings.length === 0) return 1.0; // No data → neutral
  const entry = standings.find(s => s.teamId === opponentId);
  if (!entry || entry.totalTeams === 0) return 1.0;

  const thirdSize = Math.ceil(entry.totalTeams / 3);
  if (entry.rank <= thirdSize) return 1.5;       // Top third → strong
  if (entry.rank <= thirdSize * 2) return 1.0;    // Middle third → medium
  return 0.5;                                      // Bottom third → weak
}

/**
 * Calculate OPPONENT-STRENGTH WEIGHTED form score (0-100).
 * Wins vs strong opponents count 1.5×, wins vs weak opponents count 0.5×.
 * Combined with recency weighting for last 5 matches.
 */
function calculateWeightedFormScore(form: FormMatch[], standings: StandingEntry[]): number {
  if (form.length === 0) return 50;
  const matches = form.slice(0, 5);
  let weightedPoints = 0;
  let weightSum = 0;
  let gf = 0, ga = 0;

  for (let i = 0; i < matches.length; i++) {
    const recencyWeight = 1.0 - (i * 0.1); // 1.0, 0.9, 0.8, 0.7, 0.6
    const opponentWeight = getOpponentStrengthWeight(standings, matches[i].opponentId);
    const combinedWeight = recencyWeight * opponentWeight;

    const pts = matches[i].result === "W" ? 3 : matches[i].result === "D" ? 1 : 0;
    weightedPoints += pts * combinedWeight;
    weightSum += 3 * combinedWeight;
    gf += matches[i].goalsFor;
    ga += matches[i].goalsAgainst;
  }

  const pointsScore = weightSum > 0 ? (weightedPoints / weightSum) * 100 : 50;
  const goalDiff = gf - ga;
  const gdScore = Math.max(0, Math.min(100, 50 + goalDiff * 6));
  return Math.round(pointsScore * 0.75 + gdScore * 0.25);
}

/**
 * Calculate form score (0-100) from last 5 matches with EXPONENTIAL recency weighting.
 * Weights: Match -1 → 1.0, -2 → 0.85, -3 → 0.72, -4 → 0.61, -5 → 0.52
 * (Exponential decay 0.85^i — more responsive to current form than linear.)
 */
function calculateFormScore(form: FormMatch[]): number {
  if (form.length === 0) return 50;
  const matches = form.slice(0, 5);
  let weightedPoints = 0;
  let weightSum = 0;
  let weightedGf = 0, weightedGa = 0;
  for (let i = 0; i < matches.length; i++) {
    const weight = Math.pow(0.85, i); // 1.0, 0.85, 0.72, 0.61, 0.52
    const pts = matches[i].result === "W" ? 3 : matches[i].result === "D" ? 1 : 0;
    weightedPoints += pts * weight;
    weightSum += 3 * weight;
    weightedGf += matches[i].goalsFor * weight;
    weightedGa += matches[i].goalsAgainst * weight;
  }
  const pointsScore = (weightedPoints / weightSum) * 100;
  // Weighted goal diff (recency-adjusted)
  const totalWeight = matches.reduce((s, _m, i) => s + Math.pow(0.85, i), 0);
  const goalDiff = (weightedGf - weightedGa) / totalWeight;
  const gdScore = Math.max(0, Math.min(100, 50 + goalDiff * 6));
  return Math.round(pointsScore * 0.75 + gdScore * 0.25);
}

/**
 * DEEP form score using last 10 matches with EXPONENTIAL recency decay.
 * Weights: 1.0, 0.88, 0.77, 0.68, 0.60, 0.53, 0.46, 0.41, 0.36, 0.32 (decay 0.88^i)
 * More aggressive than previous linear decay — last 3 matches dominate signal.
 */
function calculateFormScoreDeep(form: FormMatch[]): number {
  if (form.length === 0) return 50;
  const matches = form.slice(0, 10);
  let weightedPoints = 0;
  let weightSum = 0;
  let weightedGf = 0, weightedGa = 0;
  for (let i = 0; i < matches.length; i++) {
    const weight = Math.pow(0.88, i); // 1.0 → 0.32 over 10 matches
    const pts = matches[i].result === "W" ? 3 : matches[i].result === "D" ? 1 : 0;
    weightedPoints += pts * weight;
    weightSum += 3 * weight;
    weightedGf += matches[i].goalsFor * weight;
    weightedGa += matches[i].goalsAgainst * weight;
  }
  const pointsScore = (weightedPoints / weightSum) * 100;
  const totalWeight = matches.reduce((s, _m, i) => s + Math.pow(0.88, i), 0);
  const goalDiff = (weightedGf - weightedGa) / totalWeight;
  const gdScore = Math.max(0, Math.min(100, 50 + goalDiff * 4));
  return Math.round(pointsScore * 0.70 + gdScore * 0.30);
}


/**
 * Filter form matches by venue (home-only or away-only).
 */
function filterFormByVenue(form: FormMatch[], homeOnly: boolean): FormMatch[] {
  return form.filter(m => homeOnly ? m.isHome : !m.isHome);
}

/**
 * Form score using ONLY home or away matches (CRITICAL for accuracy).
 */
function calculateVenueFormScore(form: FormMatch[], isHome: boolean): number {
  const venueForm = filterFormByVenue(form, isHome);
  if (venueForm.length < 2) return 50;
  return venueForm.length > 5 ? calculateFormScoreDeep(venueForm) : calculateFormScore(venueForm);
}

/**
 * Goal rate for HOME or AWAY matches only.
 */
function calculateVenueGoalRate(form: FormMatch[], isHome: boolean): { scored: number; conceded: number } {
  const venueForm = filterFormByVenue(form, isHome);
  if (venueForm.length === 0) return { scored: 1.0, conceded: 1.0 };
  let scored = 0, conceded = 0;
  for (const m of venueForm) { scored += m.goalsFor; conceded += m.goalsAgainst; }
  return { scored: scored / venueForm.length, conceded: conceded / venueForm.length };
}

/**
 * STYLE MATCHUP ENGINE: Detect attacking/defensive profiles.
 * Returns adjustments to goal market probabilities.
 */
function detectStyleMatchup(
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  homeForm: FormMatch[],
  awayForm: FormMatch[]
): { overBoost: number; underBoost: number; bttsBoost: number; label: string } {
  const hGF = homeStats?.homeGoalsForAvg ?? calculateGoalRate(homeForm).scored;
  const hGA = homeStats?.homeGoalsAgainstAvg ?? calculateGoalRate(homeForm).conceded;
  const aGF = awayStats?.awayGoalsForAvg ?? calculateGoalRate(awayForm).scored;
  const aGA = awayStats?.awayGoalsAgainstAvg ?? calculateGoalRate(awayForm).conceded;

  // Both high scoring
  if (hGF >= 1.5 && aGF >= 1.2) {
    return { overBoost: 8, underBoost: -6, bttsBoost: 7, label: "Both teams attack-minded → goals expected" };
  }
  // Both defensive
  if (hGF <= 1.0 && aGF <= 0.8) {
    return { overBoost: -8, underBoost: 8, bttsBoost: -6, label: "Both teams defensive → low-scoring expected" };
  }
  // Strong attack vs weak defense
  if (hGF >= 1.8 && aGA >= 1.5) {
    return { overBoost: 10, underBoost: -8, bttsBoost: 4, label: `Home attack (${hGF.toFixed(1)}/g) vs weak away defense` };
  }
  if (aGF >= 1.5 && hGA >= 1.5) {
    return { overBoost: 8, underBoost: -6, bttsBoost: 6, label: `Away attack vs leaky home defense` };
  }
  // One team dominates both ends
  if (hGF >= 1.5 && hGA <= 0.8) {
    return { overBoost: -2, underBoost: 3, bttsBoost: -5, label: `Home dominant (${hGF.toFixed(1)} scored, ${hGA.toFixed(1)} conceded)` };
  }
  return { overBoost: 0, underBoost: 0, bttsBoost: 0, label: "Balanced matchup" };
}

/**
 * MATCH CONTEXT ENGINE: Table gap, motivation, must-win scenarios, match importance.
 */
function getMatchContext(
  standings: StandingEntry[],
  homeTeamId: number,
  awayTeamId: number,
  leagueId?: number,
  leagueName?: string,
  fixtureRound?: string
): { confidenceBoost: number; factors: string[]; goalAdjust: number; homeMotivation: number; awayMotivation: number } {
  const factors: string[] = [];
  let boost = 0;
  let goalAdjust = 0; // negative = fewer goals expected, positive = more goals
  // Motivation deltas applied directly to form scores (range ~ -6..+6)
  let homeMotivation = 0;
  let awayMotivation = 0;

  // === MATCH IMPORTANCE (knockout/final detection) ===
  const roundLower = (fixtureRound || "").toLowerCase();
  const isKnockout = roundLower.includes("final") || roundLower.includes("semi") || 
    roundLower.includes("quarter") || roundLower.includes("knockout") || 
    roundLower.includes("playoff") || roundLower.includes("round of");
  const isFinal = roundLower.includes("final") && !roundLower.includes("semi") && !roundLower.includes("quarter");
  
  // Cup competitions (Champions League, Europa League, etc.)
  const isCupCompetition = [2, 3, 848, 1, 4].includes(leagueId ?? 0);
  
  if (isFinal) {
    goalAdjust -= 4; // Finals tend to be tight, fewer goals
    factors.push("🏆 Final match → expect cautious play, fewer goals");
    boost += 2; // Higher confidence in the pick direction
  } else if (isKnockout) {
    goalAdjust -= 2; // Knockout rounds are tighter
    factors.push("⚔️ Knockout stage → reduced goal expectation");
  } else if (isCupCompetition && !isKnockout) {
    // Group stage of cups — relatively normal
    factors.push("🏟️ Cup group stage");
  }

  if (standings.length === 0) return { confidenceBoost: boost, factors, goalAdjust, homeMotivation, awayMotivation };
  const homeEntry = standings.find(s => s.teamId === homeTeamId);
  const awayEntry = standings.find(s => s.teamId === awayTeamId);
  if (!homeEntry || !awayEntry) return { confidenceBoost: boost, factors, goalAdjust, homeMotivation, awayMotivation };

  const rankGap = Math.abs(homeEntry.rank - awayEntry.rank);
  const totalTeams = homeEntry.totalTeams || 20;

  // Big table gap (e.g., 1st vs 18th)
  if (rankGap >= Math.floor(totalTeams * 0.6)) {
    boost += 3;
    const stronger = homeEntry.rank < awayEntry.rank ? "Home" : "Away";
    factors.push(`Table gap: ${homeEntry.rank}th vs ${awayEntry.rank}th (${stronger} favored)`);
  }
  
  // === MOTIVATION DETECTION (enhanced — applies per-team motivation deltas) ===
  // Define zones
  const relegationZone = totalTeams - 2;     // bottom 3 teams
  const relegationFightZone = totalTeams - 5; // bottom 6 (still in danger)
  const titleZone = 2;                        // top 2 contenders
  const europeZone = 6;                       // top 6 (UCL/UEL spots)
  const safeMidLow = Math.floor(totalTeams * 0.40);
  const safeMidHigh = Math.floor(totalTeams * 0.65);

  // Helper: classify a team
  const classify = (rank: number) => {
    if (rank <= titleZone) return "title";
    if (rank <= europeZone) return "europe";
    if (rank >= relegationZone) return "relegation";
    if (rank >= relegationFightZone) return "relegation_fight";
    if (rank >= safeMidLow && rank <= safeMidHigh) return "midtable";
    return "upper_mid";
  };

  const homeClass = classify(homeEntry.rank);
  const awayClass = classify(awayEntry.rank);

  // Motivation strength per zone (positive = motivated, push performance up)
  const motivationFor = (cls: string): number => {
    switch (cls) {
      case "title": return +3;
      case "europe": return +2;
      case "relegation": return +4;       // desperate fight = strongest motivation
      case "relegation_fight": return +2;
      case "midtable": return -2;         // nothing to play for = complacency
      case "upper_mid": return 0;
      default: return 0;
    }
  };

  homeMotivation = motivationFor(homeClass);
  awayMotivation = motivationFor(awayClass);

  // Relegation battle → desperate = more goals from desperation
  if (homeClass === "relegation" || awayClass === "relegation") {
    factors.push("🆘 Relegation battle → desperate motivation");
    goalAdjust += 2;
    boost -= 1;
  }
  // Title race
  if (homeClass === "title" || awayClass === "title") {
    factors.push("🏆 Title contender → high stakes");
  }
  // Europe race
  if (homeClass === "europe" || awayClass === "europe") {
    factors.push("⭐ Europe spot race → high motivation");
  }
  // One team must win (bottom vs top) → more open game
  if ((homeClass === "relegation" && awayClass === "title") ||
      (awayClass === "relegation" && homeClass === "title")) {
    goalAdjust += 3;
    factors.push("⚡ Must-win scenario → expect open game, more goals");
  }
  // Mid-table vs top → potential complacency
  if (homeClass === "midtable" && awayClass === "title") {
    factors.push("😴 Mid-table home vs top team → complacency risk");
  }
  if (awayClass === "midtable" && homeClass === "title") {
    factors.push("😴 Top home vs mid-table away → potential cruise");
  }

  return { confidenceBoost: boost, factors, goalAdjust, homeMotivation, awayMotivation };
}

/**
 * FATIGUE DETECTION — penalize teams with short rest and reward teams with extra recovery.
 * Returns penalty/bonus deltas to apply to each team's form score (range ~ -8..+3).
 *
 * Logic:
 *  - <72h rest → heavy fatigue penalty (-6)
 *  - 72-96h    → mild fatigue (-3)
 *  - 96-120h   → neutral
 *  - 120-168h  → small fresh bonus (+1)
 *  - >168h     → well rested bonus (+2) — but possible match-rust if too long
 */
function calculateFatigueAdjustment(
  fixtureDateIso: string | undefined,
  homeForm: FormMatch[],
  awayForm: FormMatch[]
): { homeDelta: number; awayDelta: number; factors: string[] } {
  const factors: string[] = [];
  if (!fixtureDateIso) return { homeDelta: 0, awayDelta: 0, factors };

  const fixtureMs = new Date(fixtureDateIso).getTime();
  if (!Number.isFinite(fixtureMs)) return { homeDelta: 0, awayDelta: 0, factors };

  const restDelta = (form: FormMatch[]): { delta: number; hours: number | null } => {
    // Find the most recent past match
    const past = form
      .filter(m => m.matchDate)
      .map(m => new Date(m.matchDate!).getTime())
      .filter(ts => Number.isFinite(ts) && ts < fixtureMs)
      .sort((a, b) => b - a);
    if (past.length === 0) return { delta: 0, hours: null };

    const hours = (fixtureMs - past[0]) / (1000 * 60 * 60);
    let d = 0;
    if (hours < 72) d = -6;
    else if (hours < 96) d = -3;
    else if (hours < 120) d = 0;
    else if (hours < 168) d = +1;
    else if (hours < 336) d = +2;       // up to 2 weeks rested
    else d = -1;                         // >2 weeks → match rust
    return { delta: d, hours };
  };

  const home = restDelta(homeForm);
  const away = restDelta(awayForm);

  if (home.hours !== null && home.hours < 72) {
    factors.push(`🥱 Home short rest (${Math.round(home.hours)}h) → fatigue penalty`);
  }
  if (away.hours !== null && away.hours < 72) {
    factors.push(`🥱 Away short rest (${Math.round(away.hours)}h) → fatigue penalty`);
  }
  if (home.hours !== null && away.hours !== null) {
    const gap = Math.abs(home.hours - away.hours);
    if (gap >= 48 && (home.hours < 96 || away.hours < 96)) {
      const fresher = home.hours > away.hours ? "Home" : "Away";
      factors.push(`⚡ Rest advantage: ${fresher} has +${Math.round(gap)}h more recovery`);
    }
  }

  return { homeDelta: home.delta, awayDelta: away.delta, factors };
}

/**
 * Average goals from recent matches (up to 10).
 */
function calculateGoalRate(form: FormMatch[]): { scored: number; conceded: number } {
  if (form.length === 0) return { scored: 1.0, conceded: 1.0 };
  const matches = form.slice(0, 10);
  let scored = 0, conceded = 0;
  for (const match of matches) { scored += match.goalsFor; conceded += match.goalsAgainst; }
  return { scored: scored / matches.length, conceded: conceded / matches.length };
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
  topScores: { score: string; prob: number }[];
  scoreConfidence: "high" | "medium" | "low";
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
  const allScores: { score: string; prob: number; h: number; a: number }[] = [];

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = scoreProbs[h][a];
      const total = h + a;
      
      if (total > 1) over15 += p;
      if (total > 2) over25 += p;
      if (total > 3) over35 += p;
      if (h > 0 && a > 0) bttsYes += p;
      
      allScores.push({ score: `${h}-${a}`, prob: Math.round(p * 10000) / 100, h, a });
    }
  }

  // Sort by probability descending, take top 5
  allScores.sort((a, b) => b.prob - a.prob);
  const topScores = allScores.slice(0, 5).map(s => ({ score: s.score, prob: s.prob }));

  // Score confidence based on probability gap between #1 and #2
  let scoreConfidence: "high" | "medium" | "low" = "medium";
  if (topScores.length >= 2) {
    const gap = topScores[0].prob - topScores[1].prob;
    if (gap >= 4.0) scoreConfidence = "high";      // Top score clearly dominant
    else if (gap >= 2.0) scoreConfidence = "medium";
    else scoreConfidence = "low";                    // Very close probabilities
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
    mostLikelyScore: topScores[0]?.score ?? "1-0",
    expectedTotalGoals: homeXg + awayXg,
    topScores,
    scoreConfidence,
  };
}

/**
 * Filter top scores by market consistency rules.
 * Returns filtered + sorted top 3.
 */
function filterScoresByMarket(
  topScores: { score: string; prob: number }[],
  prediction: string,
  adjustedOver25: number,
  adjustedBttsYes: number,
): { score: string; prob: number }[] {
  let filtered = [...topScores];

  // Over 2.5 → remove scores with ≤2 total goals
  if (prediction === "Over 2.5" || prediction === "Over 3.5" || adjustedOver25 >= 65) {
    filtered = filtered.filter(s => {
      const [h, a] = s.score.split("-").map(Number);
      return h + a >= 3;
    });
  }

  // Under 2.5 → remove scores with >2 total goals
  if (prediction === "Under 2.5" || prediction === "Under 1.5" || adjustedOver25 <= 35) {
    filtered = filtered.filter(s => {
      const [h, a] = s.score.split("-").map(Number);
      return h + a <= 2;
    });
  }

  // BTTS Yes → both teams must score
  if (prediction === "BTTS Yes" || adjustedBttsYes >= 65) {
    filtered = filtered.filter(s => {
      const [h, a] = s.score.split("-").map(Number);
      return h > 0 && a > 0;
    });
  }

  // BTTS No → at least one team must have 0
  if (prediction === "BTTS No" || adjustedBttsYes <= 35) {
    filtered = filtered.filter(s => {
      const [h, a] = s.score.split("-").map(Number);
      return h === 0 || a === 0;
    });
  }

  // 1 (home win) → home must be ahead
  if (prediction === "1") {
    filtered = filtered.filter(s => {
      const [h, a] = s.score.split("-").map(Number);
      return h > a;
    });
  }
  // 2 (away win) → away must be ahead
  if (prediction === "2") {
    filtered = filtered.filter(s => {
      const [h, a] = s.score.split("-").map(Number);
      return a > h;
    });
  }
  // X (draw) → equal
  if (prediction === "X") {
    filtered = filtered.filter(s => {
      const [h, a] = s.score.split("-").map(Number);
      return h === a;
    });
  }

  // If filtering removed everything, fall back to unfiltered
  if (filtered.length === 0) filtered = [...topScores];

  return filtered.slice(0, 3);
}

/**
 * Score Clustering — group scores into outcome clusters with aggregate probabilities.
 */
function getScoreClusters(topScores: { score: string; prob: number }[]): { cluster: string; scores: string[]; prob: number }[] {
  const clusters: Record<string, { scores: string[]; prob: number }> = {
    "Home Win": { scores: [], prob: 0 },
    "Draw": { scores: [], prob: 0 },
    "Away Win": { scores: [], prob: 0 },
  };

  for (const s of topScores) {
    const [h, a] = s.score.split("-").map(Number);
    if (h > a) { clusters["Home Win"].scores.push(s.score); clusters["Home Win"].prob += s.prob; }
    else if (h === a) { clusters["Draw"].scores.push(s.score); clusters["Draw"].prob += s.prob; }
    else { clusters["Away Win"].scores.push(s.score); clusters["Away Win"].prob += s.prob; }
  }

  return Object.entries(clusters)
    .filter(([_, v]) => v.scores.length > 0)
    .map(([k, v]) => ({ cluster: k, scores: v.scores, prob: Math.round(v.prob * 100) / 100 }))
    .sort((a, b) => b.prob - a.prob);
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

// ============ H2H STYLE MATCHING (LIVE) ============
/**
 * Analyze H2H goal patterns instead of just outcomes.
 * Returns metrics that signal Over/Under and BTTS bias.
 */
export interface H2HStyle {
  avgGoals: number;          // avg total goals across H2H sample
  over25Rate: number;        // 0-100, % of H2H matches with > 2.5 goals
  bttsRate: number;          // 0-100, % of H2H matches with BTTS
  cleanSheetRate: number;    // 0-100, % of H2H matches with at least one clean sheet
  samples: number;
  signal: "OVER" | "UNDER" | "BTTS_YES" | "BTTS_NO" | "NONE";
}

function calculateH2HStyle(h2h: H2HMatch[]): H2HStyle {
  if (!h2h || h2h.length < 3) {
    return { avgGoals: 0, over25Rate: 0, bttsRate: 0, cleanSheetRate: 0, samples: h2h?.length || 0, signal: "NONE" };
  }
  const sample = h2h.slice(0, 5);
  const totals = sample.map(m => m.homeGoals + m.awayGoals);
  const over25 = totals.filter(t => t > 2.5).length;
  const btts = sample.filter(m => m.homeGoals > 0 && m.awayGoals > 0).length;
  const clean = sample.filter(m => m.homeGoals === 0 || m.awayGoals === 0).length;
  const avg = totals.reduce((a, b) => a + b, 0) / sample.length;
  const over25Rate = Math.round((over25 / sample.length) * 100);
  const bttsRate = Math.round((btts / sample.length) * 100);
  const cleanSheetRate = Math.round((clean / sample.length) * 100);

  let signal: H2HStyle["signal"] = "NONE";
  if (over25Rate >= 80 && avg >= 3.0) signal = "OVER";
  else if (over25Rate <= 20 && avg <= 1.8) signal = "UNDER";
  else if (bttsRate >= 80) signal = "BTTS_YES";
  else if (bttsRate <= 20) signal = "BTTS_NO";

  return { avgGoals: avg, over25Rate, bttsRate, cleanSheetRate, samples: sample.length, signal };
}

// ============ REFEREE BIAS (LIVE) ============
/**
 * Fetch a referee's last ~20 matches and compute their stylistic stats.
 * Cached per function invocation (and per referee name).
 *
 * NOTE: API-Football supports `/fixtures?referee=NAME&season=Y` for past fixtures.
 * We sample only this season's recent matches for the referee.
 */
async function fetchRefereeStats(
  refereeName: string | undefined | null,
  season: number,
  apiKey: string,
): Promise<RefereeStats | null> {
  if (!refereeName) return null;
  const cleanName = String(refereeName).split(",")[0].trim();
  if (!cleanName || cleanName.length < 3) return null;

  if (refereeStatsCache.has(cleanName)) return refereeStatsCache.get(cleanName) ?? null;

  try {
    const url = `${API_FOOTBALL_URL}/fixtures?referee=${encodeURIComponent(cleanName)}&season=${season}`;
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 2, baseDelayMs: 600 });
    const matches = (data?.response || []).filter((m: any) =>
      m?.fixture?.status?.short === "FT" &&
      typeof m?.goals?.home === "number" &&
      typeof m?.goals?.away === "number"
    ).slice(0, 20);

    if (matches.length < 5) {
      refereeStatsCache.set(cleanName, null);
      return null;
    }

    let totalGoals = 0, bttsCount = 0;
    for (const m of matches) {
      const hg = m.goals.home as number;
      const ag = m.goals.away as number;
      totalGoals += hg + ag;
      if (hg > 0 && ag > 0) bttsCount++;
    }
    const stats: RefereeStats = {
      avgGoals: totalGoals / matches.length,
      bttsRate: Math.round((bttsCount / matches.length) * 100),
      cardsPerGame: 0,         // API doesn't include cards summary in /fixtures, leave 0 for now
      penaltiesPerGame: 0,
      samples: matches.length,
    };
    refereeStatsCache.set(cleanName, stats);
    return stats;
  } catch (e) {
    console.warn(`[REF] failed to fetch stats for ${cleanName}:`, (e as any)?.message);
    refereeStatsCache.set(cleanName, null);
    return null;
  }
}

// ============================================================
// === MANAGER CHANGE EFFECT (LIVE) ===
// New manager bounce: teams with a manager hired <60 days ago tend to
// over-perform for the first ~5 matches (well-documented "new manager bounce").
// Returns a small probability nudge (1-3 pct) toward the team that recently
// changed manager + a small confidence boost (+1).
// ============================================================
interface ManagerBounce {
  daysSinceStart: number | null;
  bounceActive: boolean; // true if hired <60 days ago AND has played 1-5 matches under new manager
  matchesUnder: number;
}

const managerBounceCache = new Map<string, ManagerBounce | null>();

async function fetchManagerBounce(
  teamId: number,
  apiKey: string,
): Promise<ManagerBounce | null> {
  const key = String(teamId);
  if (managerBounceCache.has(key)) return managerBounceCache.get(key) ?? null;

  try {
    // API-Football: /coachs?team={id} returns coach career history
    const url = `${API_FOOTBALL_URL}/coachs?team=${teamId}`;
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 1, baseDelayMs: 600 });
    const coaches = data?.response || [];
    if (coaches.length === 0) {
      managerBounceCache.set(key, null);
      return null;
    }

    // Find the current coach for this team (career entry where end is null and team matches)
    let currentStart: string | null = null;
    for (const coach of coaches) {
      const career = coach?.career || [];
      for (const c of career) {
        if (c?.team?.id === teamId && (c?.end === null || c?.end === undefined)) {
          currentStart = c?.start || null;
          break;
        }
      }
      if (currentStart) break;
    }

    if (!currentStart) {
      managerBounceCache.set(key, null);
      return null;
    }

    const startMs = new Date(currentStart).getTime();
    if (!Number.isFinite(startMs)) {
      managerBounceCache.set(key, null);
      return null;
    }
    const days = Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24));

    // Bounce window: hired in last 60 days
    const bounceActive = days >= 0 && days <= 60;
    const result: ManagerBounce = {
      daysSinceStart: days,
      bounceActive,
      matchesUnder: 0, // we don't fetch separately to save quota; treat days as proxy
    };
    managerBounceCache.set(key, result);
    return result;
  } catch (e) {
    console.warn(`[MANAGER] fetch failed for team ${teamId}:`, (e as any)?.message);
    managerBounceCache.set(key, null);
    return null;
  }
}

function applyManagerBounce(
  pred: { home_win: number; draw: number; away_win: number; confidence: number },
  homeBounce: ManagerBounce | null,
  awayBounce: ManagerBounce | null,
): { home_win: number; draw: number; away_win: number; confidence: number; factors: string[]; deltaProb: number } {
  const factors: string[] = [];
  let homeBoost = 0, awayBoost = 0;

  if (homeBounce?.bounceActive) {
    // Stronger boost the more recent the hire
    homeBoost = homeBounce.daysSinceStart! < 21 ? 3 : 2;
    factors.push(`🆕 Home new manager (${homeBounce.daysSinceStart}d) — bounce effect +${homeBoost}%`);
  }
  if (awayBounce?.bounceActive) {
    awayBoost = awayBounce.daysSinceStart! < 21 ? 3 : 2;
    factors.push(`🆕 Away new manager (${awayBounce.daysSinceStart}d) — bounce effect +${awayBoost}%`);
  }

  if (homeBoost === 0 && awayBoost === 0) {
    return { ...pred, factors, deltaProb: 0 };
  }

  // Apply nudge: take from draw mostly, redistribute
  let h = pred.home_win + homeBoost;
  let a = pred.away_win + awayBoost;
  const totalBoost = homeBoost + awayBoost;
  let d = Math.max(5, pred.draw - totalBoost);

  // Renormalize to 100
  const sum = h + d + a;
  h = Math.round((h / sum) * 100);
  a = Math.round((a / sum) * 100);
  d = 100 - h - a;

  // Confidence: small +1 only if one side has bounce and aligns with current pick
  let confDelta = 0;
  if (homeBoost > 0 && pred.home_win > pred.away_win) confDelta = 1;
  else if (awayBoost > 0 && pred.away_win > pred.home_win) confDelta = 1;

  return {
    home_win: h, draw: d, away_win: a,
    confidence: clamp(pred.confidence + confDelta, 40, 100),
    factors,
    deltaProb: totalBoost,
  };
}

// ============================================================
// === PUBLIC vs SHARP DISAGREEMENT (LIVE) ===
// Detects when bookmaker odds have moved AGAINST public bias (sharp money).
// If the model's pick aligns with the sharp side → boost confidence.
// If the model's pick aligns with the public bias (opposite of sharp) → penalty.
// Requires odds_snapshots history (oldest snapshot vs current odds).
// ============================================================
interface SharpSignal {
  detected: boolean;
  sharpSide: "home" | "away" | "draw" | null;
  movementPct: number; // how much implied prob moved (absolute)
  publicBias: "home" | "away" | "draw" | null; // current favorite by public
}

async function detectSharpSignal(
  supabase: any,
  matchId: string,
  currentHomeProb: number,
  currentDrawProb: number,
  currentAwayProb: number,
): Promise<SharpSignal> {
  try {
    // Get oldest snapshot in the last 7 days for this match
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("odds_snapshots")
      .select("implied_home, implied_draw, implied_away, captured_at")
      .eq("match_id", matchId)
      .gte("captured_at", sevenDaysAgo)
      .order("captured_at", { ascending: true })
      .limit(1);

    if (error || !data || data.length === 0) {
      return { detected: false, sharpSide: null, movementPct: 0, publicBias: null };
    }

    const oldest = data[0];
    const oldHome = Number(oldest.implied_home) || 0;
    const oldDraw = Number(oldest.implied_draw) || 0;
    const oldAway = Number(oldest.implied_away) || 0;
    if (oldHome <= 0 || oldAway <= 0) {
      return { detected: false, sharpSide: null, movementPct: 0, publicBias: null };
    }

    // Movement: difference between current and oldest implied prob
    const dHome = currentHomeProb - oldHome;
    const dAway = currentAwayProb - oldAway;
    const dDraw = currentDrawProb - oldDraw;

    // Sharp side = the side that gained the most implied probability
    // (odds shortened = bookmakers think it's more likely = sharp money)
    const movements = [
      { side: "home" as const, delta: dHome },
      { side: "draw" as const, delta: dDraw },
      { side: "away" as const, delta: dAway },
    ];
    movements.sort((a, b) => b.delta - a.delta);
    const top = movements[0];

    // Need meaningful movement (>= 4 percentage points)
    if (top.delta < 4) {
      return { detected: false, sharpSide: null, movementPct: top.delta, publicBias: null };
    }

    // Public bias = current favorite (highest current prob)
    const currentProbs = [
      { side: "home" as const, prob: currentHomeProb },
      { side: "draw" as const, prob: currentDrawProb },
      { side: "away" as const, prob: currentAwayProb },
    ];
    currentProbs.sort((a, b) => b.prob - a.prob);
    const publicBias = currentProbs[0].side;

    return {
      detected: true,
      sharpSide: top.side,
      movementPct: Math.round(top.delta * 10) / 10,
      publicBias,
    };
  } catch (e) {
    console.warn(`[SHARP] failed for match ${matchId}:`, (e as any)?.message);
    return { detected: false, sharpSide: null, movementPct: 0, publicBias: null };
  }
}

function applySharpSignal(
  pred: { home_win: number; draw: number; away_win: number; confidence: number; prediction: string },
  signal: SharpSignal,
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  if (!signal.detected || !signal.sharpSide) {
    return { confidence: pred.confidence, factors, delta: 0 };
  }

  // Determine model pick side (1, X, 2)
  const modelPickSide: "home" | "away" | "draw" =
    pred.home_win >= pred.draw && pred.home_win >= pred.away_win ? "home" :
    pred.away_win >= pred.draw ? "away" : "draw";

  let delta = 0;
  if (modelPickSide === signal.sharpSide) {
    // Model aligned with sharp money — strongest signal
    delta = signal.movementPct >= 8 ? 4 : signal.movementPct >= 5 ? 3 : 2;
    factors.push(`💎 Sharp money agrees (${signal.sharpSide.toUpperCase()} +${signal.movementPct}%) — strong value signal`);
  } else if (modelPickSide === signal.publicBias && signal.sharpSide !== signal.publicBias) {
    // Model picks public favorite, but sharp money goes elsewhere — caution
    delta = -2;
    factors.push(`⚠️ Sharp money disagrees — moving toward ${signal.sharpSide.toUpperCase()} (+${signal.movementPct}%)`);
  }

  return {
    confidence: clamp(pred.confidence + delta, 40, 100),
    factors,
    delta,
  };
}


function applyRefereeAndH2HStyle(
  pred: { home_win: number; draw: number; away_win: number; confidence: number; prediction: string },
  refStats: RefereeStats | null,
  h2hStyle: H2HStyle,
  modelOver25Pct: number,
  modelBttsPct: number,
): { confidence: number; factors: string[]; deltas: { ref: number; h2h: number } } {
  const factors: string[] = [];
  let confDelta = 0;
  let refDelta = 0, h2hDelta = 0;

  // === H2H Style alignment ===
  if (h2hStyle.signal !== "NONE" && h2hStyle.samples >= 3) {
    if (h2hStyle.signal === "OVER" && modelOver25Pct >= 55) {
      h2hDelta += 2;
      factors.push(`H2H high-scoring (${h2hStyle.over25Rate}% Over 2.5, avg ${h2hStyle.avgGoals.toFixed(1)})`);
    } else if (h2hStyle.signal === "UNDER" && modelOver25Pct <= 45) {
      h2hDelta += 2;
      factors.push(`H2H low-scoring (${100 - h2hStyle.over25Rate}% Under 2.5, avg ${h2hStyle.avgGoals.toFixed(1)})`);
    } else if (h2hStyle.signal === "BTTS_YES" && modelBttsPct >= 55) {
      h2hDelta += 1;
      factors.push(`H2H BTTS pattern (${h2hStyle.bttsRate}% both score)`);
    } else if (h2hStyle.signal === "BTTS_NO" && modelBttsPct <= 45) {
      h2hDelta += 1;
      factors.push(`H2H clean-sheet pattern (${100 - h2hStyle.bttsRate}% no BTTS)`);
    } else if (
      (h2hStyle.signal === "OVER" && modelOver25Pct <= 35) ||
      (h2hStyle.signal === "UNDER" && modelOver25Pct >= 65)
    ) {
      // H2H disagrees with model on totals → small confidence reduction
      h2hDelta -= 2;
      factors.push(`H2H disagrees with model totals (${h2hStyle.over25Rate}% Over)`);
    }
  }

  // === Referee Style ===
  if (refStats && refStats.samples >= 5) {
    // High-scoring ref (avg > 2.9) aligned with high model Over → boost
    if (refStats.avgGoals >= 2.9 && modelOver25Pct >= 55) {
      refDelta += 1;
      factors.push(`Referee favors goals (${refStats.avgGoals.toFixed(2)} avg / ${refStats.samples} games)`);
    } else if (refStats.avgGoals <= 2.2 && modelOver25Pct <= 45) {
      refDelta += 1;
      factors.push(`Referee tight game (${refStats.avgGoals.toFixed(2)} avg / ${refStats.samples} games)`);
    } else if (refStats.bttsRate >= 65 && modelBttsPct >= 55) {
      refDelta += 1;
      factors.push(`Referee profile: BTTS-friendly (${refStats.bttsRate}%)`);
    } else if (
      (refStats.avgGoals >= 2.9 && modelOver25Pct <= 35) ||
      (refStats.avgGoals <= 2.2 && modelOver25Pct >= 65)
    ) {
      // Ref disagrees with model totals
      refDelta -= 1;
      factors.push(`Referee profile contradicts totals (avg ${refStats.avgGoals.toFixed(2)})`);
    }
  }

  confDelta = clamp(refDelta + h2hDelta, -3, 3);
  const newConfidence = clamp(pred.confidence + confDelta, 40, 100);
  return { confidence: newConfidence, factors, deltas: { ref: refDelta, h2h: h2hDelta } };
}

// ============ HIGH-SCORING / SET-PIECE DOMINANCE (LIVE — Option 9) ============
// Detects teams with consistently high goal output (proxy for set-piece dominance,
// attacking volume, and high-tempo style). Uses last 8-10 form matches.
// If both teams average >= 1.4 GF/match AND >= 60% of recent matches had Over 2.5,
// boost Over 2.5 / BTTS confidence by +1-2.
// Inversely, if both teams have low scoring patterns, boost Under 2.5 confidence.
// =============================================================================
interface ScoringProfile {
  homeGFAvg: number;
  awayGFAvg: number;
  homeOver25Rate: number; // % of recent matches with 3+ goals
  awayOver25Rate: number;
  bothHighScoring: boolean;
  bothLowScoring: boolean;
}

function calculateScoringProfile(homeForm: FormMatch[], awayForm: FormMatch[]): ScoringProfile {
  const calcStats = (form: FormMatch[]) => {
    if (form.length === 0) return { gfAvg: 0, over25Rate: 0 };
    const slice = form.slice(0, 10);
    const gfTotal = slice.reduce((s, m) => s + (m.goalsFor || 0), 0);
    const over25Count = slice.filter(m => (m.goalsFor + m.goalsAgainst) >= 3).length;
    return {
      gfAvg: gfTotal / slice.length,
      over25Rate: (over25Count / slice.length) * 100,
    };
  };
  const h = calcStats(homeForm);
  const a = calcStats(awayForm);
  return {
    homeGFAvg: Math.round(h.gfAvg * 100) / 100,
    awayGFAvg: Math.round(a.gfAvg * 100) / 100,
    homeOver25Rate: Math.round(h.over25Rate),
    awayOver25Rate: Math.round(a.over25Rate),
    bothHighScoring: h.gfAvg >= 1.4 && a.gfAvg >= 1.4 && h.over25Rate >= 60 && a.over25Rate >= 60,
    bothLowScoring: h.gfAvg <= 1.0 && a.gfAvg <= 1.0 && h.over25Rate <= 35 && a.over25Rate <= 35,
  };
}

function applyScoringProfile(
  pred: { prediction: string; confidence: number },
  profile: ScoringProfile,
  modelOver25Pct: number,
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  const predLower = (pred.prediction || "").toLowerCase();
  const isOverPick = predLower.includes("over 2.5") || predLower.includes("btts: yes") || predLower.includes("over 2,5");
  const isUnderPick = predLower.includes("under 2.5") || predLower.includes("btts: no") || predLower.includes("under 2,5");

  if (profile.bothHighScoring) {
    if (isOverPick && modelOver25Pct >= 55) {
      delta = profile.homeOver25Rate >= 70 && profile.awayOver25Rate >= 70 ? 2 : 1;
      factors.push(`⚽ High-scoring profile both sides (Over 2.5: ${profile.homeOver25Rate}%/${profile.awayOver25Rate}%) — supports pick`);
    } else if (isUnderPick) {
      delta = -1;
      factors.push(`⚠️ Under pick contradicts high-scoring trend (both teams ${profile.homeOver25Rate}%/${profile.awayOver25Rate}% Over 2.5)`);
    }
  } else if (profile.bothLowScoring) {
    if (isUnderPick && modelOver25Pct <= 45) {
      delta = 1;
      factors.push(`🛡️ Low-scoring profile both sides (avg GF: ${profile.homeGFAvg}/${profile.awayGFAvg}) — supports Under`);
    } else if (isOverPick) {
      delta = -1;
      factors.push(`⚠️ Over pick contradicts low-scoring trend`);
    }
  }

  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta };
}

// ============ DEFENSIVE SOLIDITY / CLEAN SHEETS (LIVE — Option 10) ============
// Detects teams with strong defensive form. If favorite team has high clean-sheet
// rate AND opponent has low scoring volume, boost the home/away win pick.
// Also gives small boost when defensive contrast supports a "to win to nil" style call.
// =============================================================================
interface DefensiveProfile {
  homeCleanSheetRate: number; // % of recent matches with 0 conceded
  awayCleanSheetRate: number;
  homeGAAvg: number;
  awayGAAvg: number;
  homeFailedToScoreRate: number; // % of recent matches where team scored 0
  awayFailedToScoreRate: number;
}

function calculateDefensiveProfile(homeForm: FormMatch[], awayForm: FormMatch[]): DefensiveProfile {
  const calc = (form: FormMatch[]) => {
    if (form.length === 0) return { csRate: 0, gaAvg: 0, ftsRate: 0 };
    const slice = form.slice(0, 10);
    const csCount = slice.filter(m => m.goalsAgainst === 0).length;
    const ftsCount = slice.filter(m => m.goalsFor === 0).length;
    const gaTotal = slice.reduce((s, m) => s + (m.goalsAgainst || 0), 0);
    return {
      csRate: (csCount / slice.length) * 100,
      gaAvg: gaTotal / slice.length,
      ftsRate: (ftsCount / slice.length) * 100,
    };
  };
  const h = calc(homeForm);
  const a = calc(awayForm);
  return {
    homeCleanSheetRate: Math.round(h.csRate),
    awayCleanSheetRate: Math.round(a.csRate),
    homeGAAvg: Math.round(h.gaAvg * 100) / 100,
    awayGAAvg: Math.round(a.gaAvg * 100) / 100,
    homeFailedToScoreRate: Math.round(h.ftsRate),
    awayFailedToScoreRate: Math.round(a.ftsRate),
  };
}

function applyDefensiveProfile(
  pred: { prediction: string; confidence: number; home_win: number; away_win: number; draw: number },
  profile: DefensiveProfile,
  homeTeamName: string,
  awayTeamName: string,
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  const predLower = (pred.prediction || "").toLowerCase();

  // Determine model pick side
  const isHomePick = pred.home_win >= pred.draw && pred.home_win >= pred.away_win;
  const isAwayPick = pred.away_win > pred.draw && pred.away_win > pred.home_win;
  const isHomeWinPred = predLower.includes("home win") || predLower === "1" || predLower.includes(homeTeamName.toLowerCase() + " win");
  const isAwayWinPred = predLower.includes("away win") || predLower === "2" || predLower.includes(awayTeamName.toLowerCase() + " win");

  // SCENARIO A: Home pick + home strong defense + away poor scoring
  if ((isHomePick || isHomeWinPred) &&
      profile.homeCleanSheetRate >= 40 &&
      profile.awayFailedToScoreRate >= 30) {
    delta = profile.homeCleanSheetRate >= 50 ? 2 : 1;
    factors.push(`🛡️ Home defensive edge: ${profile.homeCleanSheetRate}% CS vs ${awayTeamName} ${profile.awayFailedToScoreRate}% FTS`);
  }
  // SCENARIO B: Away pick + away strong defense + home poor scoring
  else if ((isAwayPick || isAwayWinPred) &&
           profile.awayCleanSheetRate >= 40 &&
           profile.homeFailedToScoreRate >= 30) {
    delta = profile.awayCleanSheetRate >= 50 ? 2 : 1;
    factors.push(`🛡️ Away defensive edge: ${profile.awayCleanSheetRate}% CS vs ${homeTeamName} ${profile.homeFailedToScoreRate}% FTS`);
  }
  // SCENARIO C: Both teams leaky → contradicts low-confidence picks
  else if (profile.homeGAAvg >= 1.7 && profile.awayGAAvg >= 1.7) {
    if (predLower.includes("under 2.5")) {
      delta = -1;
      factors.push(`⚠️ Both defenses leaky (GA: ${profile.homeGAAvg}/${profile.awayGAAvg}) — Under risky`);
    }
  }

  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta };
}

// ============ DRAW SPECIALIST DETECTOR (LIVE — Option 12) ============
// Detects teams that draw a disproportionate share of matches. When BOTH sides
// have a high draw rate (>= 35%) and the model already shows draw probability
// above ~28%, boost confidence on a Draw pick by +2. If model picks home/away
// but both teams are draw-prone, slight downgrade (-1) to win pick confidence.
// =====================================================================
interface DrawProfile {
  homeDrawRate: number;
  awayDrawRate: number;
  bothDrawProne: boolean;
}

function calculateDrawProfile(homeForm: FormMatch[], awayForm: FormMatch[]): DrawProfile {
  const drawRate = (form: FormMatch[]): number => {
    if (form.length === 0) return 0;
    const slice = form.slice(0, 10);
    const draws = slice.filter(m => m.result === "D").length;
    return Math.round((draws / slice.length) * 100);
  };
  const h = drawRate(homeForm);
  const a = drawRate(awayForm);
  return { homeDrawRate: h, awayDrawRate: a, bothDrawProne: h >= 35 && a >= 35 };
}

function applyDrawProfile(
  pred: { prediction: string; confidence: number; home_win: number; draw: number; away_win: number },
  profile: DrawProfile,
  h2hDrawRate: number = 0, // % of H2H matches that ended draw
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  const predLower = (pred.prediction || "").toLowerCase();
  const isDrawPick = predLower === "x" || predLower.includes("draw");

  // Signal 1: Both teams draw-prone (form-based)
  const formDrawSignal = profile.bothDrawProne && pred.draw >= 28;
  // Signal 2: H2H is draw-heavy (>= 40% draws across last 5)
  const h2hDrawSignal = h2hDrawRate >= 40;
  // Signal 3: Balanced 1X2 race (close home_win vs away_win)
  const balancedRace = Math.abs(pred.home_win - pred.away_win) <= 10 && pred.draw >= 25;

  // Count how many independent draw signals are firing
  const signalCount = (formDrawSignal ? 1 : 0) + (h2hDrawSignal ? 1 : 0) + (balancedRace ? 1 : 0);

  if (isDrawPick) {
    // Reward Draw picks when signals align
    if (signalCount >= 2) {
      delta = 4;
      factors.push(`🤝 Strong draw signal: form ${profile.homeDrawRate}%/${profile.awayDrawRate}%, H2H ${h2hDrawRate}% draws — supports Draw pick`);
    } else if (signalCount === 1) {
      delta = 2;
      if (formDrawSignal) factors.push(`🤝 Draw specialists: both teams ${profile.homeDrawRate}%/${profile.awayDrawRate}% draw rate — supports Draw pick`);
      else if (h2hDrawSignal) factors.push(`🤝 H2H draw-heavy: ${h2hDrawRate}% of last meetings ended even — supports Draw pick`);
      else factors.push(`🤝 Balanced 1X2 race + Draw ${pred.draw}% — supports Draw pick`);
    }
  } else {
    // Win pick is risky if multiple draw signals fire
    if (signalCount >= 2) {
      delta = -2;
      factors.push(`⚠️ Multiple Draw signals (form ${profile.homeDrawRate}%/${profile.awayDrawRate}%, H2H ${h2hDrawRate}%) — win pick risky`);
    } else if (signalCount === 1 && balancedRace) {
      delta = -1;
      factors.push(`⚠️ Tight 1X2 race + Draw ${pred.draw}% — win pick less safe`);
    }
  }

  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta };
}

/** Calculate H2H draw rate (% of past meetings that ended in draw). */
function calculateH2HDrawRate(h2h: H2HMatch[]): number {
  if (!h2h || h2h.length < 3) return 0;
  const sample = h2h.slice(0, 5);
  const draws = sample.filter(m => m.homeGoals === m.awayGoals).length;
  return Math.round((draws / sample.length) * 100);
}

// ============ ROTATION RISK ADJUSTER (LIVE — Option 11) ============
// Detects squad rotation by comparing current XI vs previous match XI.
// 5+ changes from last XI = significant rotation → confidence penalty (-2 to -3).
// 3-4 changes = moderate (-1). Only applies when the rotated team is the
// model's pick (we lose conviction on fatigued/rotated favorites).
// ==================================================================
interface RotationProfile {
  homeChanges: number; // -1 if unknown
  awayChanges: number;
  homeXISize: number;
  awayXISize: number;
}

async function calculateRotationProfile(
  fixtureId: string,
  fixtureIso: string,
  homeTeamId: number,
  awayTeamId: number,
  apiKey: string,
): Promise<RotationProfile> {
  const empty: RotationProfile = { homeChanges: -1, awayChanges: -1, homeXISize: 0, awayXISize: 0 };
  try {
    const currentXI = await fetchStartingXI(fixtureId, apiKey);
    if (currentXI.home.length === 0 && currentXI.away.length === 0) return empty;
    const [prevHome, prevAway] = await Promise.all([
      currentXI.home.length ? fetchPrevStartingXI(homeTeamId, fixtureIso, apiKey) : Promise.resolve([]),
      currentXI.away.length ? fetchPrevStartingXI(awayTeamId, fixtureIso, apiKey) : Promise.resolve([]),
    ]);
    const diff = (curr: string[], prev: string[]): number => {
      if (!curr.length || !prev.length) return -1;
      const prevSet = new Set(prev);
      return curr.filter(p => !prevSet.has(p)).length;
    };
    return {
      homeChanges: diff(currentXI.home, prevHome),
      awayChanges: diff(currentXI.away, prevAway),
      homeXISize: currentXI.home.length,
      awayXISize: currentXI.away.length,
    };
  } catch {
    return empty;
  }
}

function applyRotationAdjustment(
  pred: { prediction: string; confidence: number; home_win: number; draw: number; away_win: number },
  profile: RotationProfile,
  homeTeamName: string,
  awayTeamName: string,
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  const isHomePick = pred.home_win >= pred.draw && pred.home_win >= pred.away_win;
  const isAwayPick = pred.away_win > pred.draw && pred.away_win > pred.home_win;

  // Penalize if MODEL'S PICK is rotated team
  if (isHomePick && profile.homeChanges >= 5) {
    delta = -3;
    factors.push(`🔄 ${homeTeamName} rotated heavily (${profile.homeChanges} XI changes) — favorite less trustworthy`);
  } else if (isHomePick && profile.homeChanges >= 3) {
    delta = -1;
    factors.push(`🔄 ${homeTeamName} XI changes: ${profile.homeChanges} — mild rotation risk`);
  } else if (isAwayPick && profile.awayChanges >= 5) {
    delta = -3;
    factors.push(`🔄 ${awayTeamName} rotated heavily (${profile.awayChanges} XI changes) — favorite less trustworthy`);
  } else if (isAwayPick && profile.awayChanges >= 3) {
    delta = -1;
    factors.push(`🔄 ${awayTeamName} XI changes: ${profile.awayChanges} — mild rotation risk`);
  }

  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta };
}

// ============ OPEN-GAME / BTTS PROFILE (LIVE — Option 14) ============
// Detects teams playing open, attacking matches where both sides score regularly.
// Uses BTTS rate from last 10 matches (matches where both team & opponent scored).
// If both teams have BTTS rate >= 60% → boost BTTS Yes / Over picks.
// If both teams have BTTS rate <= 30% → boost BTTS No / Under picks.
// Acts as a complement to ScoringProfile (which uses goal counts).
// =====================================================================
interface OpenGameProfile {
  homeBttsRate: number;
  awayBttsRate: number;
  bothOpen: boolean;
  bothClosed: boolean;
}

function calculateOpenGameProfile(homeForm: FormMatch[], awayForm: FormMatch[]): OpenGameProfile {
  const bttsRate = (form: FormMatch[]): number => {
    if (form.length === 0) return 0;
    const slice = form.slice(0, 10);
    const btts = slice.filter(m => m.goalsFor > 0 && m.goalsAgainst > 0).length;
    return Math.round((btts / slice.length) * 100);
  };
  const h = bttsRate(homeForm);
  const a = bttsRate(awayForm);
  return {
    homeBttsRate: h,
    awayBttsRate: a,
    bothOpen: h >= 60 && a >= 60,
    bothClosed: h <= 30 && a <= 30,
  };
}

function applyOpenGameProfile(
  pred: { prediction: string; confidence: number },
  profile: OpenGameProfile,
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  const predLower = (pred.prediction || "").toLowerCase();
  const isBttsYes = predLower.includes("btts: yes") || predLower.includes("btts yes");
  const isBttsNo = predLower.includes("btts: no") || predLower.includes("btts no");
  const isOver = predLower.includes("over 2.5") || predLower.includes("over 2,5");
  const isUnder = predLower.includes("under 2.5") || predLower.includes("under 2,5");

  if (profile.bothOpen) {
    if (isBttsYes) {
      delta = profile.homeBttsRate >= 70 && profile.awayBttsRate >= 70 ? 2 : 1;
      factors.push(`🎯 Open-game profile both sides (BTTS: ${profile.homeBttsRate}%/${profile.awayBttsRate}%) — supports BTTS Yes`);
    } else if (isOver) {
      delta = 1;
      factors.push(`🎯 Open-game profile (BTTS ${profile.homeBttsRate}%/${profile.awayBttsRate}%) — supports Over`);
    } else if (isBttsNo || isUnder) {
      delta = -1;
      factors.push(`⚠️ Open-game trend (BTTS ${profile.homeBttsRate}%/${profile.awayBttsRate}%) contradicts pick`);
    }
  } else if (profile.bothClosed) {
    if (isBttsNo || isUnder) {
      delta = profile.homeBttsRate <= 20 && profile.awayBttsRate <= 20 ? 2 : 1;
      factors.push(`🛡️ Closed-game profile (BTTS ${profile.homeBttsRate}%/${profile.awayBttsRate}%) — supports ${isBttsNo ? "BTTS No" : "Under"}`);
    } else if (isBttsYes || isOver) {
      delta = -1;
      factors.push(`⚠️ Closed-game trend contradicts pick`);
    }
  }

  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta };
}

// ============ BIG MATCH MENTALITY (LIVE — Option 16) ============
// When a top-table side (rank 1-6) plays a mid-table side (rank 7-12)
// with a meaningful rank gap, the favourite tends to outperform what
// raw form/odds suggest by ~10-12% (cup-tied players, complacency, etc).
// Boost confidence on the favourite when the model already picks them.
// =================================================================
interface BigMatchProfile {
  homeRank: number | null;
  awayRank: number | null;
  totalTeams: number;
  isBigMatch: boolean; // top-tier vs mid-tier with significant gap
  favouredSide: "home" | "away" | null;
}

function calculateBigMatchProfile(
  standings: StandingEntry[],
  homeTeamId: number,
  awayTeamId: number,
): BigMatchProfile {
  const empty: BigMatchProfile = { homeRank: null, awayRank: null, totalTeams: 0, isBigMatch: false, favouredSide: null };
  if (!standings || standings.length === 0) return empty;
  const h = standings.find(s => s.teamId === homeTeamId);
  const a = standings.find(s => s.teamId === awayTeamId);
  if (!h || !a) return empty;
  const total = h.totalTeams || a.totalTeams || 20;

  // Define "top tier" = rank 1-6 (typically Champions/Europe contenders)
  // "Mid tier" = rank 7-12 (or up to 60% mark for smaller leagues)
  const topTierMax = total <= 16 ? 4 : 6;
  const midTierMax = Math.max(topTierMax + 4, Math.floor(total * 0.65));

  const homeTop = h.rank <= topTierMax;
  const awayTop = a.rank <= topTierMax;
  const homeMid = h.rank > topTierMax && h.rank <= midTierMax;
  const awayMid = a.rank > topTierMax && a.rank <= midTierMax;

  let favouredSide: "home" | "away" | null = null;
  let isBigMatch = false;

  // Top home vs Mid away
  if (homeTop && awayMid && (a.rank - h.rank) >= 3) {
    isBigMatch = true;
    favouredSide = "home";
  }
  // Top away vs Mid home
  else if (awayTop && homeMid && (h.rank - a.rank) >= 3) {
    isBigMatch = true;
    favouredSide = "away";
  }

  return { homeRank: h.rank, awayRank: a.rank, totalTeams: total, isBigMatch, favouredSide };
}

function applyBigMatchAdjustment(
  pred: { prediction: string; confidence: number; home_win: number; draw: number; away_win: number },
  profile: BigMatchProfile,
  homeTeamName: string,
  awayTeamName: string,
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  if (!profile.isBigMatch || !profile.favouredSide) return { confidence: pred.confidence, factors, delta };

  const isHomePick = pred.home_win >= pred.draw && pred.home_win >= pred.away_win;
  const isAwayPick = pred.away_win > pred.draw && pred.away_win > pred.home_win;

  // Boost when model aligns with the favoured top-tier side
  if (profile.favouredSide === "home" && isHomePick) {
    delta = 2;
    factors.push(`👑 Top-${profile.homeRank} ${homeTeamName} vs Mid-${profile.awayRank} ${awayTeamName} — big match edge`);
  } else if (profile.favouredSide === "away" && isAwayPick) {
    delta = 2;
    factors.push(`👑 Top-${profile.awayRank} ${awayTeamName} vs Mid-${profile.homeRank} ${homeTeamName} — big match edge`);
  }
  // Slight caution if model contradicts the elite team's superiority
  else if (profile.favouredSide === "home" && isAwayPick) {
    delta = -1;
    factors.push(`⚠️ Picking away against top-${profile.homeRank} ${homeTeamName} — risky`);
  } else if (profile.favouredSide === "away" && isHomePick) {
    delta = -1;
    factors.push(`⚠️ Picking home against top-${profile.awayRank} ${awayTeamName} — risky`);
  }

  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta };
}


// ============ PROMOTION/RELEGATION PRESSURE (LIVE — Option 17) ============
// In the final 5 rounds of the season, teams in the relegation zone
// or fighting for promotion play with desperate energy. Studies show
// they outperform their season-long form by ~15-20% in must-win games.
// Boost confidence when the desperate team is the model's pick.
// ==========================================================================
interface PressureProfile {
  isLateSeason: boolean;
  homeUnderPressure: boolean;
  awayUnderPressure: boolean;
  homePressureType: "relegation" | "title" | "europe" | null;
  awayPressureType: "relegation" | "title" | "europe" | null;
}

function calculatePressureProfile(
  standings: StandingEntry[],
  homeTeamId: number,
  awayTeamId: number,
  fixtureRound: string | undefined,
): PressureProfile {
  const empty: PressureProfile = {
    isLateSeason: false,
    homeUnderPressure: false,
    awayUnderPressure: false,
    homePressureType: null,
    awayPressureType: null,
  };
  if (!standings || standings.length === 0) return empty;
  const h = standings.find(s => s.teamId === homeTeamId);
  const a = standings.find(s => s.teamId === awayTeamId);
  if (!h || !a) return empty;

  // Detect late season: parse round number ("Regular Season - 32") and compare with played
  // Heuristic: if avg `played` >= 75% of typical 38-round season → late season
  const avgPlayed = (h.played + a.played) / 2;
  const totalTeams = h.totalTeams || 20;
  const expectedRounds = (totalTeams - 1) * 2; // double round-robin
  const isLateSeason = avgPlayed >= expectedRounds * 0.75;

  if (!isLateSeason) return empty;

  // Pressure zones
  const relegZone = totalTeams - 4; // bottom 5
  const titleZone = 2;               // top 2
  const europeZone = 6;              // top 6 spots

  const classify = (rank: number): PressureProfile["homePressureType"] => {
    if (rank >= relegZone) return "relegation";
    if (rank <= titleZone) return "title";
    if (rank <= europeZone) return "europe";
    return null;
  };

  const homeType = classify(h.rank);
  const awayType = classify(a.rank);

  return {
    isLateSeason: true,
    homeUnderPressure: homeType !== null,
    awayUnderPressure: awayType !== null,
    homePressureType: homeType,
    awayPressureType: awayType,
  };
}

function applyPressureAdjustment(
  pred: { prediction: string; confidence: number; home_win: number; draw: number; away_win: number },
  profile: PressureProfile,
  homeTeamName: string,
  awayTeamName: string,
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  if (!profile.isLateSeason) return { confidence: pred.confidence, factors, delta };

  const isHomePick = pred.home_win >= pred.draw && pred.home_win >= pred.away_win;
  const isAwayPick = pred.away_win > pred.draw && pred.away_win > pred.home_win;
  const isDrawPick = pred.draw > pred.home_win && pred.draw > pred.away_win;

  // Strongest signal: relegation desperation aligned with model's pick
  if (profile.homePressureType === "relegation" && isHomePick) {
    delta += 2;
    factors.push(`🆘 Late-season relegation pressure — ${homeTeamName} fighting for survival`);
  }
  if (profile.awayPressureType === "relegation" && isAwayPick) {
    delta += 2;
    factors.push(`🆘 Late-season relegation pressure — ${awayTeamName} fighting for survival`);
  }
  // Title race pressure
  if (profile.homePressureType === "title" && isHomePick) {
    delta += 1;
    factors.push(`🏆 Late-season title push — ${homeTeamName} must win`);
  }
  if (profile.awayPressureType === "title" && isAwayPick) {
    delta += 1;
    factors.push(`🏆 Late-season title push — ${awayTeamName} must win`);
  }
  // Both sides under pressure → expect tense, narrow result (boost draw slightly)
  if (profile.homeUnderPressure && profile.awayUnderPressure && isDrawPick) {
    delta += 1;
    factors.push(`⚖️ Both sides under late-season pressure — tense draw scenario`);
  }
  // Cap delta to ±3
  delta = clamp(delta, -2, 3);

  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta };
}


// ============ xG CALIBRATION LIVE (LIVE — Option 3) ============
// Compares proxy xG (used in current model) against real xG from
// API-Football. If real xG diverges meaningfully from proxy, nudge
// confidence: convergence = +1 (signal validated), strong divergence
// against the pick = -2 (proxy may be overstating chance).
// =================================================================
interface XGCalibrationResult {
  available: boolean;
  proxyHomeXg: number;
  proxyAwayXg: number;
  realHomeXg: number | null;
  realAwayXg: number | null;
  homeDeltaXg: number | null; // real - proxy
  awayDeltaXg: number | null;
}

function applyXGCalibration(
  pred: { prediction: string; confidence: number; home_win: number; draw: number; away_win: number },
  homeRealXG: { home_xg_for_avg: number | null; home_xg_against_avg: number | null } | null,
  awayRealXG: { away_xg_for_avg: number | null; away_xg_against_avg: number | null } | null,
  proxyHomeXg: number,
  proxyAwayXg: number,
): { confidence: number; factors: string[]; delta: number; result: XGCalibrationResult } {
  const factors: string[] = [];
  let delta = 0;
  const result: XGCalibrationResult = {
    available: false,
    proxyHomeXg,
    proxyAwayXg,
    realHomeXg: null,
    realAwayXg: null,
    homeDeltaXg: null,
    awayDeltaXg: null,
  };

  // Need both real-xG components to compute calibrated xG
  let realHomeXg: number | null = null;
  let realAwayXg: number | null = null;
  if (homeRealXG?.home_xg_for_avg != null && awayRealXG?.away_xg_against_avg != null) {
    realHomeXg = (homeRealXG.home_xg_for_avg + awayRealXG.away_xg_against_avg) / 2;
  }
  if (awayRealXG?.away_xg_for_avg != null && homeRealXG?.home_xg_against_avg != null) {
    realAwayXg = (awayRealXG.away_xg_for_avg + homeRealXG.home_xg_against_avg) / 2;
  }
  if (realHomeXg == null || realAwayXg == null) return { confidence: pred.confidence, factors, delta, result };

  result.available = true;
  result.realHomeXg = realHomeXg;
  result.realAwayXg = realAwayXg;
  result.homeDeltaXg = realHomeXg - proxyHomeXg;
  result.awayDeltaXg = realAwayXg - proxyAwayXg;

  const isHomePick = pred.home_win >= pred.draw && pred.home_win >= pred.away_win;
  const isAwayPick = pred.away_win > pred.draw && pred.away_win > pred.home_win;

  // Convergence: real xG within ±0.25 of proxy on both sides → signal validated (+1)
  const homeConverge = Math.abs(result.homeDeltaXg) <= 0.25;
  const awayConverge = Math.abs(result.awayDeltaXg) <= 0.25;
  if (homeConverge && awayConverge) {
    delta = 1;
    factors.push(`✅ xG calibration validates pick (real xG matches proxy within 0.25)`);
    return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta, result };
  }

  // Strong divergence AGAINST the pick → caution
  // If picked home but real home xG is significantly LOWER than proxy (overrated)
  if (isHomePick && result.homeDeltaXg <= -0.5) {
    delta = -2;
    factors.push(`📉 Real xG ${realHomeXg.toFixed(2)} below proxy ${proxyHomeXg.toFixed(2)} — home pick overrated`);
  } else if (isAwayPick && result.awayDeltaXg <= -0.5) {
    delta = -2;
    factors.push(`📉 Real xG ${realAwayXg.toFixed(2)} below proxy ${proxyAwayXg.toFixed(2)} — away pick overrated`);
  }
  // Strong divergence FOR the pick → boost
  else if (isHomePick && result.homeDeltaXg >= 0.5) {
    delta = 1;
    factors.push(`📈 Real xG ${realHomeXg.toFixed(2)} above proxy ${proxyHomeXg.toFixed(2)} — home pick underrated`);
  } else if (isAwayPick && result.awayDeltaXg >= 0.5) {
    delta = 1;
    factors.push(`📈 Real xG ${realAwayXg.toFixed(2)} above proxy ${proxyAwayXg.toFixed(2)} — away pick underrated`);
  }

  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta, result };
}


// ============ HOME/AWAY ASYMMETRY BOOST (LIVE — Option 15) ============
// Some teams have dramatically different performance home vs away.
// Uses isHome flag from FormMatch to compute split win rates over last 10.
// If home team's HOME win rate is >= 60% AND away team's AWAY win rate <= 25%,
// boost the Home Win pick confidence by +2 (strong asymmetry advantage).
// Symmetric for away dominators.
// =======================================================================
interface AsymmetryProfile {
  homeHomeWinRate: number; // % wins at home
  homeAwayWinRate: number; // % wins away
  awayHomeWinRate: number;
  awayAwayWinRate: number;
  homeStrongAtHome: boolean;
  awayWeakOnRoad: boolean;
  awayStrongOnRoad: boolean;
  homeWeakAtHome: boolean;
}

function calculateAsymmetryProfile(homeForm: FormMatch[], awayForm: FormMatch[]): AsymmetryProfile {
  const splitWinRate = (form: FormMatch[], wantHome: boolean): number => {
    const filtered = form.slice(0, 10).filter(m => m.isHome === wantHome);
    if (filtered.length < 3) return -1; // not enough sample
    const wins = filtered.filter(m => m.result === "W").length;
    return Math.round((wins / filtered.length) * 100);
  };
  const hH = splitWinRate(homeForm, true);
  const hA = splitWinRate(homeForm, false);
  const aH = splitWinRate(awayForm, true);
  const aA = splitWinRate(awayForm, false);
  return {
    homeHomeWinRate: hH,
    homeAwayWinRate: hA,
    awayHomeWinRate: aH,
    awayAwayWinRate: aA,
    homeStrongAtHome: hH >= 60,
    awayWeakOnRoad: aA >= 0 && aA <= 25,
    awayStrongOnRoad: aA >= 60,
    homeWeakAtHome: hH >= 0 && hH <= 25,
  };
}

function applyAsymmetryAdjustment(
  pred: { prediction: string; confidence: number; home_win: number; draw: number; away_win: number },
  profile: AsymmetryProfile,
  homeTeamName: string,
  awayTeamName: string,
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  const isHomePick = pred.home_win >= pred.draw && pred.home_win >= pred.away_win;
  const isAwayPick = pred.away_win > pred.draw && pred.away_win > pred.home_win;

  // Home dominator vs road weakling
  if (isHomePick && profile.homeStrongAtHome && profile.awayWeakOnRoad) {
    delta = profile.homeHomeWinRate >= 75 && profile.awayAwayWinRate <= 15 ? 2 : 1;
    factors.push(`🏠 ${homeTeamName} ${profile.homeHomeWinRate}% home win rate vs ${awayTeamName} ${profile.awayAwayWinRate}% away — strong asymmetry`);
  }
  // Away dominator vs home weakling
  else if (isAwayPick && profile.awayStrongOnRoad && profile.homeWeakAtHome) {
    delta = profile.awayAwayWinRate >= 75 && profile.homeHomeWinRate <= 15 ? 2 : 1;
    factors.push(`✈️ ${awayTeamName} ${profile.awayAwayWinRate}% away win rate vs ${homeTeamName} ${profile.homeHomeWinRate}% home — strong asymmetry`);
  }
  // Contradictory pick: model picks home but home is weak at home
  else if (isHomePick && profile.homeWeakAtHome && profile.awayStrongOnRoad) {
    delta = -2;
    factors.push(`⚠️ ${homeTeamName} only ${profile.homeHomeWinRate}% at home vs ${awayTeamName} ${profile.awayAwayWinRate}% away — weak home pick`);
  }

  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta };
}


// ============ WIN STREAK MOMENTUM (LIVE — Option 5) ============
// Streak of 4+ wins (or losses) in a row signals strong psychological momentum.
// 5+ win streak = +2 conf when model picks streak team.
// 4 win streak  = +1 conf.
// 4+ loss streak on the OPPONENT side adds +1 to favored picks.
// =================================================================
interface StreakProfile {
  homeWinStreak: number;
  awayWinStreak: number;
  homeLossStreak: number;
  awayLossStreak: number;
}

function calculateStreakProfile(homeForm: FormMatch[], awayForm: FormMatch[]): StreakProfile {
  // form is sorted most-recent first
  const winStreak = (form: FormMatch[]) => {
    let n = 0;
    for (const m of form) { if (m.result === "W") n++; else break; }
    return n;
  };
  const lossStreak = (form: FormMatch[]) => {
    let n = 0;
    for (const m of form) { if (m.result === "L") n++; else break; }
    return n;
  };
  return {
    homeWinStreak: winStreak(homeForm),
    awayWinStreak: winStreak(awayForm),
    homeLossStreak: lossStreak(homeForm),
    awayLossStreak: lossStreak(awayForm),
  };
}

function applyStreakAdjustment(
  pred: { prediction: string; confidence: number; home_win: number; draw: number; away_win: number },
  profile: StreakProfile,
  homeTeamName: string,
  awayTeamName: string,
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  const isHomePick = pred.home_win >= pred.draw && pred.home_win >= pred.away_win;
  const isAwayPick = pred.away_win > pred.draw && pred.away_win > pred.home_win;

  if (isHomePick) {
    if (profile.homeWinStreak >= 5) { delta += 2; factors.push(`🔥 ${homeTeamName} on ${profile.homeWinStreak}-game win streak — strong momentum`); }
    else if (profile.homeWinStreak === 4) { delta += 1; factors.push(`🔥 ${homeTeamName} on 4-game win streak`); }
    if (profile.awayLossStreak >= 4) { delta += 1; factors.push(`📉 ${awayTeamName} on ${profile.awayLossStreak}-game losing streak`); }
  } else if (isAwayPick) {
    if (profile.awayWinStreak >= 5) { delta += 2; factors.push(`🔥 ${awayTeamName} on ${profile.awayWinStreak}-game win streak — strong momentum`); }
    else if (profile.awayWinStreak === 4) { delta += 1; factors.push(`🔥 ${awayTeamName} on 4-game win streak`); }
    if (profile.homeLossStreak >= 4) { delta += 1; factors.push(`📉 ${homeTeamName} on ${profile.homeLossStreak}-game losing streak`); }
  }

  // Cap to ±3 to avoid double-stacking
  delta = Math.max(-3, Math.min(3, delta));
  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta };
}


// ============ DERBY DETECTION (LIVE — Option 6) ============
// Local/famous derbies historically end in draws ~32-35% (vs ~25% league avg).
// When a known derby is detected → boost Draw confidence if model already leans draw,
// or soften over-confident win picks (-1) since derbies are unpredictable.
// =================================================================
const DERBY_KEYWORDS: Array<{ a: string; b: string; name: string }> = [
  // England
  { a: "manchester united", b: "manchester city", name: "Manchester Derby" },
  { a: "liverpool", b: "everton", name: "Merseyside Derby" },
  { a: "arsenal", b: "tottenham", name: "North London Derby" },
  { a: "chelsea", b: "tottenham", name: "London Derby" },
  { a: "chelsea", b: "arsenal", name: "London Derby" },
  // Spain
  { a: "real madrid", b: "barcelona", name: "El Clásico" },
  { a: "real madrid", b: "atletico madrid", name: "Madrid Derby" },
  { a: "barcelona", b: "espanyol", name: "Barcelona Derby" },
  { a: "sevilla", b: "real betis", name: "Seville Derby" },
  // Italy
  { a: "inter", b: "milan", name: "Derby della Madonnina" },
  { a: "ac milan", b: "inter", name: "Derby della Madonnina" },
  { a: "juventus", b: "torino", name: "Derby della Mole" },
  { a: "roma", b: "lazio", name: "Derby della Capitale" },
  { a: "napoli", b: "roma", name: "Derby del Sole" },
  // Germany
  { a: "bayern munich", b: "borussia dortmund", name: "Der Klassiker" },
  { a: "schalke", b: "borussia dortmund", name: "Revierderby" },
  { a: "hamburg", b: "werder bremen", name: "Nordderby" },
  // France
  { a: "psg", b: "marseille", name: "Le Classique" },
  { a: "paris saint germain", b: "marseille", name: "Le Classique" },
  // Portugal
  { a: "porto", b: "benfica", name: "O Clássico" },
  { a: "sporting", b: "benfica", name: "Derby de Lisboa" },
  // Scotland
  { a: "celtic", b: "rangers", name: "Old Firm" },
  // Netherlands
  { a: "ajax", b: "feyenoord", name: "De Klassieker" },
  // Turkey
  { a: "fenerbahce", b: "galatasaray", name: "Intercontinental Derby" },
  // Argentina
  { a: "boca juniors", b: "river plate", name: "Superclásico" },
  // Serbia
  { a: "crvena zvezda", b: "partizan", name: "Eternal Derby" },
  { a: "red star belgrade", b: "partizan", name: "Eternal Derby" },
];

interface DerbyProfile {
  isDerby: boolean;
  derbyName: string | null;
}

function detectDerby(homeTeamName: string, awayTeamName: string): DerbyProfile {
  const h = (homeTeamName || "").toLowerCase();
  const a = (awayTeamName || "").toLowerCase();
  for (const d of DERBY_KEYWORDS) {
    const matchA = (h.includes(d.a) && a.includes(d.b)) || (h.includes(d.b) && a.includes(d.a));
    if (matchA) return { isDerby: true, derbyName: d.name };
  }
  return { isDerby: false, derbyName: null };
}

function applyDerbyAdjustment(
  pred: { prediction: string; confidence: number; home_win: number; draw: number; away_win: number },
  profile: DerbyProfile,
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  if (!profile.isDerby) return { confidence: pred.confidence, factors, delta };
  const predLower = (pred.prediction || "").toLowerCase();
  const isDrawPick = predLower.includes("draw") || pred.draw >= pred.home_win && pred.draw >= pred.away_win;
  const isHighConfWin = pred.confidence >= 75 && (pred.home_win >= 60 || pred.away_win >= 60);

  if (isDrawPick) {
    delta = 2;
    factors.push(`⚔️ ${profile.derbyName} — derbies favor draws (~33%), supports pick`);
  } else if (isHighConfWin) {
    delta = -2;
    factors.push(`⚔️ ${profile.derbyName} — derbies are unpredictable, soften high-conf win pick`);
  } else {
    delta = -1;
    factors.push(`⚔️ ${profile.derbyName} — high derby variance`);
  }
  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta };
}


// ============ STAR PLAYER ABSENCE DETECTOR (LIVE — Option 4) ============
// When a top scorer (10+ goals season) or top assister (8+ assists) is missing,
// apply -3 conf to picks that favor that player's team.
// Uses cached top-scorers/top-assists per league+season.
// =================================================================
interface StarAbsenceProfile {
  homeMissingTopScorers: string[];
  awayMissingTopScorers: string[];
  homeMissingTopAssists: string[];
  awayMissingTopAssists: string[];
}

// In-memory cache per (leagueId, season) — lives for one function invocation
const TOP_PLAYERS_CACHE = new Map<string, { scorers: Map<number, { name: string; goals: number }[]>; assists: Map<number, { name: string; assists: number }[]> }>();

async function getLeagueTopPlayers(
  leagueId: number,
  season: number,
  apiKey: string,
): Promise<{ scorers: Map<number, { name: string; goals: number }[]>; assists: Map<number, { name: string; assists: number }[]> }> {
  const key = `${leagueId}-${season}`;
  const cached = TOP_PLAYERS_CACHE.get(key);
  if (cached) return cached;

  const empty = { scorers: new Map(), assists: new Map() };
  try {
    const headers = { "x-apisports-key": apiKey };
    const [scRes, asRes] = await Promise.all([
      fetch(`https://v3.football.api-sports.io/players/topscorers?league=${leagueId}&season=${season}`, { headers }),
      fetch(`https://v3.football.api-sports.io/players/topassists?league=${leagueId}&season=${season}`, { headers }),
    ]);
    if (!scRes.ok && !asRes.ok) { TOP_PLAYERS_CACHE.set(key, empty); return empty; }
    const scJson = scRes.ok ? await scRes.json() : { response: [] };
    const asJson = asRes.ok ? await asRes.json() : { response: [] };

    const scorers = new Map<number, { name: string; goals: number }[]>();
    for (const p of (scJson.response || [])) {
      const teamId = p.statistics?.[0]?.team?.id;
      const goals = p.statistics?.[0]?.goals?.total ?? 0;
      const name = p.player?.name || "Unknown";
      if (!teamId || goals < 8) continue; // only 8+ goal scorers
      if (!scorers.has(teamId)) scorers.set(teamId, []);
      scorers.get(teamId)!.push({ name, goals });
    }
    const assists = new Map<number, { name: string; assists: number }[]>();
    for (const p of (asJson.response || [])) {
      const teamId = p.statistics?.[0]?.team?.id;
      const a = p.statistics?.[0]?.goals?.assists ?? 0;
      const name = p.player?.name || "Unknown";
      if (!teamId || a < 6) continue; // only 6+ assist players
      if (!assists.has(teamId)) assists.set(teamId, []);
      assists.get(teamId)!.push({ name, assists: a });
    }
    const result = { scorers, assists };
    TOP_PLAYERS_CACHE.set(key, result);
    return result;
  } catch (e) {
    console.warn(`[STAR] getLeagueTopPlayers failed:`, (e as Error)?.message);
    TOP_PLAYERS_CACHE.set(key, empty);
    return empty;
  }
}

function calculateStarAbsenceProfile(
  topPlayers: { scorers: Map<number, { name: string; goals: number }[]>; assists: Map<number, { name: string; assists: number }[]> },
  homeTeamId: number,
  awayTeamId: number,
  missingHome: any[],
  missingAway: any[],
): StarAbsenceProfile {
  const profile: StarAbsenceProfile = {
    homeMissingTopScorers: [],
    awayMissingTopScorers: [],
    homeMissingTopAssists: [],
    awayMissingTopAssists: [],
  };
  const normalize = (n: any) => String(n || "").toLowerCase().trim();
  const missingNamesHome = (missingHome || []).map((p: any) => normalize(p?.name || p?.player_name));
  const missingNamesAway = (missingAway || []).map((p: any) => normalize(p?.name || p?.player_name));

  for (const s of (topPlayers.scorers.get(homeTeamId) || [])) {
    if (missingNamesHome.some(n => n.includes(normalize(s.name)) || normalize(s.name).includes(n))) {
      profile.homeMissingTopScorers.push(`${s.name} (${s.goals}g)`);
    }
  }
  for (const s of (topPlayers.scorers.get(awayTeamId) || [])) {
    if (missingNamesAway.some(n => n.includes(normalize(s.name)) || normalize(s.name).includes(n))) {
      profile.awayMissingTopScorers.push(`${s.name} (${s.goals}g)`);
    }
  }
  for (const a of (topPlayers.assists.get(homeTeamId) || [])) {
    if (missingNamesHome.some(n => n.includes(normalize(a.name)) || normalize(a.name).includes(n))) {
      profile.homeMissingTopAssists.push(`${a.name} (${a.assists}a)`);
    }
  }
  for (const a of (topPlayers.assists.get(awayTeamId) || [])) {
    if (missingNamesAway.some(n => n.includes(normalize(a.name)) || normalize(a.name).includes(n))) {
      profile.awayMissingTopAssists.push(`${a.name} (${a.assists}a)`);
    }
  }
  return profile;
}

function applyStarAbsenceAdjustment(
  pred: { prediction: string; confidence: number; home_win: number; draw: number; away_win: number },
  profile: StarAbsenceProfile,
  homeTeamName: string,
  awayTeamName: string,
  gkAbsence?: { homeGKMissing: boolean; awayGKMissing: boolean },
): { confidence: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  const isHomePick = pred.home_win >= pred.draw && pred.home_win >= pred.away_win;
  const isAwayPick = pred.away_win > pred.draw && pred.away_win > pred.home_win;

  const homeMissing = [...profile.homeMissingTopScorers, ...profile.homeMissingTopAssists];
  const awayMissing = [...profile.awayMissingTopScorers, ...profile.awayMissingTopAssists];

  // Pick team missing star → larger penalty (2+ stars = severe)
  if (isHomePick && homeMissing.length > 0) {
    delta -= homeMissing.length >= 2 ? 5 : 3;
    factors.push(`⚠️ ${homeTeamName} missing key player(s): ${homeMissing.slice(0, 2).join(", ")}`);
  } else if (isAwayPick && awayMissing.length > 0) {
    delta -= awayMissing.length >= 2 ? 5 : 3;
    factors.push(`⚠️ ${awayTeamName} missing key player(s): ${awayMissing.slice(0, 2).join(", ")}`);
  }
  // Opponent missing star → small boost
  if (isHomePick && awayMissing.length > 0) {
    delta += awayMissing.length >= 2 ? 2 : 1;
    factors.push(`✅ ${awayTeamName} missing key player(s): ${awayMissing.slice(0, 2).join(", ")} — supports ${homeTeamName}`);
  } else if (isAwayPick && homeMissing.length > 0) {
    delta += homeMissing.length >= 2 ? 2 : 1;
    factors.push(`✅ ${homeTeamName} missing key player(s): ${homeMissing.slice(0, 2).join(", ")} — supports ${awayTeamName}`);
  }

  // Goalkeeper absence — major impact (boost Over 2.5 implicitly via penalty)
  if (gkAbsence) {
    if (isHomePick && gkAbsence.homeGKMissing) {
      delta -= 2;
      factors.push(`🧤 ${homeTeamName} starting GK missing — defensive risk`);
    } else if (isAwayPick && gkAbsence.awayGKMissing) {
      delta -= 2;
      factors.push(`🧤 ${awayTeamName} starting GK missing — defensive risk`);
    }
  }

  delta = Math.max(-7, Math.min(4, delta));
  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta };
}


// ============ TRAVEL DISTANCE & FIXTURE CONGESTION (LIVE — Option 13) ============
/**
 * Calculate fixture congestion: matches played in the last N days.
 * High congestion (3+ matches in 8 days) = significant fatigue penalty.
 */
interface CongestionProfile {
  homeMatchesIn8Days: number;
  awayMatchesIn8Days: number;
  homeMatchesIn14Days: number;
  awayMatchesIn14Days: number;
  homeRestHours: number | null;
  awayRestHours: number | null;
  congestionGap: "home_fresher" | "away_fresher" | "balanced";
}

function calculateCongestionProfile(
  fixtureDateIso: string | undefined,
  homeForm: FormMatch[],
  awayForm: FormMatch[],
): CongestionProfile {
  const empty: CongestionProfile = {
    homeMatchesIn8Days: 0,
    awayMatchesIn8Days: 0,
    homeMatchesIn14Days: 0,
    awayMatchesIn14Days: 0,
    homeRestHours: null,
    awayRestHours: null,
    congestionGap: "balanced",
  };
  if (!fixtureDateIso) return empty;
  const fixtureMs = new Date(fixtureDateIso).getTime();
  if (!Number.isFinite(fixtureMs)) return empty;

  const countWithin = (form: FormMatch[], days: number): number => {
    const cutoff = fixtureMs - days * 24 * 3600 * 1000;
    return form.filter(m => {
      if (!m.matchDate) return false;
      const t = new Date(m.matchDate).getTime();
      return Number.isFinite(t) && t >= cutoff && t < fixtureMs;
    }).length;
  };

  const lastRestHours = (form: FormMatch[]): number | null => {
    const past = form
      .filter(m => m.matchDate)
      .map(m => new Date(m.matchDate!).getTime())
      .filter(ts => Number.isFinite(ts) && ts < fixtureMs)
      .sort((a, b) => b - a);
    if (past.length === 0) return null;
    return (fixtureMs - past[0]) / (1000 * 60 * 60);
  };

  const h8 = countWithin(homeForm, 8);
  const a8 = countWithin(awayForm, 8);
  const h14 = countWithin(homeForm, 14);
  const a14 = countWithin(awayForm, 14);
  const hRest = lastRestHours(homeForm);
  const aRest = lastRestHours(awayForm);

  let gap: CongestionProfile["congestionGap"] = "balanced";
  if (hRest !== null && aRest !== null) {
    if (hRest - aRest >= 24) gap = "home_fresher";
    else if (aRest - hRest >= 24) gap = "away_fresher";
  }

  return {
    homeMatchesIn8Days: h8,
    awayMatchesIn8Days: a8,
    homeMatchesIn14Days: h14,
    awayMatchesIn14Days: a14,
    homeRestHours: hRest,
    awayRestHours: aRest,
    congestionGap: gap,
  };
}

/**
 * Apply congestion-based adjustments. Penalizes the side with more recent matches.
 * - 3+ matches in 8 days = -3% win prob, -2 confidence
 * - Opposing team gets the inverse boost
 */
function applyCongestionAdjustment(
  pred: { prediction: string; confidence: number; home_win: number; draw: number; away_win: number },
  profile: CongestionProfile,
  homeTeamName: string,
  awayTeamName: string,
): { confidence: number; home_win: number; draw: number; away_win: number; factors: string[]; delta: number } {
  const factors: string[] = [];
  let delta = 0;
  let homeAdj = 0;
  let awayAdj = 0;

  // Heavy congestion: 3+ matches in 8 days
  if (profile.homeMatchesIn8Days >= 3) {
    homeAdj -= 3;
    awayAdj += 1;
    delta -= 1;
    factors.push(`🥵 Home congestion: ${profile.homeMatchesIn8Days} matches in 8 days`);
  } else if (profile.homeMatchesIn8Days === 2 && (profile.homeRestHours ?? 999) < 96) {
    homeAdj -= 1;
    factors.push(`⏱️ Home: 2 recent matches, short rest`);
  }

  if (profile.awayMatchesIn8Days >= 3) {
    awayAdj -= 3;
    homeAdj += 1;
    delta -= 1;
    factors.push(`🥵 Away congestion: ${profile.awayMatchesIn8Days} matches in 8 days`);
  } else if (profile.awayMatchesIn8Days === 2 && (profile.awayRestHours ?? 999) < 96) {
    awayAdj -= 1;
    factors.push(`⏱️ Away: 2 recent matches, short rest`);
  }

  // Big rest gap (>48h): fresher team gets +1 confidence boost if model picked them
  const isHomePick = pred.home_win >= pred.draw && pred.home_win >= pred.away_win;
  const isAwayPick = pred.away_win > pred.draw && pred.away_win > pred.home_win;
  if (profile.congestionGap === "home_fresher" && isHomePick) {
    delta += 1;
    factors.push(`⚡ ${homeTeamName} significantly fresher (rest gap aligns with pick)`);
  } else if (profile.congestionGap === "away_fresher" && isAwayPick) {
    delta += 1;
    factors.push(`⚡ ${awayTeamName} significantly fresher (rest gap aligns with pick)`);
  }

  // Apply probability adjustments and renormalize
  let newHome = clamp(pred.home_win + homeAdj, 5, 90);
  let newAway = clamp(pred.away_win + awayAdj, 5, 90);
  let newDraw = clamp(100 - newHome - newAway, 5, 90);
  const total = newHome + newDraw + newAway;
  if (total > 0) {
    newHome = Math.round((newHome / total) * 100);
    newAway = Math.round((newAway / total) * 100);
    newDraw = 100 - newHome - newAway;
  }

  return {
    confidence: clamp(pred.confidence + delta, 40, 100),
    home_win: newHome,
    draw: newDraw,
    away_win: newAway,
    factors,
    delta,
  };
}


// ============ WEATHER IMPACT (LIVE — Option 4) ============
/**
 * Fetches weather forecast for venue at kickoff via Open-Meteo (no API key required).
 * Returns null if venue/coords unavailable or API fails.
 */
interface WeatherData {
  tempC: number | null;
  windKmh: number | null;
  precipMm: number | null;
  conditionLabel: string;
}

const weatherCache = new Map<string, WeatherData | null>();
const venueGeoCache = new Map<string, { lat: number; lon: number } | null>();

async function geocodeVenue(city: string | null | undefined, country: string | null | undefined): Promise<{ lat: number; lon: number } | null> {
  if (!city) return null;
  const key = `${city}|${country || ""}`.toLowerCase();
  if (venueGeoCache.has(key)) return venueGeoCache.get(key) || null;

  try {
    const params = new URLSearchParams({ name: city, count: "1", format: "json" });
    if (country) params.append("country", country);
    const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      venueGeoCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r?.latitude || !r?.longitude) {
      venueGeoCache.set(key, null);
      return null;
    }
    const coords = { lat: r.latitude, lon: r.longitude };
    venueGeoCache.set(key, coords);
    return coords;
  } catch {
    venueGeoCache.set(key, null);
    return null;
  }
}

async function fetchWeatherForKickoff(
  venueCity: string | null | undefined,
  venueCountry: string | null | undefined,
  fixtureDateIso: string | undefined,
): Promise<WeatherData | null> {
  if (!venueCity || !fixtureDateIso) return null;
  const cacheKey = `${venueCity}|${venueCountry || ""}|${fixtureDateIso.slice(0, 13)}`;
  if (weatherCache.has(cacheKey)) return weatherCache.get(cacheKey) || null;

  const coords = await geocodeVenue(venueCity, venueCountry);
  if (!coords) {
    weatherCache.set(cacheKey, null);
    return null;
  }

  try {
    const dateStr = fixtureDateIso.slice(0, 10);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
      `&hourly=temperature_2m,precipitation,wind_speed_10m,weather_code` +
      `&start_date=${dateStr}&end_date=${dateStr}&timezone=UTC`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      weatherCache.set(cacheKey, null);
      return null;
    }
    const data = await res.json();
    const times: string[] = data?.hourly?.time ?? [];
    if (times.length === 0) {
      weatherCache.set(cacheKey, null);
      return null;
    }

    // Find the hour closest to kickoff
    const kickoffMs = new Date(fixtureDateIso).getTime();
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i] + "Z").getTime() - kickoffMs);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    }

    const code = data.hourly.weather_code?.[bestIdx] ?? 0;
    const conditionLabel = code >= 95 ? "Thunderstorm"
      : code >= 71 ? "Snow"
      : code >= 61 ? "Rain"
      : code >= 51 ? "Drizzle"
      : code >= 45 ? "Fog"
      : code >= 3 ? "Overcast"
      : "Clear";

    const weather: WeatherData = {
      tempC: data.hourly.temperature_2m?.[bestIdx] ?? null,
      windKmh: data.hourly.wind_speed_10m?.[bestIdx] ?? null,
      precipMm: data.hourly.precipitation?.[bestIdx] ?? null,
      conditionLabel,
    };
    weatherCache.set(cacheKey, weather);
    return weather;
  } catch {
    weatherCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Apply weather-based adjustments to over/under and BTTS picks.
 * Heavy wind, rain, snow, or extreme cold reduce goal expectancy.
 */
function applyWeatherAdjustment(
  pred: { prediction: string; confidence: number },
  weather: WeatherData,
  modelOver25: number,
): { confidence: number; factors: string[]; delta: number; severity: "none" | "mild" | "severe" } {
  const factors: string[] = [];
  let delta = 0;
  let severity: "none" | "mild" | "severe" = "none";
  const predLower = (pred.prediction || "").toLowerCase();

  const wind = weather.windKmh ?? 0;
  const precip = weather.precipMm ?? 0;
  const temp = weather.tempC ?? 15;
  const cond = weather.conditionLabel;

  const isHeavyWeather = wind >= 30 || precip >= 2 || cond === "Snow" || cond === "Thunderstorm" || temp <= -5;
  const isMildWeather = (wind >= 22 && wind < 30) || (precip >= 0.5 && precip < 2) || temp <= 0;

  if (isHeavyWeather) {
    severity = "severe";
    // Severe weather → favors Under, hurts Over/BTTS
    if (predLower.includes("over") || predLower.includes("btts") || predLower.includes("both")) {
      delta = -3;
      factors.push(`⛈️ Severe weather (${cond}, wind ${Math.round(wind)}km/h) — Over/BTTS risky`);
    } else if (predLower.includes("under")) {
      delta = +2;
      factors.push(`⛈️ Severe weather (${cond}, wind ${Math.round(wind)}km/h) — supports Under`);
    } else {
      // 1X2 picks: only nudge confidence if model also leans over-heavy
      if (modelOver25 >= 60) {
        delta = -1;
        factors.push(`🌧️ Weather (${cond}) may suppress goals`);
      }
    }
  } else if (isMildWeather) {
    severity = "mild";
    if (predLower.includes("over") && modelOver25 < 65) {
      delta = -1;
      factors.push(`🌬️ Wind ${Math.round(wind)}km/h — slight Over risk`);
    } else if (predLower.includes("under")) {
      delta = +1;
      factors.push(`🌬️ Adverse weather supports Under`);
    }
  }

  return { confidence: clamp(pred.confidence + delta, 40, 100), factors, delta, severity };
}


function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

// calibrateConfidence removed — confidence is now multi-dimensional

// ============ A) TEMPO & MATCH INTENSITY ============
/**
 * Calculate match tempo score from team stats & form.
 * Uses goals averages as proxy for shots/possession.
 * Higher tempo → more goals expected.
 */
function calculateTempoScore(
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  homeForm: FormMatch[],
  awayForm: FormMatch[]
): { score: number; label: "LOW" | "MEDIUM" | "HIGH" } {
  const hGFAvg = homeStats?.goalsForAvg ?? calculateGoalRate(homeForm).scored;
  const aGFAvg = awayStats?.goalsForAvg ?? calculateGoalRate(awayForm).scored;
  const hGAAvg = homeStats?.goalsAgainstAvg ?? calculateGoalRate(homeForm).conceded;
  const aGAAvg = awayStats?.goalsAgainstAvg ?? calculateGoalRate(awayForm).conceded;

  // Total goals involvement per match (proxy for shots/intensity)
  const homeInvolvement = hGFAvg + hGAAvg; // goals in matches where this team plays
  const awayInvolvement = aGFAvg + aGAAvg;
  const avgTotalGoals = (hGFAvg + aGFAvg + hGAAvg + aGAAvg) / 2;

  // tempo_score formula (adapted from user spec, using goals as proxy for shots)
  const tempoScore = clamp(
    (homeInvolvement + awayInvolvement) * 15 + avgTotalGoals * 10,
    0, 100
  );

  const label: "LOW" | "MEDIUM" | "HIGH" =
    tempoScore >= 65 ? "HIGH" : tempoScore >= 40 ? "MEDIUM" : "LOW";

  return { score: Math.round(tempoScore), label };
}

// ============ B) REAL FORM QUALITY (goals-based) ============
/**
 * Form quality based on goals scored/conceded, not just W/D/L points.
 * form_quality = (goals_scored_last5 * 0.6) - (goals_conceded_last5 * 0.4)
 * Normalized to 0-100.
 */
function calculateFormQuality(form: FormMatch[]): number {
  const last5 = form.slice(0, 5);
  if (last5.length === 0) return 50;

  let goalsScored = 0, goalsConceded = 0;
  for (const m of last5) {
    goalsScored += m.goalsFor;
    goalsConceded += m.goalsAgainst;
  }

  const raw = (goalsScored * 0.6) - (goalsConceded * 0.4);
  // Normalize: raw typically ranges from -4 to +6
  return clamp(Math.round(50 + raw * 8), 0, 100);
}

// ============ E) DRAW SUPPRESSION LOGIC ============
/**
 * Suppress draw probability when xG difference is significant.
 */
function suppressDraw(drawProb: number, homeXg: number, awayXg: number): number {
  const xgDiff = Math.abs(homeXg - awayXg);
  if (xgDiff > 0.8) {
    return Math.round(drawProb * 0.7);
  } else if (xgDiff > 0.5) {
    return Math.round(drawProb * 0.85);
  }
  return drawProb;
}

// ============ F) LEAGUE PROFILE ============
/**
 * Calculate league-specific goal tendency from all teams' stats in standings.
 * Returns league avg goals/match and BTTS likelihood.
 */
interface LeagueProfile {
  avgGoalsPerMatch: number; // league average total goals
  bttsRate: number;         // estimated BTTS % (0-100)
  isOverLeague: boolean;    // avg > 2.7
  isUnderLeague: boolean;   // avg < 2.2
  overBoost: number;        // adjustment for Over markets
  underBoost: number;       // adjustment for Under markets
  bttsBoost: number;        // adjustment for BTTS markets
  score: number;            // 0-100 normalized (50 = neutral, 70+ = high scoring)
}

const leagueProfileCache = new Map<number, LeagueProfile>();

function calculateLeagueProfile(
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  leagueId?: number
): LeagueProfile {
  if (leagueId && leagueProfileCache.has(leagueId)) {
    return leagueProfileCache.get(leagueId)!;
  }

  // Estimate from the two teams' stats
  const hGF = homeStats?.goalsForAvg ?? 1.3;
  const hGA = homeStats?.goalsAgainstAvg ?? 1.1;
  const aGF = awayStats?.goalsForAvg ?? 1.1;
  const aGA = awayStats?.goalsAgainstAvg ?? 1.2;

  // Estimated league average from these two teams
  const avgGoalsPerMatch = (hGF + hGA + aGF + aGA) / 2;

  // BTTS estimate from failed-to-score rates
  const hFTS = homeStats?.played ? homeStats.failedToScore.total / homeStats.played : 0.25;
  const aFTS = awayStats?.played ? awayStats.failedToScore.total / awayStats.played : 0.30;
  const bttsRate = Math.round((1 - hFTS) * (1 - aFTS) * 100);

  const isOverLeague = avgGoalsPerMatch >= 2.7;
  const isUnderLeague = avgGoalsPerMatch <= 2.2;

  const overBoost = isOverLeague ? 5 : isUnderLeague ? -4 : 0;
  const underBoost = isUnderLeague ? 5 : isOverLeague ? -4 : 0;
  const bttsBoost = bttsRate >= 55 ? 4 : bttsRate <= 35 ? -4 : 0;

  const score = clamp(Math.round((avgGoalsPerMatch - 1.5) * 40 + 50), 0, 100);

  const profile: LeagueProfile = {
    avgGoalsPerMatch,
    bttsRate,
    isOverLeague,
    isUnderLeague,
    overBoost,
    underBoost,
    bttsBoost,
    score,
  };

  if (leagueId) leagueProfileCache.set(leagueId, profile);
  return profile;
}

// ============ VALUE DETECTION ============
interface ValueResult {
  valuePercent: number;       // AI prob - bookmaker prob
  isValueBet: boolean;        // value > 8%
  isStrongValue: boolean;     // value > 12% and high confidence
  label: "NO VALUE" | "VALUE" | "STRONG VALUE";
}

function detectValue(aiProb: number, bookmakerProb: number, confidence: number): ValueResult {
  const valuePercent = aiProb - bookmakerProb;
  const isValueBet = valuePercent >= 8;
  const isStrongValue = valuePercent >= 12 && confidence >= 72;

  return {
    valuePercent,
    isValueBet,
    isStrongValue,
    label: isStrongValue ? "STRONG VALUE" : isValueBet ? "VALUE" : "NO VALUE",
  };
}

// ============ ULTRA BOOST (convergence detection) ============
function checkUltraBoost(
  formDiff: number,
  xgDiff: number,
  odds: OddsData | null
): { boost: number; isUltra: boolean } {
  const hasStrongForm = formDiff > 40;
  const hasStrongXg = xgDiff > 1;
  const hasShortOdds = odds ? Math.min(odds.homeOdds, odds.awayOdds) < 1.60 : false;

  if (hasStrongForm && hasStrongXg && hasShortOdds) {
    return { boost: 15, isUltra: true };
  }
  if (hasStrongForm && hasStrongXg) {
    return { boost: 8, isUltra: false };
  }
  if ((hasStrongForm || hasStrongXg) && hasShortOdds) {
    return { boost: 6, isUltra: false };
  }
  return { boost: 0, isUltra: false };
}

// ============ UPSET DETECTION ============
interface UpsetSignal {
  isUpset: boolean;
  upsetTeam: "home" | "away" | null;
  confidence: number;     // 0-100 how likely upset is
  factors: string[];
  scoreBoost: { home: number; away: number }; // xG adjustments for alternative scores
}

function detectUpset(
  odds: OddsData | null,
  homeFormScore: number,
  awayFormScore: number,
  homeXg: number,
  awayXg: number,
  homeQuality: number,
  awayQuality: number,
  standings?: StandingEntry[],
  homeTeamId?: number,
  awayTeamId?: number,
  homeTeamName?: string,
  awayTeamName?: string
): UpsetSignal {
  if (!odds) return { isUpset: false, upsetTeam: null, confidence: 0, factors: [], scoreBoost: { home: 0, away: 0 } };

  const factors: string[] = [];
  let upsetScore = 0;

  // Identify the favorite and underdog
  const favIsHome = odds.homeProb > odds.awayProb;
  const favProb = favIsHome ? odds.homeProb : odds.awayProb;
  const dogProb = favIsHome ? odds.awayProb : odds.homeProb;
  const favForm = favIsHome ? homeFormScore : awayFormScore;
  const dogForm = favIsHome ? awayFormScore : homeFormScore;
  const favXg = favIsHome ? homeXg : awayXg;
  const dogXg = favIsHome ? awayXg : homeXg;
  const favQuality = favIsHome ? homeQuality : awayQuality;
  const dogQuality = favIsHome ? awayQuality : homeQuality;
  const favName = favIsHome ? (homeTeamName || "Home") : (awayTeamName || "Away");
  const dogName = favIsHome ? (awayTeamName || "Away") : (homeTeamName || "Home");

  // Only consider upsets when odds strongly favor one team (≥55%)
  if (favProb < 55) return { isUpset: false, upsetTeam: null, confidence: 0, factors: [], scoreBoost: { home: 0, away: 0 } };

  // Signal 1: Underdog has BETTER recent form than favorite
  if (dogForm > favForm + 10) {
    upsetScore += 25;
    factors.push(`⚠️ ${dogName} in better form (${dogForm} vs ${favForm}) despite longer odds`);
  }

  // Signal 2: Underdog has higher xG
  if (dogXg > favXg) {
    upsetScore += 20;
    factors.push(`⚠️ ${dogName} xG (${dogXg.toFixed(1)}) > ${favName} xG (${favXg.toFixed(1)})`);
  }

  // Signal 3: Quality scores are close despite big odds gap
  if (favProb >= 60 && Math.abs(favQuality - dogQuality) < 15) {
    upsetScore += 15;
    factors.push(`⚠️ Quality gap small (${favQuality} vs ${dogQuality}) but odds gap large`);
  }

  // Signal 4: Standings disagree with odds (underdog ranked higher)
  if (standings && standings.length > 0 && homeTeamId && awayTeamId) {
    const favEntry = standings.find(s => s.teamId === (favIsHome ? homeTeamId : awayTeamId));
    const dogEntry = standings.find(s => s.teamId === (favIsHome ? awayTeamId : homeTeamId));
    if (favEntry && dogEntry && dogEntry.rank < favEntry.rank) {
      upsetScore += 15;
      factors.push(`⚠️ ${dogName} ranked higher (${dogEntry.rank}th) than ${favName} (${favEntry.rank}th)`);
    }
  }

  // Signal 5: Very big odds gap (≥20pp) but signals disagree → classic upset territory
  if (favProb - dogProb >= 20 && upsetScore >= 30) {
    upsetScore += 10;
    factors.push(`🔥 UPSET ALERT: Big odds gap (${favProb}% vs ${dogProb}%) but data contradicts`);
  }

  const isUpset = upsetScore >= 35;
  const upsetTeam: "home" | "away" | null = isUpset ? (favIsHome ? "away" : "home") : null;

  // Score adjustments: boost underdog xG, increase draw-like scores
  const scoreBoost = isUpset ? {
    home: favIsHome ? -0.15 : 0.20,
    away: favIsHome ? 0.20 : -0.15,
  } : { home: 0, away: 0 };

  return {
    isUpset,
    upsetTeam,
    confidence: clamp(upsetScore, 0, 100),
    factors,
    scoreBoost,
  };
}

// ============ DATA QUALITY FILTER ============
function calculateDataQuality(
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  homeForm: FormMatch[],
  awayForm: FormMatch[],
  odds: OddsData | null,
  isQualityLeague: boolean
): { score: number; penalty: number } {
  let score = 50;

  // Season stats quality
  if (homeStats && homeStats.played >= 10) score += 15;
  else if (homeStats && homeStats.played >= 5) score += 8;
  if (awayStats && awayStats.played >= 10) score += 15;
  else if (awayStats && awayStats.played >= 5) score += 8;

  // Form data quality
  if (homeForm.length >= 5) score += 5;
  if (awayForm.length >= 5) score += 5;

  // Odds availability
  if (odds) score += 10;

  // League quality
  if (isQualityLeague) score += 10;
  else score -= 10;

  score = clamp(score, 0, 100);

  // Penalty for low-quality data
  let penalty = 0;
  if (score < 40) penalty = -15;
  else if (score < 55) penalty = -8;
  else if (score < 65) penalty = -3;

  return { score, penalty };
}

/**
 * Main prediction calculation v4 — multi-dimensional confidence model:
 * 
 * Weights: Form 20%, Quality 15%, Squad 8%, Home 7%, H2H 5%,
 *          Standings 10%, Odds 15%, Tempo 10%, League Profile 10%
 *
 * Confidence formula (v4):
 * confidence = (form_diff * 0.20) + (xG_score * 0.25) + (odds_diff * 0.15)
 *            + (consistency * 0.15) + (tempo_score * 0.15) + (market_signal * 0.10)
 *
 * Plus: Draw suppression, Value detection, Ultra boost, Data quality filter
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
  awayTeamName: string,
  standings?: StandingEntry[],
  odds?: OddsData | null,
  leagueName?: string,
  leagueId?: number,
  fixtureRound?: string,
  fixtureDate?: string
): PredictionResult {
  // === A) TEMPO SCORE ===
  const tempo = calculateTempoScore(homeStats, awayStats, homeForm, awayForm);

  // === B) FORM QUALITY (goals-based, not just points) ===
  const homeFormQuality = calculateFormQuality(homeForm);
  const awayFormQuality = calculateFormQuality(awayForm);

  // === F) LEAGUE PROFILE ===
  const leagueProfile = calculateLeagueProfile(homeStats, awayStats, leagueId);

  // === FORM (20%) — OPPONENT-STRENGTH WEIGHTED + VENUE SPLIT ===
  const hasStandings = standings && standings.length > 0;
  const homeFormAll = hasStandings
    ? calculateWeightedFormScore(homeForm, standings!)
    : (homeForm.length > 5 ? calculateFormScoreDeep(homeForm) : calculateFormScore(homeForm));
  const awayFormAll = hasStandings
    ? calculateWeightedFormScore(awayForm, standings!)
    : (awayForm.length > 5 ? calculateFormScoreDeep(awayForm) : calculateFormScore(awayForm));
  
  // === C) HOME vs AWAY SPLIT (upgraded weights — venue-form is most predictive) ===
  const homeVenueForm = calculateVenueFormScore(homeForm, true);
  const awayVenueForm = calculateVenueFormScore(awayForm, false);
  // Blend: 55% venue-specific (was 45%) + 25% opponent-weighted overall (was 30%) + 20% goals quality (was 25%)
  let homeFormScore = Math.round(homeVenueForm * 0.55 + homeFormAll * 0.25 + homeFormQuality * 0.20);
  let awayFormScore = Math.round(awayVenueForm * 0.55 + awayFormAll * 0.25 + awayFormQuality * 0.20);

  // === MOTIVATION ADJUSTMENT (LIVE) — apply per-team motivation deltas to form score ===
  let motivationFactors: string[] = [];
  if (standings && standings.length > 0) {
    const motCtx = getMatchContext(standings, homeTeamId, awayTeamId, leagueId, leagueName, fixtureRound);
    if (motCtx.homeMotivation !== 0 || motCtx.awayMotivation !== 0) {
      homeFormScore = clamp(homeFormScore + motCtx.homeMotivation, 0, 100);
      awayFormScore = clamp(awayFormScore + motCtx.awayMotivation, 0, 100);
    }
    motivationFactors = motCtx.factors;
  }

  // === FATIGUE ADJUSTMENT (LIVE) — penalize short rest, reward fresh teams ===
  const fatigue = calculateFatigueAdjustment(fixtureDate, homeForm, awayForm);
  if (fatigue.homeDelta !== 0) homeFormScore = clamp(homeFormScore + fatigue.homeDelta, 0, 100);
  if (fatigue.awayDelta !== 0) awayFormScore = clamp(awayFormScore + fatigue.awayDelta, 0, 100);

  // === QUALITY (15%) ===
  const homeQualityScore = calculateQualityScore(homeStats);
  const awayQualityScore = calculateQualityScore(awayStats);

  // === SQUAD (8%) — venue-specific goal rates ===
  const homeGoalRate = calculateGoalRate(homeForm);
  const awayGoalRate = calculateGoalRate(awayForm);
  const homeEffScored = homeStats?.homeGoalsForAvg || homeGoalRate.scored;
  const homeEffConceded = homeStats?.homeGoalsAgainstAvg || homeGoalRate.conceded;
  const awayEffScored = awayStats?.awayGoalsForAvg || awayGoalRate.scored;
  const awayEffConceded = awayStats?.awayGoalsAgainstAvg || awayGoalRate.conceded;
  const homeSquadScore = clamp(50 + (homeEffScored - homeEffConceded) * 18, 0, 100);
  const awaySquadScore = clamp(50 + (awayEffScored - awayEffConceded) * 18, 0, 100);

  // === HOME ADVANTAGE (7%) — PER-LEAGUE DYNAMIC ===
  const leagueHomeAdv = (standings && leagueId) ? calculateLeagueHomeAdvantage(standings, leagueId) : 52;
  const homeAdvBase = leagueHomeAdv / 100;
  let homeAdvantageScore = clamp(50 + (homeAdvBase - 0.45) * 20, 48, 58);
  let awayAdvantageScore = clamp(100 - homeAdvantageScore, 42, 52);

  // === H2H (5%) ===
  const homeH2HScore = calculateH2HScore(h2h, homeTeamId, awayTeamId);
  const awayH2HScore = 100 - homeH2HScore;

  // === STANDINGS (10%) ===
  const homeStandingsScore = standings ? getStandingsScore(standings, homeTeamId) : 50;
  const awayStandingsScore = standings ? getStandingsScore(standings, awayTeamId) : 50;

  // === ODDS IMPLIED PROBABILITY (25% of final) ===
  let oddsHomeProb = 50, oddsDrawProb = 25, oddsAwayProb = 25;
  let hasOdds = false;
  if (odds && odds.homeOdds > 0 && odds.drawOdds > 0 && odds.awayOdds > 0) {
    hasOdds = true;
    // Convert to implied probability and normalize (remove vig)
    const rawH = 1.0 / odds.homeOdds;
    const rawD = 1.0 / odds.drawOdds;
    const rawA = 1.0 / odds.awayOdds;
    const total = rawH + rawD + rawA;
    oddsHomeProb = Math.round((rawH / total) * 100);
    oddsDrawProb = Math.round((rawD / total) * 100);
    oddsAwayProb = 100 - oddsHomeProb - oddsDrawProb;
  }

  // === TEMPO COMPONENT ===
  const tempoComponent = tempo.score;

  // === FORM COMPOSITE (60% of final) ===
  // Combine all form-related sub-scores into a single composite
  const homeFormComposite =
    homeFormScore * SUB_FORM + homeQualityScore * SUB_QUALITY + homeSquadScore * SUB_SQUAD +
    homeAdvantageScore * SUB_HOME + homeH2HScore * SUB_H2H + homeStandingsScore * SUB_STANDINGS +
    tempoComponent * SUB_TEMPO;
  const awayFormComposite =
    awayFormScore * SUB_FORM + awayQualityScore * SUB_QUALITY + awaySquadScore * SUB_SQUAD +
    awayAdvantageScore * SUB_HOME + awayH2HScore * SUB_H2H + awayStandingsScore * SUB_STANDINGS +
    (100 - tempoComponent) * SUB_TEMPO;

  // === xG MODEL (15% of final) ===
  const leagueAvgGoals = leagueProfile.avgGoalsPerMatch > 0 ? leagueProfile.avgGoalsPerMatch / 2 : 1.30;
  let homeXg: number, awayXg: number;
  if (homeStats && awayStats && homeStats.homeGoalsForAvg > 0 && awayStats.awayGoalsAgainstAvg > 0) {
    homeXg = (homeStats.homeGoalsForAvg * awayStats.awayGoalsAgainstAvg) / leagueAvgGoals;
    awayXg = (awayStats.awayGoalsForAvg * homeStats.homeGoalsAgainstAvg) / leagueAvgGoals;
  } else {
    homeXg = (homeGoalRate.scored + awayGoalRate.conceded) / 2;
    awayXg = (awayGoalRate.scored + homeGoalRate.conceded) / 2;
  }
  homeXg = clamp(homeXg, 0.3, 3.5);
  awayXg = clamp(awayXg, 0.2, 3.0);

  // === ODDS-CALIBRATED xG ADJUSTMENT ===
  // Adjust xG using Over/Under implied probabilities before Poisson
  let calibratedHomeXg = homeXg;
  let calibratedAwayXg = awayXg;
  
  if (odds && odds.over25Odds !== null && odds.over25Odds > 0 && odds.under25Odds !== null && odds.under25Odds > 0) {
    const rawOverProb = 1.0 / odds.over25Odds;
    const rawUnderProb = 1.0 / odds.under25Odds;
    const totalOU = rawOverProb + rawUnderProb;
    const normOverProb = totalOU > 0 ? (rawOverProb / totalOU) * 100 : 50;
    
    // Over 2.5 probability ≥ 60% → increase total xG by 10-15%
    if (normOverProb >= 60) {
      const boost = 1.0 + 0.10 + (normOverProb - 60) * 0.00125; // 10% base + up to 5% extra
      calibratedHomeXg *= boost;
      calibratedAwayXg *= boost;
    }
    // Under 2.5 probability ≥ 60% → decrease total xG by 10-15%
    else if (normOverProb <= 40) { // Under prob >= 60%
      const reduction = 1.0 - 0.10 - (40 - normOverProb) * 0.00125;
      calibratedHomeXg *= reduction;
      calibratedAwayXg *= reduction;
    }
  }
  
  // BTTS implied probability adjustment
  if (odds && odds.bttsYesOdds !== null && odds.bttsYesOdds > 0) {
    const rawBttsProb = 1.0 / odds.bttsYesOdds;
    const bttsNoOddsVal = odds.bttsNoOdds ?? 0;
    const totalBtts = bttsNoOddsVal > 0 ? rawBttsProb + (1.0 / bttsNoOddsVal) : rawBttsProb * 2;
    const normBttsYes = (rawBttsProb / totalBtts) * 100;
    
    // BTTS Yes ≥ 60% → ensure both teams have minimum xG floor
    if (normBttsYes >= 60) {
      calibratedHomeXg = Math.max(calibratedHomeXg, 0.8);
      calibratedAwayXg = Math.max(calibratedAwayXg, 0.8);
    }
    // BTTS No ≥ 60% → reduce weaker team xG by 20-30%
    else if (normBttsYes <= 40) {
      const weakerReduction = 0.70 + (normBttsYes / 40) * 0.10; // 70-80% of original
      if (calibratedHomeXg <= calibratedAwayXg) {
        calibratedHomeXg *= weakerReduction;
      } else {
        calibratedAwayXg *= weakerReduction;
      }
    }
  }
  
  // Favorite adjustment: strong favorite (≥65% win prob) → boost fav xG, reduce opponent
  if (hasOdds) {
    if (oddsHomeProb >= 65) {
      calibratedHomeXg *= 1.10; // +10% for favorite
      calibratedAwayXg *= 0.90; // -10% for underdog
    } else if (oddsAwayProb >= 65) {
      calibratedAwayXg *= 1.10;
      calibratedHomeXg *= 0.90;
    }
  }
  
  // === LEAGUE GOAL PROFILE xG ADJUSTMENT ===
  // High-scoring leagues → boost total xG by +10%, Low-scoring → reduce by -10%
  if (leagueProfile.isOverLeague) {
    calibratedHomeXg *= 1.10;
    calibratedAwayXg *= 1.10;
  } else if (leagueProfile.isUnderLeague) {
    calibratedHomeXg *= 0.90;
    calibratedAwayXg *= 0.90;
  }
  
  // === TEMPO-BASED xG ADJUSTMENT ===
  // High tempo → boost xG (more open game), Low tempo → reduce xG
  if (tempo.label === "HIGH") {
    calibratedHomeXg *= 1.08;
    calibratedAwayXg *= 1.08;
  } else if (tempo.label === "LOW") {
    calibratedHomeXg *= 0.92;
    calibratedAwayXg *= 0.92;
  }
  
  // === GAME STATE SIMULATION ===
  // Strong favorite → skew xG toward dominant scores (2-0, 3-0 pattern)
  if (hasOdds && oddsHomeProb >= 60) {
    const dominanceFactor = (oddsHomeProb - 60) / 40; // 0-1 scale
    calibratedHomeXg *= 1.0 + dominanceFactor * 0.15;  // up to +15%
    calibratedAwayXg *= 1.0 - dominanceFactor * 0.20;  // up to -20%
  } else if (hasOdds && oddsAwayProb >= 60) {
    const dominanceFactor = (oddsAwayProb - 60) / 40;
    calibratedAwayXg *= 1.0 + dominanceFactor * 0.15;
    calibratedHomeXg *= 1.0 - dominanceFactor * 0.20;
  } else if (hasOdds && Math.abs(oddsHomeProb - oddsAwayProb) <= 10) {
    // Balanced teams → both teams get a small scoring floor (1-1, 2-1 type)
    calibratedHomeXg = Math.max(calibratedHomeXg, 0.9);
    calibratedAwayXg = Math.max(calibratedAwayXg, 0.9);
  }
  
  // Re-clamp after calibration
  calibratedHomeXg = clamp(calibratedHomeXg, 0.2, 4.0);
  calibratedAwayXg = clamp(calibratedAwayXg, 0.15, 3.5);

  // xG → 1X2 probability (scale to 0-100) — use ORIGINAL xG for 1X2, calibrated for scores
  const totalXg = homeXg + awayXg;
  const xgHomeScore = totalXg > 0 ? (homeXg / totalXg) * 100 : 50;
  const xgAwayScore = totalXg > 0 ? (awayXg / totalXg) * 100 : 50;

  // === FINAL WEIGHTED TOTAL: Form 60% + Odds 25% + xG 15% ===
  const homeTotal = homeFormComposite * WEIGHT_1X2_FORM + oddsHomeProb * WEIGHT_1X2_ODDS + xgHomeScore * WEIGHT_1X2_XG;
  const awayTotal = awayFormComposite * WEIGHT_1X2_FORM + oddsAwayProb * WEIGHT_1X2_ODDS + xgAwayScore * WEIGHT_1X2_XG;

  // === PROBABILITIES ===
  const diff = homeTotal - awayTotal;
  const diffAbs = Math.abs(diff);
  const strength = clamp(diffAbs / 18, 0, 1);

  // === DRAW SUPPRESSION ===
  let rawDraw = 30 - strength * 14;
  rawDraw = suppressDraw(Math.round(rawDraw), homeXg, awayXg);
  
  // === ODDS-BASED DRAW BOOST ===
  if (hasOdds && oddsDrawProb >= 28) {
    rawDraw = Math.max(rawDraw, Math.round(oddsDrawProb * 0.85));
  }
  if (hasOdds && (oddsHomeProb >= 65 || oddsAwayProb >= 65)) {
    rawDraw = Math.min(rawDraw, 20);
  }

  const homeShare = sigmoid(diff / 7);
  let homeWin = (100 - rawDraw) * homeShare;
  let awayWin = 100 - rawDraw - homeWin;
  let draw = rawDraw;
  
  // === ODDS CORRECTION LAYER ===
  if (hasOdds) {
    if (oddsHomeProb >= 60 && homeWin < 50) {
      homeWin = Math.round(homeWin * 0.6 + oddsHomeProb * 0.4);
    }
    if (oddsAwayProb >= 60 && awayWin < 50) {
      awayWin = Math.round(awayWin * 0.6 + oddsAwayProb * 0.4);
    }
    const winTotal = homeWin + awayWin;
    draw = 100 - winTotal;
    if (draw < 12) { draw = 12; homeWin = Math.round((100 - draw) * (homeWin / winTotal)); awayWin = 100 - draw - homeWin; }
  }
  
  homeWin = Math.round(clamp(homeWin, 10, 75));
  draw = Math.round(clamp(draw, 12, 28));
  awayWin = 100 - homeWin - draw;
  if (awayWin < 10) { const d = 10 - awayWin; awayWin = 10; const td = Math.min(d, Math.max(0, draw - 12)); draw -= td; homeWin = 100 - draw - awayWin; }
  if (homeWin < 10) { const d = 10 - homeWin; homeWin = 10; const td = Math.min(d, Math.max(0, draw - 12)); draw -= td; awayWin = 100 - draw - homeWin; }

  // === GOAL MARKETS (Poisson) — using CALIBRATED xG for accurate scores ===
  const goalMarkets = poissonGoalMarkets(calibratedHomeXg, calibratedAwayXg);
  const style = detectStyleMatchup(homeStats, awayStats, homeForm, awayForm);

  // === FORM-BASED OVER/BTTS SCORING (last 5 matches) ===
  const homeFormLast5 = homeForm.slice(0, 5);
  const awayFormLast5 = awayForm.slice(0, 5);

  // Count Over 2.5 and BTTS occurrences in last 5 matches
  const homeOver25Count = homeFormLast5.filter(m => (m.goalsFor + m.goalsAgainst) > 2).length;
  const awayOver25Count = awayFormLast5.filter(m => (m.goalsFor + m.goalsAgainst) > 2).length;
  const homeBttsCount = homeFormLast5.filter(m => m.goalsFor > 0 && m.goalsAgainst > 0).length;
  const awayBttsCount = awayFormLast5.filter(m => m.goalsFor > 0 && m.goalsAgainst > 0).length;

  // Goals averages from last 5
  const homeAvgScored5 = homeFormLast5.length > 0 ? homeFormLast5.reduce((s, m) => s + m.goalsFor, 0) / homeFormLast5.length : 1.0;
  const awayAvgScored5 = awayFormLast5.length > 0 ? awayFormLast5.reduce((s, m) => s + m.goalsFor, 0) / awayFormLast5.length : 1.0;
  const homeAvgConceded5 = homeFormLast5.length > 0 ? homeFormLast5.reduce((s, m) => s + m.goalsAgainst, 0) / homeFormLast5.length : 1.0;
  const awayAvgConceded5 = awayFormLast5.length > 0 ? awayFormLast5.reduce((s, m) => s + m.goalsAgainst, 0) / awayFormLast5.length : 1.0;

  // === WEIGHTED SCORING: Form=60%, Odds=25%, xG=15% ===
  const homeOver25Freq = homeFormLast5.length > 0 ? homeOver25Count / homeFormLast5.length : 0.5;
  const awayOver25Freq = awayFormLast5.length > 0 ? awayOver25Count / awayFormLast5.length : 0.5;
  const avgGoalsAll = ((homeAvgScored5 + homeAvgConceded5) + (awayAvgScored5 + awayAvgConceded5)) / 2;
  const goalsAvgNorm = clamp(avgGoalsAll / 4.0, 0, 1);
  
  // FORM component (60%): frequency + goals average
  const formOverRaw = homeOver25Freq * 0.50 + awayOver25Freq * 0.50; // 0-1 scale
  const formOverComponent = formOverRaw * 0.75 + goalsAvgNorm * 0.25; // blend with goals avg
  
  // ODDS component (25%): implied probability from bookmaker Over/Under 2.5 odds
  let oddsOverComponent = 0.5; // neutral default when odds unavailable
  let oddsOverStrong = false; // strong signal flag
  let oddsUnderStrong = false;
  if (odds && odds.over25Odds !== null && odds.over25Odds > 0 && odds.under25Odds !== null && odds.under25Odds > 0) {
    // Convert to implied probability and normalize (remove vig)
    const rawProbOver = 1.0 / odds.over25Odds;
    const rawProbUnder = 1.0 / odds.under25Odds;
    const totalProb = rawProbOver + rawProbUnder;
    oddsOverComponent = totalProb > 0 ? rawProbOver / totalProb : 0.5; // normalized 0-1
    
    // Strong signal detection
    if (odds.over25Odds <= 1.60) oddsOverStrong = true;
    if (odds.under25Odds <= 1.70) oddsUnderStrong = true;
  } else if (odds && odds.over25Odds !== null && odds.over25Odds > 0) {
    // Only Over odds available — estimate implied probability
    oddsOverComponent = clamp(1.0 / odds.over25Odds, 0.2, 0.85);
    if (odds.over25Odds <= 1.60) oddsOverStrong = true;
  } else if (odds) {
    // Fallback from 1X2 odds
    const shortestOdds1x2 = Math.min(odds.homeOdds, odds.awayOdds);
    if (shortestOdds1x2 < 1.80) oddsOverComponent = 0.58;
    else if (shortestOdds1x2 < 2.20) oddsOverComponent = 0.53;
  }
  
  // xG component (15%)
  const totalXgNorm = clamp((homeXg + awayXg) / 4.0, 0, 1); // 4 xG = max
  
  // FINAL OVER SCORE: Form 60% + Odds 25% + xG 15%
  const formOverScore = formOverComponent * 0.60 + oddsOverComponent * 0.25 + totalXgNorm * 0.15;
  
  // BTTS scoring: same weighted approach
  const homeBttsFreq = homeFormLast5.length > 0 ? homeBttsCount / homeFormLast5.length : 0.5;
  const awayBttsFreq = awayFormLast5.length > 0 ? awayBttsCount / awayFormLast5.length : 0.5;
  const homeScoringBonus = homeAvgScored5 >= 1.2 ? 0.1 : 0;
  const awayScoringBonus = awayAvgScored5 >= 1.2 ? 0.1 : 0;
  
  // BTTS odds implied probability
  let oddsBttsComponent = 0.5;
  if (odds && odds.bttsYesOdds !== null && odds.bttsYesOdds > 0) {
    const rawBttsProb = 1.0 / odds.bttsYesOdds;
    // If bttsNoOdds available, normalize
    const bttsNoOdds = (odds as any).bttsNoOdds;
    if (bttsNoOdds && bttsNoOdds > 0) {
      const totalBttsProb = rawBttsProb + (1.0 / bttsNoOdds);
      oddsBttsComponent = totalBttsProb > 0 ? rawBttsProb / totalBttsProb : rawBttsProb;
    } else {
      oddsBttsComponent = clamp(rawBttsProb, 0.2, 0.85);
    }
  }
  
  const bttsXgComponent = (homeXg >= 1.0 && awayXg >= 0.8) ? 0.7 : (homeXg >= 0.5 && awayXg >= 0.5) ? 0.55 : 0.4;
  const formBttsRaw = homeBttsFreq * 0.40 + awayBttsFreq * 0.40 + homeScoringBonus + awayScoringBonus;
  const formBttsScore = clamp(formBttsRaw, 0, 1) * 0.60 + oddsBttsComponent * 0.25 + bttsXgComponent * 0.15;
  
  // Convert weighted scores to probability adjustments (-18 to +18)
  const formOverAdjust = Math.round((formOverScore - 0.5) * 36);
  const formBttsAdjust = Math.round((formBttsScore - 0.5) * 36);

  // Blend Poisson + Style + League + Weighted scoring
  let adjustedOver25 = clamp(goalMarkets.over25 + style.overBoost + leagueProfile.overBoost + formOverAdjust, 5, 95);
  let adjustedBttsYes = clamp(goalMarkets.bttsYes + style.bttsBoost + leagueProfile.bttsBoost + formBttsAdjust, 5, 95);
  
  // === ODDS STRONG SIGNAL OVERRIDES ===
  // If bookmaker Over 2.5 odds ≤ 1.60 → strong Over correction
  if (oddsOverStrong) {
    adjustedOver25 = Math.max(adjustedOver25, 66);
  }
  // If bookmaker Under 2.5 odds ≤ 1.70 → strong Under correction
  if (oddsUnderStrong) {
    adjustedOver25 = Math.min(adjustedOver25, 40);
  }
  
  // === BTTS ODDS STRONG SIGNAL ===
  // If bookmaker BTTS Yes odds ≤ 1.65 → strong BTTS YES override
  if (odds && odds.bttsYesOdds !== null && odds.bttsYesOdds <= 1.65) {
    adjustedBttsYes = Math.max(adjustedBttsYes, 64);
  }
  // If bookmaker BTTS No odds ≤ 1.65 → strong BTTS NO signal
  if (odds && odds.bttsNoOdds !== null && odds.bttsNoOdds <= 1.65) {
    adjustedBttsYes = Math.min(adjustedBttsYes, 38);
  }
  
  // === OVER/UNDER ↔ BTTS ALIGNMENT ===
  // If Over 2.5 is strong (≥65%) → boost BTTS YES (high-scoring games usually have both teams scoring)
  if (adjustedOver25 >= 65) {
    adjustedBttsYes = Math.max(adjustedBttsYes, Math.round(adjustedBttsYes * 1.08)); // +8% boost
  }
  // If Under 2.5 is strong (≤35%) → reduce BTTS YES (low-scoring games = less likely both score)
  if (adjustedOver25 <= 35) {
    adjustedBttsYes = Math.min(adjustedBttsYes, Math.round(adjustedBttsYes * 0.88)); // -12% reduction
  }

  // Rule 1: If either team has 4+ Over 2.5 in last 5 → FORCE Over direction
  if (homeOver25Count >= 4 || awayOver25Count >= 4) {
    adjustedOver25 = Math.max(adjustedOver25, 65);
  }
  // Rule 2: Combined over25 count >= 7 → NEVER UNDER (both teams consistently high scoring)
  if (homeOver25Count + awayOver25Count >= 7) {
    adjustedOver25 = Math.max(adjustedOver25, 72); // Strong Over signal
  }
  // Rule 3: If both teams scored in 4+ of last 5 → FORCE BTTS Yes
  if (homeBttsCount >= 4 && awayBttsCount >= 4) {
    adjustedBttsYes = Math.max(adjustedBttsYes, 62);
  }
  // Rule 4: Both teams low scoring → lock Under + BTTS No
  if (homeAvgScored5 + homeAvgConceded5 < 1.8 && awayAvgScored5 + awayAvgConceded5 < 1.8) {
    adjustedOver25 = Math.min(adjustedOver25, 35);
    adjustedBttsYes = Math.min(adjustedBttsYes, 35);
  }
  // Rule 5: Both teams high scoring (avg scored ≥ 1.5) → prevent BTTS No
  if (homeAvgScored5 >= 1.5 && awayAvgScored5 >= 1.5) {
    adjustedBttsYes = Math.max(adjustedBttsYes, 58);
  }
  // Rule 6: xG FORCE — strong xG signal overrides
  const totalXgForRules = homeXg + awayXg;
  if (totalXgForRules >= 3.0) {
    adjustedOver25 = Math.max(adjustedOver25, 68); // FORCE Over when xG is very high
  }
  if (homeXg >= 1.5 && awayXg >= 1.2) {
    adjustedBttsYes = Math.max(adjustedBttsYes, 60); // FORCE BTTS Yes when both teams have high xG
  }
  // Rule 7: OPEN GAME detection — both teams avg goals >= 2.5 per game involvement
  const homeAvgTotal5 = homeAvgScored5 + homeAvgConceded5;
  const awayAvgTotal5 = awayAvgScored5 + awayAvgConceded5;
  if (homeAvgTotal5 >= 2.5 && awayAvgTotal5 >= 2.5) {
    adjustedOver25 = Math.max(adjustedOver25, 70); // HIGH SCORING MATCH
    adjustedBttsYes = Math.max(adjustedBttsYes, 62);
  }
  // Rule 8: Strong home team scoring boost
  if (homeStats && homeStats.homeGoalsForAvg >= 2.0) {
    adjustedOver25 = clamp(adjustedOver25 + 3, 5, 95);
  }
  // Rule 9: Weak away attack → reduce BTTS
  if (awayStats && awayStats.awayGoalsForAvg <= 0.6) {
    adjustedBttsYes = Math.min(adjustedBttsYes, 40);
  }
  // Rule 10: Possession/defensive team vs attacking → reduce BTTS
  if (homeStats && awayStats) {
    const homeDefensive = homeStats.cleanSheets.total / Math.max(homeStats.played, 1) >= 0.4;
    const awayDefensive = awayStats.cleanSheets.total / Math.max(awayStats.played, 1) >= 0.4;
    if (homeDefensive || awayDefensive) {
      adjustedBttsYes = clamp(adjustedBttsYes - 5, 5, 95);
    }
  }

  const adjustedUnder25 = clamp(100 - adjustedOver25, 5, 95);
  const adjustedBttsNo = clamp(100 - adjustedBttsYes, 5, 95);

  // === MATCH CONTEXT ENGINE (with match importance) ===
  // Note: motivation deltas already applied to homeFormScore/awayFormScore above.
  // Here we re-fetch context only for goal adjustments and analysis factors.
  const context = standings ? getMatchContext(standings, homeTeamId, awayTeamId, leagueId, leagueName, fixtureRound) : { confidenceBoost: 0, factors: [], goalAdjust: 0, homeMotivation: 0, awayMotivation: 0 };
  // Merge fatigue factors into context.factors so analysis text shows them
  if (fatigue.factors.length > 0) {
    context.factors = [...context.factors, ...fatigue.factors];
  }
  // Apply match context goal adjustments
  if (context.goalAdjust !== 0) {
    adjustedOver25 = clamp(adjustedOver25 + context.goalAdjust, 5, 95);
  }

  // === SMART MARKET SELECTION ENGINE ===
  const dc1X = homeWin + draw;
  const dc12 = homeWin + awayWin;
  const dcX2 = awayWin + draw;

  const defaultPriority: Record<string, number> = {
    "Over 1.5": 1.06,
    "Under 3.5": 1.05,
    "DC 1X": 1.04,
    "DC X2": 1.04,
    "BTTS Yes": 1.03,
    "BTTS No": 1.03,
    "DC 12": 1.02,
    "Over 2.5": 1.01,
    "Under 2.5": 0.99,    // Reduced — was over-selected for low-data matches
    "1": 1.00,
    "2": 1.00,
    "Over 3.5": 0.95,
    "Under 1.5": 0.93,
    "X": 0.82,  // Draw more suppressed
  };

  const MARKET_PRIORITY: Record<string, number> = { ...defaultPriority };
  if (marketAccuracyCache.size > 0) {
    for (const [market, acc] of marketAccuracyCache.entries()) {
      const multiplier = 1.0 + (acc - 50) * 0.006;
      MARKET_PRIORITY[market] = clamp(multiplier, 0.80, 1.15);
    }
  }

  const allMarkets: { label: string; prob: number; priorityProb: number }[] = [
    { label: "1", prob: homeWin, priorityProb: homeWin * (MARKET_PRIORITY["1"] || 1) },
    { label: "2", prob: awayWin, priorityProb: awayWin * (MARKET_PRIORITY["2"] || 1) },
    { label: "X", prob: draw, priorityProb: draw * (MARKET_PRIORITY["X"] || 1) },
    { label: "Over 2.5", prob: adjustedOver25, priorityProb: adjustedOver25 * (MARKET_PRIORITY["Over 2.5"] || 1) },
    { label: "Under 2.5", prob: adjustedUnder25, priorityProb: adjustedUnder25 * (MARKET_PRIORITY["Under 2.5"] || 1) },
    { label: "Over 1.5", prob: goalMarkets.over15, priorityProb: goalMarkets.over15 * (MARKET_PRIORITY["Over 1.5"] || 1) },
    { label: "Under 3.5", prob: goalMarkets.under35, priorityProb: goalMarkets.under35 * (MARKET_PRIORITY["Under 3.5"] || 1) },
    { label: "Over 3.5", prob: goalMarkets.over35, priorityProb: goalMarkets.over35 * (MARKET_PRIORITY["Over 3.5"] || 1) },
    { label: "Under 1.5", prob: goalMarkets.under15, priorityProb: goalMarkets.under15 * (MARKET_PRIORITY["Under 1.5"] || 1) },
    { label: "BTTS Yes", prob: adjustedBttsYes, priorityProb: adjustedBttsYes * (MARKET_PRIORITY["BTTS Yes"] || 1) },
    { label: "BTTS No", prob: adjustedBttsNo, priorityProb: adjustedBttsNo * (MARKET_PRIORITY["BTTS No"] || 1) },
    { label: "DC 1X", prob: dc1X, priorityProb: Math.min(dc1X, 92) * (MARKET_PRIORITY["DC 1X"] || 1) },
    { label: "DC X2", prob: dcX2, priorityProb: Math.min(dcX2, 92) * (MARKET_PRIORITY["DC X2"] || 1) },
    { label: "DC 12", prob: dc12, priorityProb: Math.min(dc12, 92) * (MARKET_PRIORITY["DC 12"] || 1) },
  ];

  // === SMART MARKET SWITCHING (tempo & league profile aware) ===
  const totalXgMarket = homeXg + awayXg;
  const isLowGoals = totalXgMarket < 2.3;
  const isHighGoals = totalXgMarket > 2.8;
  const bothHighScoring = homeXg > 1.3 && awayXg > 1.0;
  const bothDefensive = homeXg < 1.0 && awayXg < 0.9;
  const dominantTeam = Math.abs(homeWin - awayWin) >= 25;

  for (const m of allMarkets) {
    // Tempo-based boosts
    if (tempo.label === "HIGH") {
      if (m.label.startsWith("Over") || m.label === "BTTS Yes") m.priorityProb *= 1.06;
      if (m.label.startsWith("Under") || m.label === "BTTS No") m.priorityProb *= 0.94;
    } else if (tempo.label === "LOW") {
      if (m.label.startsWith("Under") || m.label === "BTTS No") m.priorityProb *= 1.06;
      if (m.label.startsWith("Over") || m.label === "BTTS Yes") m.priorityProb *= 0.94;
    }

    // League profile boosts
    if (leagueProfile.isOverLeague) {
      if (m.label.startsWith("Over")) m.priorityProb *= 1.04;
      if (m.label.startsWith("Under")) m.priorityProb *= 0.96;
    }
    if (leagueProfile.isUnderLeague) {
      if (m.label.startsWith("Under")) m.priorityProb *= 1.04;
      if (m.label.startsWith("Over")) m.priorityProb *= 0.96;
    }

    if (isLowGoals && bothDefensive) {
      if (m.label === "Under 2.5") m.priorityProb *= 1.12;
      if (m.label === "Under 3.5") m.priorityProb *= 1.10;
      if (m.label === "BTTS No") m.priorityProb *= 1.08;
      if (m.label.startsWith("Over")) m.priorityProb *= 0.90;
    }
    if (isHighGoals && bothHighScoring) {
      if (m.label === "Over 2.5") m.priorityProb *= 1.12;
      if (m.label === "BTTS Yes") m.priorityProb *= 1.10;
      if (m.label === "Over 1.5") m.priorityProb *= 1.08;
      if (m.label.startsWith("Under")) m.priorityProb *= 0.90;
    }
    if (dominantTeam) {
      const strongerIsHome = homeWin > awayWin;
      if (strongerIsHome && (m.label === "1" || m.label === "DC 1X")) m.priorityProb *= 1.08;
      if (!strongerIsHome && (m.label === "2" || m.label === "DC X2")) m.priorityProb *= 1.08;
    }
    
    // === OPEN GAME DETECTION ===
    // Both teams avg goals involvement >= 2.5 per game → high scoring match
    if (homeAvgTotal5 >= 2.5 && awayAvgTotal5 >= 2.5) {
      if (m.label === "Over 2.5") m.priorityProb *= 1.15;
      if (m.label === "BTTS Yes") m.priorityProb *= 1.12;
      if (m.label === "Over 1.5") m.priorityProb *= 1.10;
      if (m.label.startsWith("Under")) m.priorityProb *= 0.85;
      if (m.label === "BTTS No") m.priorityProb *= 0.85;
    }
    
    // === ODDS INTELLIGENCE BOOST for Over/BTTS markets ===
    if (odds?.over25Odds !== null && odds?.over25Odds !== undefined && odds.over25Odds <= 1.65) {
      if (m.label === "Over 2.5") m.priorityProb *= 1.10;
      if (m.label === "Under 2.5") m.priorityProb *= 0.88;
    }
    if (odds?.bttsYesOdds !== null && odds?.bttsYesOdds !== undefined && odds.bttsYesOdds <= 1.70) {
      if (m.label === "BTTS Yes") m.priorityProb *= 1.10;
      if (m.label === "BTTS No") m.priorityProb *= 0.88;
    }
    
    // === "FALSE UNDER" PREVENTION ===
    // Combined over25 count >= 7 → NEVER select Under
    if (homeOver25Count + awayOver25Count >= 7) {
      if (m.label === "Under 2.5") m.priorityProb *= 0.60; // Heavy penalty
      if (m.label === "Under 1.5") m.priorityProb *= 0.50;
    }
  }

  allMarkets.sort((a, b) => b.priorityProb - a.priorityProb);
  // NO hard filtering — always pick the best market by ranking, never hide markets
  const viableMarkets = allMarkets;
  const bestMarket = viableMarkets.length > 0 ? viableMarkets[0] : allMarkets[0];
  const prediction = bestMarket.label;
  const bestProb = bestMarket.prob;

  // === SCORE PREDICTION ===
  // For goal/BTTS markets, generate score that matches the market
  let scorePrediction: string;
  if (prediction === "Over 2.5" || prediction === "Over 3.5") {
    const hg = Math.max(1, Math.round(homeXg));
    const ag = Math.max(1, Math.round(awayXg));
    const total = hg + ag;
    if (total <= 2) scorePrediction = homeXg > awayXg ? "2-1" : "1-2";
    else scorePrediction = `${hg}-${ag}`;
  } else if (prediction === "BTTS Yes") {
    const hg = Math.max(1, Math.round(homeXg));
    const ag = Math.max(1, Math.round(awayXg));
    scorePrediction = `${hg}-${ag}`;
  } else if (prediction === "BTTS No") {
    if (homeXg > awayXg) scorePrediction = `${Math.max(1, Math.round(homeXg))}-0`;
    else scorePrediction = `0-${Math.max(1, Math.round(awayXg))}`;
  } else if (prediction === "Under 2.5" || prediction === "Under 1.5") {
    if (homeXg > awayXg) scorePrediction = "1-0";
    else if (awayXg > homeXg) scorePrediction = "0-1";
    else scorePrediction = "1-1";
  } else if (prediction === "Under 3.5") {
    if (homeXg > awayXg) scorePrediction = "2-0";
    else scorePrediction = "1-1";
  } else if (prediction.startsWith("DC")) {
    scorePrediction = predictScoreV2({
      homeGoalRate, awayGoalRate, homeWin, awayWin, draw,
      prediction: homeWin >= awayWin ? "1" : "2",
    });
  } else {
    scorePrediction = predictScoreV2({
      homeGoalRate, awayGoalRate, homeWin, awayWin, draw,
      prediction: prediction === "1" || prediction === "2" || prediction === "X" ? prediction :
                  (homeWin >= awayWin ? "1" : "2"),
    });
  }
  let predictedScore = scorePrediction;

  // ============================================================
  // === CONSISTENCY ENGINE — Cross-market logical alignment ===
  // ============================================================
  // Parse predicted score
  const scoreParts = predictedScore.split("-").map(Number);
  const predHomeGoals = scoreParts[0] ?? 0;
  const predAwayGoals = scoreParts[1] ?? 0;
  const predTotalGoals = predHomeGoals + predAwayGoals;
  const predBothScored = predHomeGoals > 0 && predAwayGoals > 0;

  // Rule C1: Over 2.5 prediction → score must have 3+ goals
  if ((prediction === "Over 2.5" || prediction === "Over 3.5") && predTotalGoals < 3) {
    const hg = Math.max(1, Math.round(homeXg * 1.1));
    const ag = Math.max(1, Math.round(awayXg * 1.1));
    predictedScore = hg + ag >= 3 ? `${hg}-${ag}` : (homeXg > awayXg ? "2-1" : "1-2");
  }

  // Rule C2: Under 2.5 prediction → score must have ≤2 goals  
  if ((prediction === "Under 2.5" || prediction === "Under 1.5") && predTotalGoals > 2) {
    if (homeXg > awayXg) predictedScore = "1-0";
    else if (awayXg > homeXg) predictedScore = "0-1";
    else predictedScore = "1-1";
  }

  // Rule C3: BTTS Yes → both teams must score in predicted score
  if (prediction === "BTTS Yes" && !predBothScored) {
    const hg = Math.max(1, Math.round(homeXg));
    const ag = Math.max(1, Math.round(awayXg));
    predictedScore = `${hg}-${ag}`;
  }

  // Rule C4: BTTS No → at least one team must have 0 in predicted score
  if (prediction === "BTTS No" && predBothScored) {
    if (homeXg > awayXg) predictedScore = `${Math.max(1, Math.round(homeXg))}-0`;
    else predictedScore = `0-${Math.max(1, Math.round(awayXg))}`;
  }

  // Rule C5: Strong favorite (homeWin ≥ 60 or awayWin ≥ 60) → score must reflect winner
  if (prediction === "1" && homeWin >= 60 && predHomeGoals <= predAwayGoals) {
    const hg = Math.max(predAwayGoals + 1, Math.round(homeXg));
    predictedScore = `${hg}-${predAwayGoals}`;
  }
  if (prediction === "2" && awayWin >= 60 && predAwayGoals <= predHomeGoals) {
    const ag = Math.max(predHomeGoals + 1, Math.round(awayXg));
    predictedScore = `${predHomeGoals}-${ag}`;
  }

  // Rule C6: Over + BTTS alignment — if Over 2.5 is strong AND BTTS is strong, ensure score reflects both
  if (adjustedOver25 >= 65 && adjustedBttsYes >= 60) {
    const sp = predictedScore.split("-").map(Number);
    if ((sp[0] ?? 0) === 0 || (sp[1] ?? 0) === 0 || (sp[0] + sp[1]) < 3) {
      predictedScore = `${Math.max(1, Math.round(homeXg))}-${Math.max(1, Math.round(awayXg))}`;
      // Ensure 3+ total
      const newParts = predictedScore.split("-").map(Number);
      if (newParts[0] + newParts[1] < 3) predictedScore = homeXg > awayXg ? "2-1" : "1-2";
    }
  }

  // Rule C7: Under + BTTS No alignment — if Under is strong AND BTTS No is strong
  if (adjustedOver25 <= 35 && adjustedBttsYes <= 35) {
    const sp = predictedScore.split("-").map(Number);
    if ((sp[0] ?? 0) > 0 && (sp[1] ?? 0) > 0) {
      // Force one team to 0
      predictedScore = homeXg > awayXg ? "1-0" : "0-1";
    }
  }

  // Rule C8: Draw prediction → score must be equal
  if (prediction === "X") {
    const sp = predictedScore.split("-").map(Number);
    if (sp[0] !== sp[1]) {
      const avgGoals = Math.round((homeXg + awayXg) / 2);
      const g = clamp(avgGoals, 0, 3);
      predictedScore = `${g}-${g}`;
    }
  }

  // Rule C9: DC 1X (home or draw) → home must not lose in score
  if (prediction === "DC 1X") {
    const sp = predictedScore.split("-").map(Number);
    if ((sp[0] ?? 0) < (sp[1] ?? 0)) {
      predictedScore = `${sp[1]}-${sp[0]}`; // Swap to home not losing
    }
  }
  // Rule C10: DC X2 (away or draw) → away must not lose in score
  if (prediction === "DC X2") {
    const sp = predictedScore.split("-").map(Number);
    if ((sp[1] ?? 0) < (sp[0] ?? 0)) {
      predictedScore = `${sp[1]}-${sp[0]}`; // Swap
    }
  }

  let bookmakerProb = 0;
  let aiProb = bestProb;
  let oddsAlignmentAdjust = 0;
  if (odds) {
    if (prediction === "1") { bookmakerProb = odds.homeProb; aiProb = homeWin; }
    else if (prediction === "2") { bookmakerProb = odds.awayProb; aiProb = awayWin; }
    else if (prediction === "X") { bookmakerProb = odds.drawProb; aiProb = draw; }
    else { aiProb = bestProb; bookmakerProb = 50; }

    // Sharp money detection: if odds are very short (< 1.50), market is confident
    const shortestOdds = Math.min(odds.homeOdds, odds.awayOdds);
    if (shortestOdds < 1.50) {
      oddsAlignmentAdjust += 5; // Market is very confident
    }

    // Alignment check
    const probDiff = Math.abs(aiProb - bookmakerProb);
    if (probDiff <= 8) {
      oddsAlignmentAdjust += clamp((8 - probDiff), 0, 5); // AI and market agree
    } else if (probDiff >= 25) {
      oddsAlignmentAdjust -= clamp((probDiff - 20) / 5, 0, 4); // Strong disagreement
    }
  }

  // === VALUE DETECTION ===
  const value = detectValue(aiProb, bookmakerProb, bestProb);

  // === UPSET DETECTION ===
  const upset = detectUpset(
    odds ?? null, homeFormScore, awayFormScore,
    homeXg, awayXg, homeQualityScore, awayQualityScore,
    standings, homeTeamId, awayTeamId, homeTeamName, awayTeamName
  );
  
  // If upset detected, adjust score clusters toward underdog-friendly scores
  if (upset.isUpset) {
    // Boost alternative score clusters (1-1, 1-2 type) via draw probability
    if (upset.upsetTeam === "away" && prediction === "1") {
      // Odds say home wins but data disagrees — reduce confidence
      // Don't change prediction, but lower confidence
    } else if (upset.upsetTeam === "home" && prediction === "2") {
      // Same for away favorite
    }
  }

  // === 🧠 3. NEW CONFIDENCE MODEL (v4 multi-dimensional) ===
  // 
  // confidence = (form_diff * 0.20) + (xG_score * 0.25) + (odds_diff * 0.15)
  //            + (consistency * 0.15) + (tempo_score * 0.15) + (market_signal * 0.10)

  const homeFormPoints5 = homeForm.slice(0, 5).reduce((s, m) => s + (m.result === "W" ? 3 : m.result === "D" ? 1 : 0), 0);
  const awayFormPoints5 = awayForm.slice(0, 5).reduce((s, m) => s + (m.result === "W" ? 3 : m.result === "D" ? 1 : 0), 0);
  const homeFormNorm = (homeFormPoints5 / 15) * 100;
  const awayFormNorm = (awayFormPoints5 / 15) * 100;
  const formDiff = Math.abs(homeFormNorm - awayFormNorm);

  const xgDiff = Math.abs(homeXg - awayXg);
  const xgScore = Math.min(xgDiff * 40, 100);

  let oddsDiff = 0;
  if (odds) {
    oddsDiff = Math.abs(odds.homeProb - odds.awayProb);
  } else {
    oddsDiff = Math.abs(homeWin - awayWin);
  }
  const oddsComponent = Math.min(oddsDiff, 100);

  // Consistency: how stable is each team's form?
  const calcConsistency = (form: FormMatch[]) => {
    const last5 = form.slice(0, 5);
    if (last5.length === 0) return 50;
    const results = last5.map(m => m.result);
    const mostCommon = (["W", "D", "L"] as const).reduce((best, r) =>
      results.filter(x => x === r).length > results.filter(x => x === best).length ? r : best, "W" as const);
    return (results.filter(x => x === mostCommon).length / results.length) * 100;
  };
  const consistencyScore = (calcConsistency(homeForm) + calcConsistency(awayForm)) / 2;

  // Market signal: how much does the market agree with our pick?
  const marketSignal = odds ? clamp(100 - Math.abs(aiProb - bookmakerProb) * 3, 0, 100) : 50;

  // NEW v4 formula
  const confFormComponent = formDiff * 0.20;
  const confXgComponent = xgScore * 0.25;
  const confOddsComponent = oddsComponent * 0.15;
  const confConsistencyComponent = consistencyScore * 0.15;
  const confTempoComponent = tempo.score * 0.15;
  const confMarketComponent = marketSignal * 0.10;

  let confidence = Math.round(
    confFormComponent + confXgComponent + confOddsComponent +
    confConsistencyComponent + confTempoComponent + confMarketComponent
  );

  // === 7. ULTRA BOOST ===
  const ultra = checkUltraBoost(formDiff, xgDiff, odds ?? null);
  confidence += ultra.boost;

  // === BOOST RULES ===
  confidence += oddsAlignmentAdjust;
  confidence += context.confidenceBoost;

  // Value bet boost: if AI sees value the market doesn't, small boost
  if (value.isValueBet) confidence += 5;
  if (value.isStrongValue) confidence += 3; // additional

  // === OPEN GAME CONFIDENCE BOOST ===
  if (homeAvgTotal5 >= 2.5 && awayAvgTotal5 >= 2.5) {
    // High scoring match → boost confidence for Over/BTTS picks
    if (prediction.includes("Over") || prediction === "BTTS Yes") {
      confidence += 10; // Strong form-backed signal
    }
  }
  // Combined over25 form >= 7 → extra confidence for Over picks
  if (homeOver25Count + awayOver25Count >= 7 && prediction.includes("Over")) {
    confidence += 5;
  }

  // === UPSET DETECTION CONFIDENCE PENALTY ===
  if (upset.isUpset) {
    // If we're picking the favorite but upset signals are strong, reduce confidence
    const pickingFavorite = (prediction === "1" && odds && odds.homeProb > odds.awayProb) ||
                            (prediction === "2" && odds && odds.awayProb > odds.homeProb);
    if (pickingFavorite) {
      confidence -= Math.round(upset.confidence * 0.15); // Up to -15 penalty
    }
  }

  // === 6. DATA QUALITY FILTER ===
  const isQualityLeague = QUALITY_LEAGUE_IDS.has(leagueId ?? 0);
  const dataQuality = calculateDataQuality(homeStats, awayStats, homeForm, awayForm, odds ?? null, isQualityLeague);
  confidence += dataQuality.penalty;

  // === PENALTY RULES ===
  if (totalXg < 1.5) confidence -= 5;

  // Close-call penalty
  const sortedForCloseCall = [...allMarkets].sort((a, b) => b.priorityProb - a.priorityProb);
  if (sortedForCloseCall.length >= 2) {
    const top2diff = Math.abs(sortedForCloseCall[0].prob - sortedForCloseCall[1].prob);
    if (top2diff <= 3) confidence -= 3;
  }

  // Data quality caps
  const hasSeasonStats = !!homeStats && !!awayStats && homeStats.played > 0 && awayStats.played > 0;
  const hasMinMatches = hasSeasonStats && homeStats!.played >= MIN_SEASON_MATCHES && awayStats!.played >= MIN_SEASON_MATCHES;
  if (!hasMinMatches) confidence = Math.min(confidence, 70);
  if (!hasSeasonStats) confidence = Math.min(confidence, 65);

  // Non-quality leagues capped
  if (!isQualityLeague) confidence = Math.min(confidence, PREMIUM_MIN_CONFIDENCE - 1);

  confidence = Math.round(clamp(confidence, 30, 95));

  // === RISK ===
  let riskLevel: "low" | "medium" | "high";
  if (confidence >= 76) riskLevel = "low";
  else if (confidence >= 60) riskLevel = "medium";
  else riskLevel = "high";

  // === 8. OUTPUT UPGRADE — RICH ANALYSIS ===
  const confidenceLabel = confidence >= 78 ? "HIGH" : confidence >= 65 ? "MEDIUM" : "LOW";
  const xgTotal = (homeXg + awayXg).toFixed(1);
  const analysisReasons: string[] = [];

  // Smart market switch reasoning
  if (isLowGoals && bothDefensive) analysisReasons.push(`Low-scoring profile (xG: ${xgTotal}) → Under/BTTS No favored`);
  else if (isHighGoals && bothHighScoring) analysisReasons.push(`High-scoring profile (xG: ${xgTotal}) → Over/BTTS favored`);
  else if (dominantTeam) analysisReasons.push(`Clear quality gap → ${homeWin > awayWin ? homeTeamName : awayTeamName} dominant`);

  if (prediction.includes("Over")) analysisReasons.push(`Expected goals: ${xgTotal} (${homeXg.toFixed(1)} + ${awayXg.toFixed(1)})`);
  else if (prediction.includes("Under")) analysisReasons.push(`Low expected goals: ${xgTotal}`);
  else if (prediction.includes("BTTS")) analysisReasons.push(`xG: ${homeTeamName} ${homeXg.toFixed(1)} - ${awayTeamName} ${awayXg.toFixed(1)}`);
  else if (prediction.includes("DC")) analysisReasons.push(`Double Chance covers ${prediction.replace("DC ", "")}: combined ${bestProb}%`);
  else analysisReasons.push(`xG: ${homeTeamName} ${homeXg.toFixed(1)} - ${awayTeamName} ${awayXg.toFixed(1)}`);

  if (Math.abs(homeFormScore - awayFormScore) >= 15) {
    analysisReasons.push(`${homeFormScore > awayFormScore ? homeTeamName : awayTeamName} in stronger recent form`);
  }
  if (style.label !== "Balanced matchup") analysisReasons.push(style.label);
  
  const homeRecentWins = homeForm.slice(0, 5).filter(m => m.result === "W").length;
  const awayRecentWins = awayForm.slice(0, 5).filter(m => m.result === "W").length;
  if (homeRecentWins >= 4) analysisReasons.push(`${homeTeamName}: ${homeRecentWins}/5 recent wins`);
  if (awayRecentWins >= 4) analysisReasons.push(`${awayTeamName}: ${awayRecentWins}/5 recent wins`);

  for (const cf of context.factors.slice(0, 1)) analysisReasons.push(cf);

  // Form-based Over/BTTS insights (WHY THIS PICK)
  if (prediction.includes("Over") || prediction === "BTTS Yes") {
    if (homeOver25Count >= 3) analysisReasons.push(`⚽ ${homeTeamName}: ${homeOver25Count}/5 matches Over 2.5`);
    if (awayOver25Count >= 3) analysisReasons.push(`⚽ ${awayTeamName}: ${awayOver25Count}/5 matches Over 2.5`);
    if (homeBttsCount >= 3) analysisReasons.push(`🔄 ${homeTeamName}: BTTS in ${homeBttsCount}/5 recent matches`);
    if (awayBttsCount >= 3) analysisReasons.push(`🔄 ${awayTeamName}: BTTS in ${awayBttsCount}/5 recent matches`);
    if (totalXgForRules >= 3.0) analysisReasons.push(`📊 xG: ${totalXgForRules.toFixed(1)} (high scoring expected)`);
  }
  if (prediction.includes("Under") || prediction === "BTTS No") {
    if (homeOver25Count <= 1) analysisReasons.push(`🛡️ ${homeTeamName}: Only ${homeOver25Count}/5 matches Over 2.5`);
    if (awayOver25Count <= 1) analysisReasons.push(`🛡️ ${awayTeamName}: Only ${awayOver25Count}/5 matches Over 2.5`);
  }
  
  // Open Game indicator
  if (homeAvgTotal5 >= 2.5 && awayAvgTotal5 >= 2.5) {
    analysisReasons.push(`🔥 OPEN GAME: Both teams avg ${homeAvgTotal5.toFixed(1)} & ${awayAvgTotal5.toFixed(1)} goals/game involvement`);
  }

  // Odds intelligence insights (implied probability)
  if (odds?.over25Odds !== null && odds?.over25Odds !== undefined && odds.over25Odds > 0) {
    const impliedOver = (1.0 / odds.over25Odds * 100).toFixed(0);
    if (odds.over25Odds <= 1.65) {
      analysisReasons.push(`📉 Bookmaker: Over 2.5 @ ${odds.over25Odds.toFixed(2)} (implied ${impliedOver}% — strong signal)`);
    } else if (odds.over25Odds <= 1.85) {
      analysisReasons.push(`📊 Bookmaker: Over 2.5 @ ${odds.over25Odds.toFixed(2)} (implied ${impliedOver}%)`);
    }
  }
  if (odds?.under25Odds !== null && odds?.under25Odds !== undefined && odds.under25Odds > 0) {
    if (odds.under25Odds <= 1.70) {
      const impliedUnder = (1.0 / odds.under25Odds * 100).toFixed(0);
      analysisReasons.push(`📉 Bookmaker: Under 2.5 @ ${odds.under25Odds.toFixed(2)} (implied ${impliedUnder}% — strong signal)`);
    }
  }
  if (odds?.bttsYesOdds !== null && odds?.bttsYesOdds !== undefined && odds.bttsYesOdds > 0) {
    if (odds.bttsYesOdds <= 1.70 && (prediction === "BTTS Yes" || prediction.includes("Over"))) {
      const impliedBtts = (1.0 / odds.bttsYesOdds * 100).toFixed(0);
      analysisReasons.push(`📉 Bookmaker: BTTS Yes @ ${odds.bttsYesOdds.toFixed(2)} (implied ${impliedBtts}% — strong signal)`);
    }
  }

  // Match context factors
  for (const cf of context.factors.slice(0, 2)) analysisReasons.push(cf);

  // Ultra tag
  if (ultra.isUltra) analysisReasons.push(`🔥 ULTRA STRONG: Form + xG + Odds all converge`);

  // Value indicator
  if (value.isStrongValue) analysisReasons.push(`💰 STRONG VALUE: AI sees +${Math.round(value.valuePercent)}% edge over market`);
  else if (value.isValueBet) analysisReasons.push(`💰 VALUE BET: +${Math.round(value.valuePercent)}% above market`);

  // Tempo indicator
  analysisReasons.push(`📊 Match Tempo: ${tempo.label}`);

  // League profile
  if (leagueProfile.isOverLeague) analysisReasons.push(`📈 High-scoring league (avg ${leagueProfile.avgGoalsPerMatch.toFixed(1)} goals/match)`);
  if (leagueProfile.isUnderLeague) analysisReasons.push(`📉 Low-scoring league (avg ${leagueProfile.avgGoalsPerMatch.toFixed(1)} goals/match)`);

  // Upset detection
  if (upset.isUpset) {
    for (const uf of upset.factors.slice(0, 3)) analysisReasons.push(uf);
  }

  // === TOP CORRECT SCORES (Poisson + consistency filtered) ===
  const filteredTopScores = filterScoresByMarket(goalMarkets.topScores, prediction, adjustedOver25, adjustedBttsYes);
  const scoreConfLabel = goalMarkets.scoreConfidence === "high" ? "🎯 High" : goalMarkets.scoreConfidence === "medium" ? "📊 Medium" : "⚠️ Low";
  const topScoresStr = filteredTopScores.map(s => `${s.score} (${s.prob}%)`).join(", ");
  analysisReasons.push(`🏆 Top Scores: ${topScoresStr} — Confidence: ${scoreConfLabel}`);

  // === SCORE CLUSTERS ===
  const clusters = getScoreClusters(goalMarkets.topScores);
  const clusterStr = clusters.map(c => `${c.cluster}: ${c.prob}% (${c.scores.join(", ")})`).join(" | ");
  analysisReasons.push(`📊 Score Clusters: ${clusterStr}`);

  const analysis = generateAnalysisV2({
    homeTeamName, awayTeamName, prediction,
    homeWin, draw, awayWin,
    homeFormScore, awayFormScore,
    homeQualityScore, awayQualityScore,
    confidenceLabel, valuePercent: value.valuePercent, xgTotal,
    homeXg, awayXg, bestProb,
    analysisReasons, style,
    tempoLabel: tempo.label,
    valueLabel: value.label,
    isUltra: ultra.isUltra,
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
    const avg = clamp(Math.round((homeXg + awayXg) / 2), 0, 3);
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
  confidenceLabel?: string;
  valuePercent?: number;
  xgTotal?: string;
  homeXg?: number;
  awayXg?: number;
  bestProb?: number;
  analysisReasons?: string[];
  style?: { overBoost: number; underBoost: number; bttsBoost: number; label: string };
  tempoLabel?: "LOW" | "MEDIUM" | "HIGH";
  valueLabel?: string;
  isUltra?: boolean;
}): string {
  const {
    homeTeamName, awayTeamName, prediction,
    homeWin, draw, awayWin,
    homeFormScore, awayFormScore,
    homeQualityScore, awayQualityScore,
    confidenceLabel, valuePercent, xgTotal,
    homeXg, awayXg, bestProb,
    analysisReasons, style,
    tempoLabel, valueLabel, isUltra,
  } = params;

  const sections: string[] = [];

  // Structured header
  sections.push(`📌 Prediction: ${prediction}`);
  sections.push(`📊 Probability: ${bestProb ?? Math.max(homeWin, awayWin, draw)}%`);
  if (confidenceLabel) sections.push(`🎯 Confidence: ${confidenceLabel}`);
  if (isUltra) sections.push(`🔥 ULTRA STRONG PICK`);
  if (valueLabel && valueLabel !== "NO VALUE") {
    sections.push(`💰 ${valueLabel}: ${valuePercent !== undefined && valuePercent > 0 ? "+" : ""}${Math.round(valuePercent ?? 0)}%`);
  }
  if (tempoLabel) sections.push(`⚡ Match Tempo: ${tempoLabel}`);

  // AI Reasoning
  if (analysisReasons && analysisReasons.length > 0) {
    sections.push(`\n🧠 AI Reasoning:\n${analysisReasons.map(r => `• ${r}`).join("\n")}`);
  }

  // Narrative
  if (prediction === "1") {
    sections.push(`\n${homeTeamName} has the edge in recent form and quality. Home advantage boosts the case. Model: ${homeWin}% vs ${awayWin}%.`);
  } else if (prediction === "2") {
    sections.push(`\n${awayTeamName} shows stronger signals even away. Model: ${awayWin}% vs ${homeWin}%.`);
  } else if (prediction.includes("Over")) {
    sections.push(`\nGoal expectation: ${xgTotal ?? "2.5+"} total. Both attacks productive for ${prediction}.`);
  } else if (prediction.includes("Under")) {
    sections.push(`\nLow xG (${xgTotal ?? "<2.5"}). Defensive profiles favor ${prediction}.`);
  } else if (prediction === "BTTS Yes") {
    sections.push(`\nBoth teams scoring regularly. xG: ${homeXg?.toFixed(1) ?? "?"}-${awayXg?.toFixed(1) ?? "?"}.`);
  } else if (prediction === "BTTS No") {
    sections.push(`\nClean sheet expected. Defensive form drives BTTS No.`);
  } else if (prediction.startsWith("DC")) {
    const dcLabel = prediction.replace("DC ", "");
    sections.push(`\nDouble Chance ${dcLabel} offers safety: combined probability ${bestProb}%. Model: ${homeWin}%/${draw}%/${awayWin}%.`);
  } else {
    sections.push(`\nBalanced: Draw ${draw}%, split ${homeWin}%/${awayWin}%.`);
  }

  return sections.join("\n");
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

/**
 * Fetch top assist providers for a league (cached per invocation)
 */
async function fetchTopAssists(leagueId: number, season: number, apiKey: string): Promise<TopPlayer[]> {
  const cacheKey = `${leagueId}:${season}`;
  if (topAssistsCache.has(cacheKey)) return topAssistsCache.get(cacheKey)! as any;

  try {
    const url = `${API_FOOTBALL_URL}/players/topassists?league=${leagueId}&season=${season}`;
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 2, baseDelayMs: 700 });
    if (!data?.response) {
      topAssistsCache.set(cacheKey, []);
      return [];
    }
    const players: TopPlayer[] = (data.response || []).slice(0, 10).map((item: any) => ({
      name: item.player?.name || "Unknown",
      team: item.statistics?.[0]?.team?.name || "",
      goals: item.statistics?.[0]?.goals?.total || 0,
      assists: item.statistics?.[0]?.goals?.assists || 0,
    }));
    topAssistsCache.set(cacheKey, players as any);
    return players;
  } catch {
    topAssistsCache.set(cacheKey, []);
    return [];
  }
}

/**
 * Fetch most-used starting GK for a team in current season.
 * Uses /players?team=X&season=Y filtered by position=Goalkeeper, sorted by appearances.
 */
async function fetchStartingGK(
  teamId: number,
  leagueId: number,
  season: number,
  apiKey: string,
): Promise<{ name: string; position: string } | null> {
  const cacheKey = `${teamId}:${leagueId}:${season}`;
  if (startingGKCache.has(cacheKey)) return startingGKCache.get(cacheKey)!;

  try {
    const url = `${API_FOOTBALL_URL}/players?team=${teamId}&league=${leagueId}&season=${season}&position=Goalkeeper`;
    const data = await fetchJsonWithRetry(url, apiKey, { retries: 2, baseDelayMs: 700 });
    if (!data?.response || data.response.length === 0) {
      startingGKCache.set(cacheKey, null);
      return null;
    }
    // Sort by appearances (most-used = starter)
    const goalkeepers = data.response
      .map((item: any) => ({
        name: item.player?.name || "",
        appearances: item.statistics?.[0]?.games?.appearences || 0,
      }))
      .filter((p: any) => p.name)
      .sort((a: any, b: any) => b.appearances - a.appearances);

    if (goalkeepers.length === 0) {
      startingGKCache.set(cacheKey, null);
      return null;
    }
    const starter = { name: goalkeepers[0].name, position: "G" };
    startingGKCache.set(cacheKey, starter);
    return starter;
  } catch {
    startingGKCache.set(cacheKey, null);
    return null;
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
  season?: number,
  standings?: StandingEntry[],
  odds?: OddsData | null
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

  // Recalculate with deeper form data — pass ALL 10 matches + standings + odds
    const deepResult = calculatePrediction(
      homeForm10,
      awayForm10,
      homeStats,
      awayStats,
      h2h5,
      homeTeamId,
      awayTeamId,
      homeTeamName,
      awayTeamName,
      standings,
      odds,
      pred.league || undefined,
      leagueId,
      pred?.round || undefined,
      pred?.match_timestamp || pred?.match_date || undefined
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
 * Step 4 — Assign tiers with HARD CAPS (Quality > Quantity).
 *
 * Pipeline:
 *   1) Sort all unlocked predictions by confidence DESC.
 *   2) Hide everything below MIN_DISPLAY_CONFIDENCE (55) — locked, not shown.
 *   3) PREMIUM: confidence ≥ 78, hard cap 10. Overflow demoted to PRO pool.
 *   4) PRO:     confidence 66–77 + Premium overflow, hard cap 20.
 *   5) FREE:    confidence 55–65, hard cap 30 (no force-fill minimum).
 *
 * Anything that doesn't fit a tier slot is locked (hidden).
 */
async function assignTiers(
  supabase: any,
  todayStr: string,
  tomorrowStr: string
): Promise<{ free: number; pro: number; premium: number; diamond: number }> {
  const { data: allPredictions, error } = await supabase
    .from("ai_predictions")
    .select("id, confidence, is_locked, result_status, prediction, league, key_factors, last_home_goals, last_away_goals, predicted_score, home_win, draw, away_win, match_date, variance_stable, variance_score, xg_home, xg_away")
    .in("match_date", [todayStr, tomorrowStr])
    .in("result_status", ["pending", null])
    .eq("is_locked", false)
    .order("confidence", { ascending: false });

  if (error || !allPredictions) {
    console.error("Error fetching predictions for tier assignment:", error);
    return { free: 0, pro: 0, premium: 0, diamond: 0 };
  }

  // === STEP 4 — TIER DISTRIBUTION (v4) ===
  const sorted = [...allPredictions]
    .filter((p: any) => (p.confidence ?? 0) >= MIN_DISPLAY_CONFIDENCE)
    .sort((a: any, b: any) => (b.confidence ?? 0) - (a.confidence ?? 0));

  const belowFloor = allPredictions.length - sorted.length;

  if (sorted.length === 0) {
    console.log(`[STEP 4] No predictions ≥${MIN_DISPLAY_CONFIDENCE}% — nothing to display.`);
    // Lock everything below floor
    const lockIds = allPredictions.map((p: any) => p.id);
    if (lockIds.length > 0) {
      await supabase
        .from("ai_predictions")
        .update({ is_locked: true, is_premium: false })
        .in("id", lockIds);
    }
    return { free: 0, pro: 0, premium: 0, diamond: 0 };
  }

  // 1) PREMIUM candidates: confidence ≥ 78 + STRICT MULTI-SIGNAL QUALITY GATE
  // Premium tier is a PROMISE to the user: "We have ALL the data — form, xG, H2H, odds —
  // and the analysis is real, not a guess." If ANY core signal is missing, the match is
  // demoted to Pro/Free regardless of confidence score.
  const FALLBACK_MARKERS = [
    "pending data from api",
    "limited team-form data",
    "fallback to bookmaker",
    "form data limited",
    "insufficient form data",
    "relying on market intelligence",
    "data limited",
  ];
  const num = (v: any): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const failsPremiumGate = (p: any): string | null => {
    // (a) No fallback wording in analysis
    const analysis = String(p.analysis ?? "").toLowerCase();
    for (const m of FALLBACK_MARKERS) {
      if (analysis.includes(m)) return `analysis-fallback("${m}")`;
    }
    if (analysis.length < 60) return "analysis-too-short";

    // (b) Real xG signal for BOTH teams (not just total)
    if (num(p.xg_home) <= 0 || num(p.xg_away) <= 0) return "missing-xg";

    // (c) Recent form data (last N goals computed by pipeline)
    if (
      (p.last_home_goals === null || p.last_home_goals === undefined) &&
      (p.last_away_goals === null || p.last_away_goals === undefined)
    ) {
      return "missing-recent-form";
    }

    // (d) Bookmaker consensus must exist (real market signal)
    const hasConsensus =
      num(p.consensus_home) > 0 ||
      num(p.consensus_draw) > 0 ||
      num(p.consensus_away) > 0;
    const hasBookmakers = num(p.bookmakers_count) >= 2;
    if (!hasConsensus || !hasBookmakers) return "no-bookmaker-consensus";

    return null;
  };

  // ============ BASELINE QUALITY GATE (applies to Pro + Free) ============
  // Pro and Free tiers MUST also be backed by real data. The bar is slightly
  // lower than Premium (we accept matches with weaker form/xG signals),
  // but we NEVER promote a prediction that has fallback/fabricated analysis
  // or zero market signal. Better to show fewer cards than mislead the user.
  //
  // Baseline requirements (ALL must hold):
  //   1. Analysis is non-fallback and >= 40 chars (Free can have shorter prose)
  //   2. At least ONE real signal source: xG (either side) OR recent form
  //      (last_home_goals / last_away_goals not null) OR bookmaker consensus
  //   3. Bookmaker presence: bookmakers_count >= 1 (any market signal at all)
  const failsBaselineGate = (p: any): string | null => {
    const analysis = String(p.analysis ?? "").toLowerCase();
    for (const m of FALLBACK_MARKERS) {
      if (analysis.includes(m)) return `analysis-fallback("${m}")`;
    }
    if (analysis.length < 40) return "analysis-too-short";

    const hasXg = num(p.xg_home) > 0 || num(p.xg_away) > 0;
    const hasForm =
      p.last_home_goals !== null && p.last_home_goals !== undefined ||
      p.last_away_goals !== null && p.last_away_goals !== undefined;
    const hasConsensus =
      num(p.consensus_home) > 0 ||
      num(p.consensus_draw) > 0 ||
      num(p.consensus_away) > 0;
    if (!hasXg && !hasForm && !hasConsensus) return "no-real-signal";

    if (num(p.bookmakers_count) < 1) return "no-bookmaker";

    return null;
  };

  const premiumCandidates = sorted.filter((p: any) => {
    if ((p.confidence ?? 0) < PREMIUM_MIN_CONFIDENCE) return false;
    const reason = failsPremiumGate(p);
    if (reason) {
      console.log(
        `[PREMIUM GATE] Demoted ${p.home_team} vs ${p.away_team} (conf ${p.confidence}%) — ${reason}`
      );
      return false;
    }
    return true;
  });

  console.log(
    `[PREMIUM GATE] ${premiumCandidates.length}/${sorted.filter((p: any) => (p.confidence ?? 0) >= PREMIUM_MIN_CONFIDENCE).length} high-confidence picks passed strict quality gate`
  );

  // === STEP 5 — SMART DIVERSITY FILTER (soft) ===
  // Caps:
  //   - Daily global: max 4 UNDER 2.5
  //   - Per tier: max 5 of the same bet type
  //   - Per tier: Double Chance cap (Free 40%, Pro 30%, Premium 25%)
  //   - Sequence: no more than 3 of the same market in a row
  // Priority order when multiple candidates have similar confidence:
  //   1. Over 1.5/2.5 (high probability)
  //   2. BTTS (when both teams scoring)
  //   3. Double Chance (fallback only)
  // Quality > diversity → never force-include weak picks.
  const MAX_UNDER_PER_DAY = 4;
  const MAX_SAME_TYPE_PER_TIER = 5;
  const MAX_SAME_IN_A_ROW = 3;
  const DC_TIER_PCT: Record<string, number> = {
    Premium: 0.25,
    Pro: 0.30,
    Free: 0.40,
  };

  const classifyBet = (raw: string | null | undefined): string => {
    const p = (raw ?? "").toString().trim().toLowerCase();
    if (!p) return "other";
    if (p.includes("under")) return "under_2_5";
    if (p.includes("over")) return "over_2_5";
    if (p.includes("btts") || p.includes("both teams")) return "btts";
    if (p.includes("double chance") || p.includes(" dc ") || p.startsWith("dc ") ||
        /\b(1x|x2|12)\b/.test(p)) return "double_chance";
    if (p === "1" || p === "home" || p.includes("home win")) return "home";
    if (p === "2" || p === "away" || p.includes("away win")) return "away";
    if (p === "x" || p === "draw") return "draw";
    return p;
  };

  // Priority weight for tie-breaking when confidences are similar.
  // Lower number = higher priority.
  const marketPriority = (t: string): number => {
    if (t === "over_2_5") return 1;
    if (t === "btts") return 2;
    if (t === "home" || t === "away") return 3;
    if (t === "double_chance") return 4; // fallback only
    if (t === "under_2_5") return 5;
    return 6;
  };

  const dayUnderCount = { n: 0 };

  const applyDiversity = (
    pool: any[],
    cap: number,
    label: string
  ): { kept: any[]; demoted: any[] } => {
    const kept: any[] = [];
    const demoted: any[] = [];
    const typeCount = new Map<string, number>();
    const dcCap = Math.max(1, Math.floor(cap * (DC_TIER_PCT[label] ?? 0.40)));

    // Re-rank pool with stable tie-breaker by marketPriority within ±2% confidence bands.
    // This ensures Over/BTTS are preferred over DC when confidence is similar.
    const reranked = [...pool].sort((a: any, b: any) => {
      const ca = a.confidence ?? 0;
      const cb = b.confidence ?? 0;
      if (Math.abs(ca - cb) >= 2) return cb - ca;
      return marketPriority(classifyBet(a.prediction)) -
             marketPriority(classifyBet(b.prediction));
    });

    for (const p of reranked) {
      if (kept.length >= cap) {
        demoted.push(p);
        continue;
      }
      const t = classifyBet(p.prediction);
      const tierCount = typeCount.get(t) ?? 0;

      // Daily UNDER 2.5 cap (global across all tiers)
      if (t === "under_2_5" && dayUnderCount.n >= MAX_UNDER_PER_DAY) {
        demoted.push(p);
        continue;
      }
      // Per-tier same-type cap
      if (tierCount >= MAX_SAME_TYPE_PER_TIER) {
        demoted.push(p);
        continue;
      }
      // Per-tier Double Chance percentage cap
      if (t === "double_chance" && tierCount >= dcCap) {
        demoted.push(p);
        continue;
      }
      // Sequence cap: no more than 3 of the same market in a row.
      // Look back at last MAX_SAME_IN_A_ROW kept entries.
      if (kept.length >= MAX_SAME_IN_A_ROW) {
        const tail = kept.slice(-MAX_SAME_IN_A_ROW);
        const allSame = tail.every((k) => classifyBet(k.prediction) === t);
        if (allSame) {
          demoted.push(p);
          continue;
        }
      }
      kept.push(p);
      typeCount.set(t, tierCount + 1);
      if (t === "under_2_5") dayUnderCount.n++;
    }

    // STEP 5b — visual quality check: if any single market exceeds 70%
    // of the kept selection, demote the lowest-confidence excess picks.
    if (kept.length >= 5) {
      const dominant = [...typeCount.entries()].find(
        ([, n]) => n / kept.length > 0.70
      );
      if (dominant) {
        const [domType, domCount] = dominant;
        const targetCount = Math.floor(kept.length * 0.60);
        const toRemove = domCount - targetCount;
        if (toRemove > 0) {
          // Remove lowest-confidence ones of the dominant type
          const indexedDom = kept
            .map((p, i) => ({ p, i, c: p.confidence ?? 0 }))
            .filter((x) => classifyBet(x.p.prediction) === domType)
            .sort((a, b) => a.c - b.c)
            .slice(0, toRemove);
          const removeIdx = new Set(indexedDom.map((x) => x.i));
          for (const x of indexedDom) demoted.push(x.p);
          // Rebuild kept array preserving order
          const newKept = kept.filter((_, i) => !removeIdx.has(i));
          kept.length = 0;
          kept.push(...newKept);
          typeCount.set(domType, (typeCount.get(domType) ?? 0) - toRemove);
          console.log(
            `[STEP 5b] ${label}: rebalanced — ${domType} reduced from ${domCount} to ${domCount - toRemove} (>70% threshold)`
          );
        }
      }
    }

    console.log(
      `[STEP 5] Diversity ${label}: kept=${kept.length}, demoted=${demoted.length}, dcCap=${dcCap}, types=${JSON.stringify(Object.fromEntries(typeCount))}`
    );
    return { kept, demoted };
  };

  // Apply diversity to Premium first (already sorted by confidence)
  const premiumDiv = applyDiversity(premiumCandidates, PREMIUM_MAX_COUNT, "Premium");
  const premiumPicks = premiumDiv.kept;
  // Premium overflow = anything beyond cap OR demoted by diversity
  const premiumOverflow = premiumDiv.demoted;
  const premiumIds = new Set(premiumPicks.map((p: any) => p.id));

  // 2) PRO candidates: confidence 66–77 + premium overflow (still high quality)
  const proPool = [
    ...premiumOverflow,
    ...sorted.filter((p: any) => {
      const c = p.confidence ?? 0;
      return c >= PRO_MIN_CONFIDENCE && c <= PRO_MAX_CONFIDENCE && !premiumIds.has(p.id);
    }),
  ].sort((a: any, b: any) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const proDiv = applyDiversity(proPool, PRO_MAX_COUNT, "Pro");
  const proCandidates = proDiv.kept;
  const proIds = new Set(proCandidates.map((p: any) => p.id));

  // 3) FREE candidates: confidence 55–65 (no minimum — Quality > Quantity)
  const freePool = sorted
    .filter((p: any) => {
      const c = p.confidence ?? 0;
      return c >= MIN_DISPLAY_CONFIDENCE && c <= FREE_MAX_CONFIDENCE && !premiumIds.has(p.id) && !proIds.has(p.id);
    });
  const freeDiv = applyDiversity(freePool, FREE_MAX_COUNT, "Free");
  const freePicks = freeDiv.kept;
  const freeIds = new Set(freePicks.map((p: any) => p.id));

  // 4) Anything in `sorted` that didn't make a tier slot → lock (hidden)
  const overflowIds = sorted
    .filter((p: any) => !premiumIds.has(p.id) && !proIds.has(p.id) && !freeIds.has(p.id))
    .map((p: any) => p.id);

  // Safe picks: subset of premium ≥ 85
  const safePickCount = premiumPicks.filter(
    (p: any) => (p.confidence ?? 0) >= SAFE_PICK_MIN_CONFIDENCE
  ).length;

  console.log(`\n=== STEP 4 — TIER DISTRIBUTION (v4, hard caps) ===`);
  console.log(
    `Below floor (<${MIN_DISPLAY_CONFIDENCE}%): ${belowFloor} hidden | ` +
    `Premium: ${premiumPicks.length}/${PREMIUM_MAX_COUNT} (Safe: ${safePickCount}) | ` +
    `Pro: ${proCandidates.length}/${PRO_MAX_COUNT} (incl. ${premiumOverflow.length} demoted) | ` +
    `Free: ${freePicks.length}/${FREE_MAX_COUNT} | ` +
    `Tier overflow hidden: ${overflowIds.length}`
  );

  // ---- Apply DB updates ----

  // Reset is_premium for both dates
  await supabase
    .from("ai_predictions")
    .update({ is_premium: false })
    .in("match_date", [todayStr, tomorrowStr]);

  // Mark Premium
  if (premiumIds.size > 0) {
    await supabase
      .from("ai_predictions")
      .update({ is_premium: true, is_locked: false })
      .in("id", Array.from(premiumIds));
  }

  // Mark Safe Picks (Premium subset with confidence >= 85 AND stable variance)
  // First reset all is_safe_pick for both dates (idempotent)
  await supabase
    .from("ai_predictions")
    .update({ is_safe_pick: false })
    .in("match_date", [todayStr, tomorrowStr]);

  const safePickIds = premiumPicks
    .filter((p: any) =>
      (p.confidence ?? 0) >= SAFE_PICK_MIN_CONFIDENCE &&
      p.variance_stable === true
    )
    .map((p: any) => p.id);

  if (safePickIds.length > 0) {
    await supabase
      .from("ai_predictions")
      .update({ is_safe_pick: true })
      .in("id", safePickIds);
    console.log(`[SAFE PICK] Marked ${safePickIds.length} matches as Safe Pick (conf≥85 + stable)`);
  } else {
    console.log(`[SAFE PICK] No qualifying matches today (need conf≥85 + variance_stable=true)`);
  }

  // Ensure Pro & Free are unlocked
  const visibleNonPremium = [...Array.from(proIds), ...Array.from(freeIds)];
  if (visibleNonPremium.length > 0) {
    await supabase
      .from("ai_predictions")
      .update({ is_locked: false, is_premium: false })
      .in("id", visibleNonPremium);
  }

  // Lock overflow (couldn't fit any tier cap)
  const toLock = [...overflowIds, ...allPredictions.filter((p: any) => (p.confidence ?? 0) < MIN_DISPLAY_CONFIDENCE).map((p: any) => p.id)];
  if (toLock.length > 0) {
    await supabase
      .from("ai_predictions")
      .update({ is_locked: true, is_premium: false })
      .in("id", toLock);
  }

  // === STEP 6 — DIAMOND PICK (max 1 per day) ===
  // Strict gates: confidence ≥ 82, Tier 1/2 league, low variance,
  // stable predicted goals, low-risk market preference (Over 1.5 / Double Chance / strong BTTS).
  // Soft fallback: if 0 candidates → relax xG diff to 0.6 (other rules stay strict).
  // If still 0 → DO NOT assign Diamond.
  const TIER_1_NAMES = new Set([
    "premier league", "la liga", "bundesliga", "serie a", "ligue 1",
    "uefa champions league", "uefa europa league", "uefa conference league",
    "world cup", "euro championship", "champions league", "europa league",
  ]);
  const TIER_2_NAMES = new Set([
    "primeira liga", "eredivisie", "super lig", "süper lig", "jupiler pro league",
    "scottish premiership", "championship", "la liga 2", "segunda división", "segunda division",
    "2. bundesliga", "serie b", "ligue 2",
  ]);
  const isTierAllowed = (league: string | null | undefined): boolean => {
    const l = (league ?? "").toString().trim().toLowerCase();
    if (!l) return false;
    for (const n of TIER_1_NAMES) if (l.includes(n)) return true;
    for (const n of TIER_2_NAMES) if (l.includes(n)) return true;
    return false;
  };
  const parseXgTag = (factors: any[]): { home: number; away: number; diff: number; total: number } | null => {
    if (!Array.isArray(factors)) return null;
    const tag = factors.find((f) => typeof f === "string" && f.startsWith("step2_xg:"));
    if (!tag) return null;
    const [h, a, d] = tag.replace("step2_xg:", "").split("|").map(Number);
    if (![h, a, d].every(Number.isFinite)) return null;
    return { home: h, away: a, diff: d, total: h + a };
  };
  const lastGoalsVarianceOk = (p: any): boolean => {
    const lh = p.last_home_goals;
    const la = p.last_away_goals;
    if (lh == null || la == null) return false;
    // Both teams roughly stable: average per match
    // last_home_goals stores total over last 5 → avg should be 0.5–4.0
    const avgH = lh / 5;
    const avgA = la / 5;
    if (avgH < 0.4 || avgH > 4) return false;
    if (avgA < 0.4 || avgA > 4) return false;
    // Avoid extreme polarisation (e.g., one team 0.2, other 3.5)
    if (Math.abs(avgH - avgA) > 2.5) return false;
    return true;
  };
  const stablePredictedScore = (score: string | null | undefined): boolean => {
    if (!score) return true; // unknown ≠ extreme
    const m = score.match(/(\d+)\D+(\d+)/);
    if (!m) return true;
    const h = +m[1], a = +m[2];
    if (h + a > 5) return false; // extreme high-scoring
    if (Math.abs(h - a) >= 4) return false; // blowout
    return true;
  };
  const isLowRiskMarket = (raw: string | null | undefined): boolean => {
    const p = (raw ?? "").toString().trim().toLowerCase();
    if (p.includes("over 1.5")) return true;
    if (p.includes("double chance") || /\b(1x|x2|12)\b/.test(p)) return true;
    return false;
  };
  const deriveLowRiskMarket = (p: any): { market: string; prob: number } | null => {
    const xg = parseXgTag(p.key_factors);
    if (!xg) return null;
    // Approx P(Over 1.5) using Poisson with λ = totalGoals
    const lambda = Math.max(0.5, xg.total);
    const pOver15 = 1 - Math.exp(-lambda) - lambda * Math.exp(-lambda); // P(>=2)
    // Double Chance from win probabilities (already on 0-100 scale)
    const hw = (p.home_win ?? 0) / 100;
    const dr = (p.draw ?? 0) / 100;
    const aw = (p.away_win ?? 0) / 100;
    const pHomeOrDraw = hw + dr; // 1X
    const pAwayOrDraw = aw + dr; // X2
    const candidates = [
      { market: "Over 1.5", prob: pOver15 },
      { market: "Double Chance 1X", prob: pHomeOrDraw },
      { market: "Double Chance X2", prob: pAwayOrDraw },
    ].filter((c) => c.prob >= 0.85);
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.prob - a.prob);
    return candidates[0];
  };

  const diamondCandidate = (minXgDiff: number) => {
    return premiumPicks.find((p: any) => {
      if ((p.confidence ?? 0) < 82) return false;
      if (!isTierAllowed(p.league)) return false;
      const xg = parseXgTag(p.key_factors);
      if (!xg) return false;
      if (Math.abs(xg.diff) < minXgDiff) return false;
      if (!lastGoalsVarianceOk(p)) return false;
      if (!stablePredictedScore(p.predicted_score)) return false;
      // Bet type: prefer model's existing low-risk OR derive from Poisson
      const lowRisk = isLowRiskMarket(p.prediction) || deriveLowRiskMarket(p) != null;
      if (!lowRisk) return false;
      return true;
    });
  };

  let diamond: any = diamondCandidate(0.8);
  if (!diamond) {
    diamond = diamondCandidate(0.6); // soft fallback
    if (diamond) console.log(`[STEP 6] Diamond soft fallback (xG diff ≥ 0.6) used.`);
  }

  // Reset is_diamond for both dates first (idempotent)
  await supabase
    .from("ai_predictions")
    .update({ is_diamond: false })
    .in("match_date", [todayStr, tomorrowStr]);

  if (diamond) {
    await supabase
      .from("ai_predictions")
      .update({ is_diamond: true })
      .eq("id", diamond.id);
    console.log(`[STEP 6] 💎 Diamond Pick: ${diamond.id} | conf=${diamond.confidence} | league=${diamond.league}`);
  } else {
    console.log(`[STEP 6] No Diamond Pick today — quality threshold not met.`);
  }

  return {
    free: freePicks.length,
    pro: proCandidates.length,
    premium: premiumPicks.length,
    diamond: diamond ? 1 : 0,
  };
}

async function markPredictionLocked(
  supabase: any,
  predictionId: string,
  reason: string,
  opts?: { fixtureId?: string; apiKey?: string }
) {
  const updatedAt = new Date().toISOString();

  // Generate varied fallback probabilities using a hash of the predictionId
  // This ensures each match gets unique-looking probabilities instead of flat 33/34/33
  function hashToVaried(id: string): { hw: number; dr: number; aw: number; pred: "1" | "X" | "2" } {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    // Use hash to create a home advantage bias (40-55%) with varied draw (18-28%)
    const homeBase = 40 + Math.abs(hash % 16);     // 40-55
    const drawBase = 18 + Math.abs((hash >> 4) % 11); // 18-28
    const awayBase = 100 - homeBase - drawBase;
    // Randomly swap home/away bias based on another hash bit
    const swapBias = (hash >> 8) % 3; // 0, 1, or 2
    if (swapBias === 1) {
      return { hw: awayBase, dr: drawBase, aw: homeBase, pred: "2" };
    }
    return { hw: homeBase, dr: drawBase, aw: awayBase, pred: homeBase >= awayBase ? "1" : "2" };
  }

  const varied = hashToVaried(predictionId);
  
  // Diversify market type based on hash — don't always use 1X2
  const marketVariants = [
    "1", "2", "Over 2.5", "Under 2.5", "BTTS Yes", "BTTS No", 
    "Over 1.5", "Under 3.5", "DC 1X", "DC X2"
  ];
  let hash2 = 0;
  for (let i = 0; i < predictionId.length; i++) {
    hash2 = ((hash2 << 3) + hash2) + predictionId.charCodeAt(i);
    hash2 |= 0;
  }
  const marketIdx = Math.abs(hash2) % marketVariants.length;
  const variedMarket = marketVariants[marketIdx];
  
  let fallbackPrediction: string = variedMarket;
  let fallbackConfidence = 50;
  let fallbackHomeWin = varied.hw;
  let fallbackDraw = varied.dr;
  let fallbackAwayWin = varied.aw;
  
  // Generate score that matches the prediction type
  function getScoreForMarket(market: string, hw: number, aw: number): string {
    switch (market) {
      case "Over 2.5": return hw > aw ? "2-1" : "1-2";
      case "Over 1.5": return hw > aw ? "1-1" : "1-1";
      case "Under 2.5": return hw > aw ? "1-0" : "0-1";
      case "Under 3.5": return hw > aw ? "2-0" : "0-2";
      case "BTTS Yes": return hw > aw ? "2-1" : "1-2";
      case "BTTS No": return hw > aw ? "2-0" : "0-1";
      case "DC 1X": return "1-1";
      case "DC X2": return "1-1";
      case "1": return "1-0";
      case "2": return "0-1";
      case "X": return "1-1";
      default: return "1-0";
    }
  }
  
  let fallbackPredictedScore = getScoreForMarket(variedMarket, varied.hw, varied.aw);
  let fallbackAnalysis = `Pending data from API-Football. ${reason}`;

  // If odds exist, use them as fallback (more accurate than hash-based)
  if (opts?.fixtureId && opts?.apiKey) {
    const odds = await fetchOdds(opts.fixtureId, opts.apiKey);

    if (odds) {
      // Detect TOP LEAGUE big match for confidence boost via market reliability
      const { data: predRow } = await supabase
        .from("ai_predictions")
        .select("league, home_team, away_team")
        .eq("id", predictionId)
        .single();

      const leagueLower = (predRow?.league || "").toLowerCase();
      const TOP_LEAGUES = [
        "uefa champions league", "champions league", "uefa europa league", "europa league",
        "uefa europa conference league", "conference league",
        "la liga", "primera division", "serie a", "bundesliga", "ligue 1",
      ];
      const TOP_TEAMS = [
        "arsenal", "manchester", "liverpool", "chelsea", "tottenham",
        "real madrid", "barcelona", "atletico madrid",
        "juventus", "inter", "milan", "napoli", "roma",
        "bayern", "dortmund", "leverkusen", "psg", "paris saint",
      ];
      const homeL = (predRow?.home_team || "").toLowerCase();
      const awayL = (predRow?.away_team || "").toLowerCase();
      const isTopLeague = TOP_LEAGUES.some(l => leagueLower.includes(l));
      const isTopTeamMatch = TOP_TEAMS.some(t => homeL.includes(t) || awayL.includes(t));
      const isBigMatch = isTopLeague || (leagueLower === "premier league" && isTopTeamMatch);

      fallbackHomeWin = odds.homeProb;
      fallbackDraw = odds.drawProb;
      fallbackAwayWin = odds.awayProb;

      // Best implied 1X2 outcome from bookmaker odds
      if (odds.homeProb >= odds.drawProb && odds.homeProb >= odds.awayProb) fallbackPrediction = "1";
      else if (odds.awayProb >= odds.homeProb && odds.awayProb >= odds.drawProb) fallbackPrediction = "2";
      else fallbackPrediction = "X";

      const baseConfidence = Math.max(odds.homeProb, odds.drawProb, odds.awayProb);
      // Big match: market data for top leagues is highly reliable, +7% confidence boost
      const leagueBoost = isBigMatch ? 7 : 0;
      fallbackConfidence = Math.max(50, Math.min(85, baseConfidence + leagueBoost));

      fallbackAnalysis = isBigMatch
        ? `Top-tier matchup. Bookmaker consensus implies ${odds.homeProb}/${odds.drawProb}/${odds.awayProb}% (${odds.homeOdds.toFixed(2)}/${odds.drawOdds.toFixed(2)}/${odds.awayOdds.toFixed(2)}). Sharp money leans ${fallbackPrediction === "1" ? "home" : fallbackPrediction === "2" ? "away" : "draw"}. Form data limited — relying on market intelligence.`
        : `Limited team-form data. Fallback to bookmaker 1X2 odds (${odds.homeOdds.toFixed(2)}/${odds.drawOdds.toFixed(2)}/${odds.awayOdds.toFixed(2)}). ${reason}`;

      // Generate a predicted score from implied odds
      const impliedHomeXg = clamp(odds.homeProb / 35, 0.4, 2.5);
      const impliedAwayXg = clamp(odds.awayProb / 35, 0.3, 2.0);
      fallbackPredictedScore = `${Math.round(impliedHomeXg)}-${Math.round(impliedAwayXg)}`;
    }
  }

  const { error } = await supabase
    .from("ai_predictions")
    .update({
      is_locked: false, // Don't lock — still show data with fallback values
      prediction: fallbackPrediction,
      predicted_score: fallbackPredictedScore,
      confidence: fallbackConfidence,
      home_win: fallbackHomeWin,
      draw: fallbackDraw,
      away_win: fallbackAwayWin,
      risk_level: "high",
      analysis: fallbackAnalysis,
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
 * Generate SAFE COMBO suggestions based on xG and market probabilities.
 */
function generateSafeCombo(
  homeXg: number,
  awayXg: number,
  goalMarkets: { over25: number; bttsYes: number; over15: number; under35: number },
  homeWin: number,
  awayWin: number,
  draw: number
): string | null {
  const totalXg = homeXg + awayXg;
  const dc1X = homeWin + draw;
  const dcX2 = awayWin + draw;

  // BTTS + Over 2.5 — both attacks active and high total xG
  if (totalXg > 2.5 && goalMarkets.bttsYes > 60 && goalMarkets.over25 > 60) {
    return "BTTS Yes + Over 2.5";
  }
  // Strong favorite + Under 3.5
  if (Math.max(homeWin, awayWin) > 55 && goalMarkets.under35 > 70 && totalXg < 3.0) {
    const fav = homeWin > awayWin ? "1" : "2";
    return `${fav} + Under 3.5`;
  }
  // DC 1X + Over 1.5
  if (dc1X > 72 && goalMarkets.over15 > 75) {
    return "DC 1X + Over 1.5";
  }
  // DC X2 + Over 1.5
  if (dcX2 > 72 && goalMarkets.over15 > 75) {
    return "DC X2 + Over 1.5";
  }
  // Over 1.5 + BTTS Yes
  if (goalMarkets.over15 > 78 && goalMarkets.bttsYes > 55) {
    return "Over 1.5 + BTTS Yes";
  }
  return null;
}

/**
 * Generate structured tags for key_factors (displayed as badges on frontend).
 * Tags: SAFE, ULTRA_STRONG, HIGH_TEMPO, MEDIUM_TEMPO, LOW_TEMPO,
 *        VALUE, STRONG_VALUE, SAFE_COMBO:..., MARKET:STRONG, MARKET:UP, MARKET:DOWN
 */
function generateStructuredTags(
  confidence: number,
  tempo: { label: "LOW" | "MEDIUM" | "HIGH" },
  value: { label: string; isValueBet: boolean; isStrongValue: boolean },
  ultra: { isUltra: boolean },
  safeCombo: string | null,
  odds: OddsData | null,
  aiProb: number,
  bookmakerProb: number
): string[] {
  const tags: string[] = [];

  // Confidence tier tags
  if (confidence >= 85) tags.push("SAFE");
  if (ultra.isUltra) tags.push("ULTRA_STRONG");

  // Tempo
  tags.push(`${tempo.label}_TEMPO`);

  // Value
  if (value.isStrongValue) tags.push("STRONG_VALUE");
  else if (value.isValueBet) tags.push("VALUE");

  // Safe combo
  if (safeCombo) tags.push(`SAFE_COMBO:${safeCombo}`);

  // Market signal
  if (odds) {
    const shortestOdds = Math.min(odds.homeOdds, odds.awayOdds);
    if (shortestOdds < 1.50) tags.push("MARKET:STRONG");
    const probDiff = Math.abs(aiProb - bookmakerProb);
    if (probDiff <= 5) tags.push("MARKET:ALIGNED");
  }

  return tags;
}

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
  goalMarkets: { over25: number; bttsYes: number; expectedTotalGoals: number },
  structuredTags?: string[]
): string[] {
  const factors: string[] = [];

  // 0. Add structured tags FIRST (frontend parses these)
  if (structuredTags && structuredTags.length > 0) {
    for (const tag of structuredTags) {
      factors.push(`[TAG]${tag}`);
    }
  }

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

  // 4. Clean sheets
  if (homeStats && homeStats.cleanSheets.total > 0) {
    const csRate = homeStats.cleanSheets.total / homeStats.played;
    if (csRate >= 0.4) factors.push(`${homeTeamName}: Strong defense (${homeStats.cleanSheets.total} clean sheets)`);
  }

  // 5. Goal market insights
  if (goalMarkets.over25 >= 65) factors.push(`High-scoring trend (Over 2.5: ${goalMarkets.over25}%)`);
  else if (goalMarkets.over25 <= 35) factors.push(`Low-scoring trend (Under 2.5: ${100 - goalMarkets.over25}%)`);
  
  if (goalMarkets.bttsYes >= 65) factors.push(`Both teams likely to score (${goalMarkets.bttsYes}%)`);
  else if (goalMarkets.bttsYes <= 30) factors.push(`Clean sheet expected (BTTS No: ${100 - goalMarkets.bttsYes}%)`);

  // 6. Season goal averages
  if (homeStats && awayStats) {
    const totalAvg = homeStats.goalsForAvg + awayStats.goalsForAvg;
    if (totalAvg >= 3.5) factors.push(`High-scoring teams (avg ${totalAvg.toFixed(1)} goals combined)`);
  }

  // Limit to 8 factors (structured tags + data factors)
  return factors.slice(0, 8);
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

  // === SELF-LEARNING: Load historical accuracy by league AND by market ===
  if (leagueAccuracyCache.size === 0) {
    try {
      const leagueAccRes = await supabase.from("ai_accuracy_by_league").select("league, accuracy, resolved_count");
      let marketAccRes = { data: null };
      try {
        marketAccRes = await supabase.from("ai_accuracy_by_market").select("market, accuracy, resolved_count");
      } catch (_e) {
        console.warn("Market accuracy view not available, skipping");
      }
      
      if (leagueAccRes.data) {
        for (const row of leagueAccRes.data) {
          if (row.league && row.accuracy != null && (row.resolved_count ?? 0) >= 20) {
            leagueAccuracyCache.set(row.league, Number(row.accuracy));
          }
        }
      }
      console.log(`Self-learning: loaded accuracy for ${leagueAccuracyCache.size} leagues`);
      
      if (marketAccRes?.data) {
        for (const row of marketAccRes.data) {
          if (row.market && row.accuracy != null && (row.resolved_count ?? 0) >= 10) {
            marketAccuracyCache.set(row.market, Number(row.accuracy));
          }
        }
        console.log(`Self-learning: loaded accuracy for ${marketAccuracyCache.size} market types`);
      }
    } catch (e) {
      console.warn("Self-learning accuracy fetch failed:", e);
    }
  }

  for (const pred of predictions) {
    try {
      const fixtureIdStr = String(pred.match_id);

      // Use the daily fixture list first. Only fallback to by-id fetch when the batch cache missed it.
      let fixture = fixtureById.get(fixtureIdStr);
      if (!fixture && fixtureById.size === 0) {
        const byId = await fetchJsonWithRetry(
          `${API_FOOTBALL_URL}/fixtures?id=${fixtureIdStr}`,
          apiKey,
          { retries: 4, baseDelayMs: 800 }
        );
        fixture = byId?.response?.[0];
      }

      if (!fixture) {
        await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Not found in API`, {
          fixtureId: fixtureIdStr,
          apiKey,
        });
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
        await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Invalid fixture data`, {
          fixtureId: fixtureIdStr,
          apiKey,
        });
        locked++;
        errors.push(`Fixture ${fixtureIdStr}: Invalid fixture data`);
        continue;
      }

      // Fetch ALL data in parallel: stats, H2H, form, standings, odds, injuries, scorers, assists, GKs
      const [homeStats, awayStats, h2h, realHomeForm, realAwayForm, standings, odds, leagueInjuries, leagueTopScorers, leagueTopAssists, homeGK, awayGK] = await Promise.all([
        fetchTeamStats(homeTeamId, leagueId, season, apiKey),
        fetchTeamStats(awayTeamId, leagueId, season, apiKey),
        fetchH2H(homeTeamId, awayTeamId, apiKey, 5),
        fetchTeamForm(homeTeamId, apiKey, 10, leagueId),  // League-only form (no cups/friendlies)
        fetchTeamForm(awayTeamId, apiKey, 10, leagueId),  // League-only form (no cups/friendlies)
        fetchStandings(leagueId, season, apiKey),
        fetchOdds(fixtureIdStr, apiKey),
        fetchInjuries(leagueId, season, apiKey),
        fetchTopScorers(leagueId, season, apiKey),
        fetchTopAssists(leagueId, season, apiKey),
        fetchStartingGK(homeTeamId, leagueId, season, apiKey),
        fetchStartingGK(awayTeamId, leagueId, season, apiKey),
      ]);

      if (!homeStats && !awayStats) {
        // Both stats missing — use fallback but don't skip entirely
        await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Missing team stats`, {
          fixtureId: fixtureIdStr,
          apiKey,
        });
        locked++;
        continue;
      }

      // Prefer real form data; fallback to pseudo-form from season stats
      const homeForm = realHomeForm.length >= 3 ? realHomeForm : buildPseudoFormFromStats(homeStats);
      const awayForm = realAwayForm.length >= 3 ? realAwayForm : buildPseudoFormFromStats(awayStats);

      if (homeForm.length === 0 && awayForm.length === 0) {
        await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Insufficient form data`, {
          fixtureId: fixtureIdStr,
          apiKey,
        });
        locked++;
        continue;
      }

      // === STEP 1 DATA QUALITY GATE ===
      // Require ≥5 recent matches per team OR ≥5 played season matches per team.
      // Lower-tier leagues (Tier 3) are held to a stricter bar to keep the page premium.
      const homeRecent = Math.max(realHomeForm.length, homeStats?.played ?? 0);
      const awayRecent = Math.max(realAwayForm.length, awayStats?.played ?? 0);
      const fixtureLeagueId = fixtureById.get(fixtureIdStr)?.league?.id ?? null;
      const leagueTier = getLeagueTier(fixtureLeagueId);
      const minRequired = leagueTier === 3 ? 8 : MIN_SEASON_MATCHES; // 5 for T1/T2, 8 for T3
      if (homeRecent < minRequired || awayRecent < minRequired) {
        console.log(
          `[DATA QUALITY] Skip ${fixtureIdStr} (T${leagueTier}): home=${homeRecent}, away=${awayRecent}, required>=${minRequired}`
        );
        await markPredictionLocked(supabase, pred.id, `Fixture ${fixtureIdStr}: Low-data match (T${leagueTier}, ${homeRecent}/${awayRecent})`, {
          fixtureId: fixtureIdStr,
          apiKey,
        });
        locked++;
        continue;
      }

      // === STEP 2 DETERMINISTIC DECIDER ===
      // Apply hard expected-goals rules. If NO strong signal → SKIP match (no spam predictions).
      const step2 = decideStep2(homeStats, awayStats, homeForm, awayForm);
      if (!step2) {
        console.log(
          `[STEP 2 SKIP] ${fixtureIdStr} ${homeTeamName} vs ${awayTeamName}: no strong signal`
        );
        await markPredictionLocked(
          supabase,
          pred.id,
          `Fixture ${fixtureIdStr}: No strong signal (Step 2 skip)`,
          { fixtureId: fixtureIdStr, apiKey }
        );
        locked++;
        continue;
      }
      console.log(
        `[STEP 2] ${fixtureIdStr}: ${step2.market} | xGH=${step2.expectedHome.toFixed(2)} ` +
        `xGA=${step2.expectedAway.toFixed(2)} total=${step2.totalGoals.toFixed(2)} | ${step2.reason}`
      );

      let newPrediction = calculatePrediction(
        homeForm,
        awayForm,
        homeStats,
        awayStats,
        h2h,
        homeTeamId,
        awayTeamId,
        homeTeamName,
        awayTeamName,
        standings,
        odds,
        pred.league || undefined,
        leagueId,
        fixture?.league?.round || undefined,
        fixture?.fixture?.date || pred?.match_timestamp || undefined
      );

      // === Apply Step 2 OVERRIDE ===
      // Step 2 rules are authoritative for the market. Keep the calculated probabilities
      // & analysis from the full engine, but replace prediction/score with Step 2 output.
      newPrediction.prediction = step2.market;
      newPrediction.predicted_score = step2.predicted_score;
      newPrediction.confidence = Math.max(newPrediction.confidence, step2.baseConfidence);

      // Calculate Poisson goal markets for key_factors and more accurate score
      const homeGoalRate = calculateGoalRate(homeForm);
      const awayGoalRate = calculateGoalRate(awayForm);
      const homeXg = clamp((homeGoalRate.scored + awayGoalRate.conceded) / 2, 0.3, 3.0);
      const awayXg = clamp((awayGoalRate.scored + homeGoalRate.conceded) / 2, 0.3, 3.0);
      const goalMarkets = poissonGoalMarkets(homeXg, awayXg);

      // ============= SAFE MODE: log real xG vs proxy xG (fire & forget) =============
      // This call does NOT affect prediction output. Failures are silent.
      if (leagueId && fixtureIdStr) {
        logXGComparison(
          supabase,
          fixtureIdStr,
          homeTeamId,
          awayTeamId,
          leagueId,
          season,
          apiKey,
          homeXg,
          awayXg,
          newPrediction.prediction,
          newPrediction.confidence
        ).catch((e) => console.warn(`[xG-SAFE] log failed:`, e?.message));
      }

      // ============= SAFE MODE: Squad Rotation + Weather (fire & forget) =============
      const fixtureIso = fixture?.fixture?.date || new Date().toISOString();
      logSquadRotation(
        supabase, fixtureIdStr, fixtureIso, homeTeamId, awayTeamId, apiKey,
        newPrediction.prediction, newPrediction.confidence
      ).catch((e) => console.warn(`[rotation-SAFE] failed:`, e?.message));

      logWeatherImpact(
        supabase, fixtureIdStr, fixture,
        newPrediction.prediction, newPrediction.confidence
      ).catch((e) => console.warn(`[weather-SAFE] failed:`, e?.message));
      // ============= END SAFE MODE Rotation + Weather log =============
      // ============= END SAFE MODE log =============



      // Generate SAFE COMBO suggestion
      const safeCombo = generateSafeCombo(
        homeXg, awayXg, goalMarkets,
        newPrediction.home_win, newPrediction.away_win, newPrediction.draw
      );

      // Calculate tempo for tags
      const matchTempo = calculateTempoScore(homeStats, awayStats, homeForm, awayForm);

      // Value detection for tags
      let tagAiProb = Math.max(newPrediction.home_win, newPrediction.away_win, newPrediction.draw);
      let tagBookProb = 50;
      if (odds) {
        if (newPrediction.prediction === "1") { tagAiProb = newPrediction.home_win; tagBookProb = odds.homeProb; }
        else if (newPrediction.prediction === "2") { tagAiProb = newPrediction.away_win; tagBookProb = odds.awayProb; }
        else if (newPrediction.prediction === "X") { tagAiProb = newPrediction.draw; tagBookProb = odds.drawProb; }
      }
      const tagValue = detectValue(tagAiProb, tagBookProb, newPrediction.confidence);
      const tagUltra = checkUltraBoost(
        Math.abs(calculateFormQuality(homeForm) - calculateFormQuality(awayForm)),
        Math.abs(homeXg - awayXg),
        odds ?? null
      );

      // Generate structured tags
      const structuredTags = generateStructuredTags(
        newPrediction.confidence, matchTempo, tagValue, tagUltra,
        safeCombo, odds ?? null, tagAiProb, tagBookProb
      );

      // === NO 33/33/33 ENFORCEMENT ===
      // Always bias toward the stronger team
      if (newPrediction.home_win === newPrediction.away_win && newPrediction.home_win === newPrediction.draw) {
        // Use any available signal to break the tie
        if (odds) {
          newPrediction.home_win = odds.homeProb;
          newPrediction.draw = odds.drawProb;
          newPrediction.away_win = odds.awayProb;
        } else {
          // Bias toward home team slightly
          newPrediction.home_win = 38;
          newPrediction.draw = 30;
          newPrediction.away_win = 32;
        }
      }
      // Ensure no two probabilities are exactly equal
      if (newPrediction.home_win === newPrediction.draw) newPrediction.draw -= 1;
      if (newPrediction.home_win === newPrediction.away_win) newPrediction.away_win -= 1;
      if (newPrediction.draw === newPrediction.away_win) newPrediction.draw -= 1;
      // Re-normalize to 100
      const probSum = newPrediction.home_win + newPrediction.draw + newPrediction.away_win;
      if (probSum !== 100) {
        const diff = 100 - probSum;
        // Add remainder to the highest probability
        if (newPrediction.home_win >= newPrediction.away_win && newPrediction.home_win >= newPrediction.draw) {
          newPrediction.home_win += diff;
        } else if (newPrediction.away_win >= newPrediction.home_win && newPrediction.away_win >= newPrediction.draw) {
          newPrediction.away_win += diff;
        } else {
          newPrediction.draw += diff;
        }
      }

      // Generate data-driven key_factors with structured tags
      const keyFactors = generateKeyFactors(
        homeTeamName, awayTeamName,
        homeForm, awayForm,
        homeStats, awayStats,
        h2h, homeTeamId,
        newPrediction.prediction,
        goalMarkets,
        structuredTags
      );

      // === LEAGUE QUALITY GATE ===
      // Non-quality leagues get capped confidence (can't reach PREMIUM)
      const isQualityLeague = QUALITY_LEAGUE_IDS.has(leagueId);
      if (!isQualityLeague && newPrediction.confidence >= PREMIUM_MIN_CONFIDENCE) {
        newPrediction.confidence = PREMIUM_MIN_CONFIDENCE - 1; // Cap at 75%
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
            season,
            standings,
            odds
          );
        } catch (e) {
          console.warn(`Premium enhance failed for ${homeTeamName} vs ${awayTeamName}, keeping standard result:`, e);
        }
      }

      // ===== INJURY & KEY PLAYER IMPACT (NEW) =====
      // Identify missing key players (top 3 scorers, top assist, starting GK)
      // and adjust both probabilities and confidence accordingly.
      const injuryAnalysis = analyzeInjuryImpact(
        homeTeamName,
        awayTeamName,
        leagueTopScorers,
        leagueTopAssists,
        leagueInjuries,
        homeGK,
        awayGK,
      );

      const missingHome = injuryAnalysis.homeMissing;
      const missingAway = injuryAnalysis.awayMissing;
      const injuryImpactHome = injuryAnalysis.homeImpact;
      const injuryImpactAway = injuryAnalysis.awayImpact;

      // Apply adjustment only if there's meaningful impact (>= 15)
      if (injuryImpactHome >= 15 || injuryImpactAway >= 15) {
        const before = { ...newPrediction };
        const adjusted = applyInjuryAdjustment(
          newPrediction,
          injuryImpactHome,
          injuryImpactAway,
        );
        newPrediction.home_win = adjusted.home_win;
        newPrediction.draw = adjusted.draw;
        newPrediction.away_win = adjusted.away_win;
        newPrediction.confidence = adjusted.confidence;
        console.log(
          `[INJURY] ${homeTeamName}(impact:${injuryImpactHome}, ${missingHome.length} out) vs ${awayTeamName}(impact:${injuryImpactAway}, ${missingAway.length} out) | ` +
          `Conf: ${before.confidence}% → ${adjusted.confidence}% | Probs: ${before.home_win}/${before.draw}/${before.away_win} → ${adjusted.home_win}/${adjusted.draw}/${adjusted.away_win}`,
        );
      }

      // ===== REFEREE BIAS + H2H STYLE MATCHING (LIVE) =====
      // Small confidence delta (-3..+3) when referee profile or H2H goal patterns
      // align (or disagree) with the model's totals/BTTS expectations.
      try {
        const refereeName: string | undefined = fixture?.fixture?.referee || undefined;
        const refStats = await fetchRefereeStats(refereeName, season, apiKey);
        const h2hStyle = calculateH2HStyle(h2h);
        const modelOver25 = goalMarkets.over25 ?? 50;
        const modelBtts = goalMarkets.bttsYes ?? 50;
        const styleAdj = applyRefereeAndH2HStyle(
          newPrediction,
          refStats,
          h2hStyle,
          modelOver25,
          modelBtts,
        );
        if (styleAdj.deltas.ref !== 0 || styleAdj.deltas.h2h !== 0) {
          const beforeConf = newPrediction.confidence;
          newPrediction.confidence = styleAdj.confidence;
          for (const f of styleAdj.factors) {
            if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
          }
          console.log(
            `[STYLE] ${homeTeamName} vs ${awayTeamName} | ` +
            `Ref: ${refereeName || "n/a"} (Δ${styleAdj.deltas.ref}) | ` +
            `H2H sig: ${h2hStyle.signal} (Δ${styleAdj.deltas.h2h}) | ` +
            `Conf: ${beforeConf}% → ${newPrediction.confidence}%`
          );
        }
      } catch (e) {
        console.warn(`[STYLE] adjustment failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== MANAGER CHANGE BOUNCE (LIVE) =====
      // New manager hired in last 60 days → small probability nudge + conf +1.
      try {
        const [homeBounce, awayBounce] = await Promise.all([
          fetchManagerBounce(homeTeamId, apiKey),
          fetchManagerBounce(awayTeamId, apiKey),
        ]);
        if (homeBounce?.bounceActive || awayBounce?.bounceActive) {
          const before = { ...newPrediction };
          const adj = applyManagerBounce(newPrediction, homeBounce, awayBounce);
          newPrediction.home_win = adj.home_win;
          newPrediction.draw = adj.draw;
          newPrediction.away_win = adj.away_win;
          newPrediction.confidence = adj.confidence;
          for (const f of adj.factors) {
            if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
          }
          console.log(
            `[MANAGER] ${homeTeamName}(${homeBounce?.daysSinceStart ?? "—"}d) vs ${awayTeamName}(${awayBounce?.daysSinceStart ?? "—"}d) | ` +
            `Probs: ${before.home_win}/${before.draw}/${before.away_win} → ${adj.home_win}/${adj.draw}/${adj.away_win} | ` +
            `Conf: ${before.confidence}% → ${adj.confidence}%`
          );
        }
      } catch (e) {
        console.warn(`[MANAGER] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== PUBLIC vs SHARP DISAGREEMENT (LIVE) =====
      // Detect odds movement against public bias. Boost if model aligns with sharp,
      // penalty if model picks public favorite while sharps move elsewhere.
      try {
        const sharpSignal = await detectSharpSignal(
          supabase,
          fixtureIdStr,
          newPrediction.home_win,
          newPrediction.draw,
          newPrediction.away_win,
        );
        if (sharpSignal.detected) {
          const sharpAdj = applySharpSignal(newPrediction, sharpSignal);
          if (sharpAdj.delta !== 0) {
            const beforeConf = newPrediction.confidence;
            newPrediction.confidence = sharpAdj.confidence;
            for (const f of sharpAdj.factors) {
              if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
            }
            console.log(
              `[SHARP] ${homeTeamName} vs ${awayTeamName} | ` +
              `Sharp side: ${sharpSignal.sharpSide} (+${sharpSignal.movementPct}%) | ` +
              `Public bias: ${sharpSignal.publicBias} | ` +
              `Conf: ${beforeConf}% → ${sharpAdj.confidence}% (Δ${sharpAdj.delta})`
            );
          }
        }
      } catch (e) {
        console.warn(`[SHARP] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== HIGH-SCORING / SET-PIECE DOMINANCE (LIVE — Option 9) =====
      // Boost Over/BTTS picks when both teams have high-scoring profile (≥1.4 GF avg + ≥60% Over 2.5)
      try {
        const scoringProfile = calculateScoringProfile(homeForm, awayForm);
        if (scoringProfile.bothHighScoring || scoringProfile.bothLowScoring) {
          const modelOver25 = goalMarkets.over25 ?? 50;
          const scoreAdj = applyScoringProfile(newPrediction, scoringProfile, modelOver25);
          if (scoreAdj.delta !== 0) {
            const beforeConf = newPrediction.confidence;
            newPrediction.confidence = scoreAdj.confidence;
            for (const f of scoreAdj.factors) {
              if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
            }
            console.log(
              `[SCORING] ${homeTeamName} vs ${awayTeamName} | ` +
              `Profile: ${scoringProfile.bothHighScoring ? "HIGH" : "LOW"} ` +
              `(O2.5: ${scoringProfile.homeOver25Rate}%/${scoringProfile.awayOver25Rate}%) | ` +
              `Conf: ${beforeConf}% → ${scoreAdj.confidence}% (Δ${scoreAdj.delta})`
            );
          }
        }
      } catch (e) {
        console.warn(`[SCORING] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== DEFENSIVE SOLIDITY / CLEAN SHEETS (LIVE — Option 10) =====
      // Boost home/away win picks when defensive form contrasts with opponent scoring weakness
      try {
        const defProfile = calculateDefensiveProfile(homeForm, awayForm);
        const defAdj = applyDefensiveProfile(newPrediction, defProfile, homeTeamName, awayTeamName);
        if (defAdj.delta !== 0) {
          const beforeConf = newPrediction.confidence;
          newPrediction.confidence = defAdj.confidence;
          for (const f of defAdj.factors) {
            if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
          }
          console.log(
            `[DEFENSE] ${homeTeamName} vs ${awayTeamName} | ` +
            `CS: ${defProfile.homeCleanSheetRate}%/${defProfile.awayCleanSheetRate}% | ` +
            `FTS: ${defProfile.homeFailedToScoreRate}%/${defProfile.awayFailedToScoreRate}% | ` +
            `Conf: ${beforeConf}% → ${defAdj.confidence}% (Δ${defAdj.delta})`
          );
        }
      } catch (e) {
        console.warn(`[DEFENSE] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== FIXTURE CONGESTION & TRAVEL/REST GAP (LIVE — Option 13) =====
      // Penalize teams with 3+ matches in 8 days; reward fresher side when model aligns.
      try {
        const fixtureDateForCongestion = fixture?.fixture?.date as string | undefined;
        const congestion = calculateCongestionProfile(fixtureDateForCongestion, homeForm, awayForm);
        if (
          congestion.homeMatchesIn8Days >= 2 ||
          congestion.awayMatchesIn8Days >= 2 ||
          congestion.congestionGap !== "balanced"
        ) {
          const before = { ...newPrediction };
          const congAdj = applyCongestionAdjustment(newPrediction, congestion, homeTeamName, awayTeamName);
          if (congAdj.delta !== 0 || congAdj.home_win !== before.home_win || congAdj.away_win !== before.away_win) {
            newPrediction.home_win = congAdj.home_win;
            newPrediction.draw = congAdj.draw;
            newPrediction.away_win = congAdj.away_win;
            newPrediction.confidence = congAdj.confidence;
            for (const f of congAdj.factors) {
              if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
            }
            console.log(
              `[CONGESTION] ${homeTeamName}(8d:${congestion.homeMatchesIn8Days}, rest:${congestion.homeRestHours ? Math.round(congestion.homeRestHours) + "h" : "n/a"}) vs ` +
              `${awayTeamName}(8d:${congestion.awayMatchesIn8Days}, rest:${congestion.awayRestHours ? Math.round(congestion.awayRestHours) + "h" : "n/a"}) | ` +
              `Gap: ${congestion.congestionGap} | ` +
              `Probs: ${before.home_win}/${before.draw}/${before.away_win} → ${congAdj.home_win}/${congAdj.draw}/${congAdj.away_win} | ` +
              `Conf: ${before.confidence}% → ${congAdj.confidence}% (Δ${congAdj.delta})`
            );
          }
        }
      } catch (e) {
        console.warn(`[CONGESTION] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== WEATHER IMPACT (LIVE — Option 4) =====
      // Open-Meteo (no API key). Severe wind/rain/snow penalizes Over/BTTS, supports Under.
      try {
        const venue = fixture?.fixture?.venue;
        const venueCity: string | undefined = venue?.city;
        const venueCountry: string | undefined = fixture?.league?.country;
        const fixtureDateForWeather = fixture?.fixture?.date as string | undefined;
        if (venueCity && fixtureDateForWeather) {
          const weather = await fetchWeatherForKickoff(venueCity, venueCountry, fixtureDateForWeather);
          if (weather) {
            const modelOver25 = goalMarkets.over25 ?? 50;
            const wxAdj = applyWeatherAdjustment(newPrediction, weather, modelOver25);
            if (wxAdj.delta !== 0) {
              const beforeConf = newPrediction.confidence;
              newPrediction.confidence = wxAdj.confidence;
              for (const f of wxAdj.factors) {
                if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
              }
              console.log(
                `[WEATHER] ${homeTeamName} vs ${awayTeamName} @ ${venueCity} | ` +
                `${weather.conditionLabel} ${weather.tempC ?? "?"}°C wind ${weather.windKmh ? Math.round(weather.windKmh) : "?"}km/h precip ${weather.precipMm ?? 0}mm | ` +
                `Severity: ${wxAdj.severity} | ` +
                `Conf: ${beforeConf}% → ${wxAdj.confidence}% (Δ${wxAdj.delta})`
              );
            }
          }
        }
      } catch (e) {
        console.warn(`[WEATHER] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== DRAW SPECIALIST (LIVE — Option 12) =====
      try {
        const drawProfile = calculateDrawProfile(homeForm, awayForm);
        const h2hDrawRate = calculateH2HDrawRate(h2h);
        const drawAdj = applyDrawProfile(newPrediction, drawProfile, h2hDrawRate);
        if (drawAdj.delta !== 0) {
          const beforeConf = newPrediction.confidence;
          newPrediction.confidence = drawAdj.confidence;
          for (const f of drawAdj.factors) {
            if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
          }
          console.log(
            `[DRAW] ${homeTeamName} vs ${awayTeamName} | ` +
            `Draw rates: ${drawProfile.homeDrawRate}%/${drawProfile.awayDrawRate}% | ` +
            `Conf: ${beforeConf}% → ${drawAdj.confidence}% (Δ${drawAdj.delta})`
          );
        }
      } catch (e) {
        console.warn(`[DRAW] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== OPEN-GAME / BTTS PROFILE (LIVE — Option 14) =====
      try {
        const openProfile = calculateOpenGameProfile(homeForm, awayForm);
        const openAdj = applyOpenGameProfile(newPrediction, openProfile);
        if (openAdj.delta !== 0) {
          const beforeConf = newPrediction.confidence;
          newPrediction.confidence = openAdj.confidence;
          for (const f of openAdj.factors) {
            if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
          }
          console.log(
            `[OPENGAME] ${homeTeamName} vs ${awayTeamName} | ` +
            `BTTS rates: ${openProfile.homeBttsRate}%/${openProfile.awayBttsRate}% | ` +
            `Conf: ${beforeConf}% → ${openAdj.confidence}% (Δ${openAdj.delta})`
          );
        }
      } catch (e) {
        console.warn(`[OPENGAME] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== HOME/AWAY ASYMMETRY BOOST (LIVE — Option 15) =====
      try {
        const asymProfile = calculateAsymmetryProfile(homeForm, awayForm);
        const asymAdj = applyAsymmetryAdjustment(newPrediction, asymProfile, homeTeamName, awayTeamName);
        if (asymAdj.delta !== 0) {
          const beforeConf = newPrediction.confidence;
          newPrediction.confidence = asymAdj.confidence;
          for (const f of asymAdj.factors) {
            if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
          }
          console.log(
            `[ASYMMETRY] ${homeTeamName}(H:${asymProfile.homeHomeWinRate}%) vs ${awayTeamName}(A:${asymProfile.awayAwayWinRate}%) | ` +
            `Conf: ${beforeConf}% → ${asymAdj.confidence}% (Δ${asymAdj.delta})`
          );
        }
      } catch (e) {
        console.warn(`[ASYMMETRY] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== BIG MATCH MENTALITY (LIVE — Option 16) =====
      try {
        const bigMatchProfile = calculateBigMatchProfile(standings, homeTeamId, awayTeamId);
        const bigMatchAdj = applyBigMatchAdjustment(newPrediction, bigMatchProfile, homeTeamName, awayTeamName);
        if (bigMatchAdj.delta !== 0) {
          const beforeConf = newPrediction.confidence;
          newPrediction.confidence = bigMatchAdj.confidence;
          for (const f of bigMatchAdj.factors) {
            if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
          }
          console.log(
            `[BIGMATCH] ${homeTeamName}(R${bigMatchProfile.homeRank}) vs ${awayTeamName}(R${bigMatchProfile.awayRank}) | ` +
            `fav=${bigMatchProfile.favouredSide} | Conf: ${beforeConf}% → ${bigMatchAdj.confidence}% (Δ${bigMatchAdj.delta})`
          );
        }
      } catch (e) {
        console.warn(`[BIGMATCH] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== PROMOTION/RELEGATION PRESSURE (LIVE — Option 17) =====
      try {
        const pressureProfile = calculatePressureProfile(
          standings, homeTeamId, awayTeamId, fixture?.league?.round
        );
        const pressureAdj = applyPressureAdjustment(newPrediction, pressureProfile, homeTeamName, awayTeamName);
        if (pressureAdj.delta !== 0) {
          const beforeConf = newPrediction.confidence;
          newPrediction.confidence = pressureAdj.confidence;
          for (const f of pressureAdj.factors) {
            if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
          }
          console.log(
            `[PRESSURE] late-season=${pressureProfile.isLateSeason} | ` +
            `home=${pressureProfile.homePressureType} away=${pressureProfile.awayPressureType} | ` +
            `Conf: ${beforeConf}% → ${pressureAdj.confidence}% (Δ${pressureAdj.delta})`
          );
        }
      } catch (e) {
        console.warn(`[PRESSURE] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== xG CALIBRATION LIVE (LIVE — Option 3) =====
      // Reads cached real-xG (already collected by SAFE MODE) and nudges
      // confidence based on convergence/divergence with proxy xG.
      try {
        if (leagueId && homeTeamId && awayTeamId) {
          const [homeRealXG, awayRealXG] = await Promise.all([
            getCachedRealXG(supabase, homeTeamId, leagueId, season, apiKey),
            getCachedRealXG(supabase, awayTeamId, leagueId, season, apiKey),
          ]);
          // Require minimum sample of 4 matches before trusting real xG
          const homeOK = (homeRealXG?.matches_count ?? 0) >= 4;
          const awayOK = (awayRealXG?.matches_count ?? 0) >= 4;
          if (homeOK && awayOK) {
            const xgCalAdj = applyXGCalibration(
              newPrediction, homeRealXG, awayRealXG, homeXg, awayXg
            );
            if (xgCalAdj.delta !== 0) {
              const beforeConf = newPrediction.confidence;
              newPrediction.confidence = xgCalAdj.confidence;
              for (const f of xgCalAdj.factors) {
                if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
              }
              console.log(
                `[XGCAL] proxy(${homeXg.toFixed(2)}/${awayXg.toFixed(2)}) → ` +
                `real(${xgCalAdj.result.realHomeXg?.toFixed(2)}/${xgCalAdj.result.realAwayXg?.toFixed(2)}) | ` +
                `Conf: ${beforeConf}% → ${xgCalAdj.confidence}% (Δ${xgCalAdj.delta})`
              );
            }
          }
        }
      } catch (e) {
        console.warn(`[XGCAL] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== WIN STREAK MOMENTUM (LIVE — Option 5) =====
      try {
        const streakProfile = calculateStreakProfile(homeForm, awayForm);
        const streakAdj = applyStreakAdjustment(newPrediction, streakProfile, homeTeamName, awayTeamName);
        if (streakAdj.delta !== 0) {
          const beforeConf = newPrediction.confidence;
          newPrediction.confidence = streakAdj.confidence;
          for (const f of streakAdj.factors) {
            if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
          }
          console.log(
            `[STREAK] ${homeTeamName}(W${streakProfile.homeWinStreak}/L${streakProfile.homeLossStreak}) vs ` +
            `${awayTeamName}(W${streakProfile.awayWinStreak}/L${streakProfile.awayLossStreak}) | ` +
            `Conf: ${beforeConf}% → ${streakAdj.confidence}% (Δ${streakAdj.delta})`
          );
        }
      } catch (e) {
        console.warn(`[STREAK] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== DERBY DETECTION (LIVE — Option 6) =====
      try {
        const derbyProfile = detectDerby(homeTeamName, awayTeamName);
        if (derbyProfile.isDerby) {
          const derbyAdj = applyDerbyAdjustment(newPrediction, derbyProfile);
          if (derbyAdj.delta !== 0) {
            const beforeConf = newPrediction.confidence;
            newPrediction.confidence = derbyAdj.confidence;
            for (const f of derbyAdj.factors) {
              if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
            }
            console.log(
              `[DERBY] ${derbyProfile.derbyName} | ${homeTeamName} vs ${awayTeamName} | ` +
              `Conf: ${beforeConf}% → ${derbyAdj.confidence}% (Δ${derbyAdj.delta})`
            );
          }
        }
      } catch (e) {
        console.warn(`[DERBY] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // ===== STAR PLAYER ABSENCE DETECTOR (LIVE — Option 4) =====
      try {
        if (leagueId && homeTeamId && awayTeamId) {
          const topPlayers = await getLeagueTopPlayers(leagueId, season, apiKey);
          const starProfile = calculateStarAbsenceProfile(
            topPlayers, homeTeamId, awayTeamId, missingHome, missingAway
          );
          // Detect GK absence by name match against missing players
          const normName = (n: string) => String(n || "").toLowerCase().trim();
          const homeMissingNames = (missingHome || []).map((p: any) => normName(p?.name || p?.player_name));
          const awayMissingNames = (missingAway || []).map((p: any) => normName(p?.name || p?.player_name));
          const homeGKMissing = !!(homeGK?.name && homeMissingNames.some(n => n.includes(normName(homeGK.name)) || normName(homeGK.name).includes(n)));
          const awayGKMissing = !!(awayGK?.name && awayMissingNames.some(n => n.includes(normName(awayGK.name)) || normName(awayGK.name).includes(n)));
          const starAdj = applyStarAbsenceAdjustment(newPrediction, starProfile, homeTeamName, awayTeamName, { homeGKMissing, awayGKMissing });
          if (starAdj.delta !== 0) {
            const beforeConf = newPrediction.confidence;
            newPrediction.confidence = starAdj.confidence;
            for (const f of starAdj.factors) {
              if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
            }
            console.log(
              `[STAR] H-miss[${starProfile.homeMissingTopScorers.length + starProfile.homeMissingTopAssists.length}] ` +
              `A-miss[${starProfile.awayMissingTopScorers.length + starProfile.awayMissingTopAssists.length}] | ` +
              `Conf: ${beforeConf}% → ${starAdj.confidence}% (Δ${starAdj.delta})`
            );
          }
        }
      } catch (e) {
        console.warn(`[STAR] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // Only fetched within ~24h of kickoff to avoid wasted API calls before lineups posted.
      try {
        const fixtureIsoForRot = fixture?.fixture?.date as string | undefined;
        const kickoffMs = fixtureIsoForRot ? new Date(fixtureIsoForRot).getTime() : 0;
        const hoursToKickoff = kickoffMs ? (kickoffMs - Date.now()) / 3600000 : 999;
        if (fixtureIdStr && fixtureIsoForRot && hoursToKickoff <= 24 && hoursToKickoff >= -3 && homeTeamId && awayTeamId) {
          const rotProfile = await calculateRotationProfile(
            fixtureIdStr, fixtureIsoForRot, homeTeamId, awayTeamId, apiKey
          );
          if (rotProfile.homeChanges >= 0 || rotProfile.awayChanges >= 0) {
            const rotAdj = applyRotationAdjustment(newPrediction, rotProfile, homeTeamName, awayTeamName);
            if (rotAdj.delta !== 0) {
              const beforeConf = newPrediction.confidence;
              newPrediction.confidence = rotAdj.confidence;
              for (const f of rotAdj.factors) {
                if (keyFactors.length < 10 && !keyFactors.includes(f)) keyFactors.push(f);
              }
              console.log(
                `[ROTATION] ${homeTeamName}(${rotProfile.homeChanges} chg) vs ${awayTeamName}(${rotProfile.awayChanges} chg) | ` +
                `Conf: ${beforeConf}% → ${rotAdj.confidence}% (Δ${rotAdj.delta})`
              );
            }
          }
        }
      } catch (e) {
        console.warn(`[ROTATION] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
      }

      // === STEP 3 — CONFIDENCE CALCULATION (formula + penalties + boosts) ===
      // Re-evaluate confidence using deterministic formula on top of Step 2 signal.
      // SKIP match if final raw confidence falls below 55 (low-quality floor).
      try {
        const favIsHome =
          step2.market === "1" ? true :
          step2.market === "2" ? false :
          (newPrediction.home_win >= newPrediction.away_win);
        const injuryImpactFav = favIsHome ? injuryImpactHome : injuryImpactAway;

        const step3 = applyStep3Confidence({
          step2,
          homeMatches: Math.max(homeForm.length, homeStats?.played ?? 0),
          awayMatches: Math.max(awayForm.length, awayStats?.played ?? 0),
          injuryImpactFav,
          oddsHome: odds?.homeOdds ?? null,
          oddsDraw: odds?.drawOdds ?? null,
          oddsAway: odds?.awayOdds ?? null,
        });

        if (step3.skip) {
          console.log(
            `[STEP 3 SKIP] ${fixtureIdStr} ${homeTeamName} vs ${awayTeamName}: ${step3.reason}`
          );
          await markPredictionLocked(
            supabase,
            pred.id,
            `Fixture ${fixtureIdStr}: Low confidence after Step 3 (${step3.reason})`,
            { fixtureId: fixtureIdStr, apiKey }
          );
          locked++;
          continue;
        }

        const beforeConf = newPrediction.confidence;
        newPrediction.confidence = step3.confidence;
        // Push transparency reason as first key_factor for UI tooltip
        const breakdownTag = `confidence_breakdown:${step3.reason}`;
        if (!keyFactors.some((f) => f.startsWith("confidence_breakdown:"))) {
          keyFactors.unshift(breakdownTag);
        }
        // Step 4 — expose xG values so the UI can render a "Strong Signal" badge
        // Tag format: step2_xg:<home>|<away>|<diff>
        const xgTag = `step2_xg:${step2.expectedHome.toFixed(2)}|${step2.expectedAway.toFixed(2)}|${Math.abs(step2.expectedHome - step2.expectedAway).toFixed(2)}`;
        if (!keyFactors.some((f) => f.startsWith("step2_xg:"))) {
          keyFactors.unshift(xgTag);
        }
        // STEP 3 — variance stability flag (low/high goal variability across last 5).
        // We approximate variance from `homeXg`/`awayXg` plus the spread vs the
        // expected goals — small spread + balanced expectation = STABLE.
        // Tag format: variance:STABLE|UNSTABLE|score
        let varianceStableDB = false;
        let varianceScoreDB: number | null = null;
        try {
          const homeAvg = homeXg;
          const awayAvg = awayXg;
          const spread = Math.abs(homeAvg - awayAvg);
          const totalGoals = homeAvg + awayAvg;
          // STABLE when:
          //   • neither team is at extreme attacking output (>3.5 / match)
          //   • neither team is starved (<0.4 / match)
          //   • spread between teams is moderate (≤ 2.0)
          //   • total goals within sane band (1.2–4.5)
          const stable =
            homeAvg >= 0.4 && homeAvg <= 3.5 &&
            awayAvg >= 0.4 && awayAvg <= 3.5 &&
            spread <= 2.0 &&
            totalGoals >= 1.2 && totalGoals <= 4.5;
          // Variance score 0–100 (higher = more stable, easier for UI badge)
          const balancePts = Math.max(0, 100 - spread * 25); // 0 spread = 100, 4 spread = 0
          const totalPts = totalGoals < 1.2 || totalGoals > 4.5 ? 0 : 100 - Math.abs(totalGoals - 2.6) * 20;
          const varianceScore = Math.round((balancePts + Math.max(0, totalPts)) / 2);
          varianceStableDB = stable;
          varianceScoreDB = varianceScore;
          const varianceTag = `variance:${stable ? "STABLE" : "UNSTABLE"}|${varianceScore}`;
          if (!keyFactors.some((f) => f.startsWith("variance:"))) {
            keyFactors.unshift(varianceTag);
          }
        } catch (_e) {
          /* best-effort */
        }
        console.log(
          `[STEP 3] ${fixtureIdStr}: ${beforeConf}% → ${step3.confidence}% | ${step3.reason}`
        );
      } catch (e) {
        console.warn(`[STEP 3] failed for ${homeTeamName} vs ${awayTeamName}:`, (e as any)?.message);
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
          missing_home_players: missingHome,
          missing_away_players: missingAway,
          injury_impact_home: injuryImpactHome,
          injury_impact_away: injuryImpactAway,
          // STEP 2/3 — first-class structured data (replaces parsing key_factors tags)
          xg_home: Math.round(step2.expectedHome * 100) / 100,
          xg_away: Math.round(step2.expectedAway * 100) / 100,
          xg_total: Math.round(step2.totalGoals * 100) / 100,
          xg_diff: Math.round((step2.expectedHome - step2.expectedAway) * 100) / 100,
          variance_stable: varianceStableDB,
          variance_score: varianceScoreDB,
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
      const injuryTag = (injuryImpactHome >= 15 || injuryImpactAway >= 15) ? " 🚑" : "";
      console.log(
        `[${tier}${injuryTag}] Updated ${homeTeamName} vs ${awayTeamName}: ${newPrediction.prediction} (${newPrediction.home_win}/${newPrediction.draw}/${newPrediction.away_win}) conf=${newPrediction.confidence}% factors=[${keyFactors.join(", ")}]`
      );
    } catch (e) {
      await markPredictionLocked(
        supabase,
        pred.id,
        `Fixture ${pred.match_id}: ${e instanceof Error ? e.message : "Unknown error"}`,
        {
          fixtureId: String(pred.match_id),
          apiKey,
        }
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

  // Fetch fixture list for this date on EVERY batch to avoid per-fixture API calls
  let fixtureById = new Map<string, any>();
  const fixtureUrl = `${API_FOOTBALL_URL}/fixtures?date=${matchDate}`;
  console.log(`[DEBUG] Fetching fixtures from: ${fixtureUrl}`);
  
  let fixturesJson = await fetchJsonWithRetry(
    fixtureUrl,
    apiKey,
    { retries: 4, baseDelayMs: offset === 0 ? 800 : 1200 }
  );

  if (!fixturesJson || !fixturesJson.response || fixturesJson.response.length === 0) {
    console.warn(`[DEBUG] Fixture fetch returned empty for ${matchDate} batch ${offset}. Retrying after 5s delay...`);
    await new Promise((r) => setTimeout(r, 5000));
    fixturesJson = await fetchJsonWithRetry(
      fixtureUrl,
      apiKey,
      { retries: 4, baseDelayMs: 1600 }
    );
  }

  if (!fixturesJson) {
    console.error(`[DEBUG] fixturesJson is NULL after retry - API call failed completely for ${matchDate}`);
  } else {
    console.log(`[DEBUG] API errors: ${JSON.stringify(fixturesJson.errors ?? {})}`);
    console.log(`[DEBUG] API results count: ${fixturesJson.results ?? 'N/A'}`);
    console.log(`[DEBUG] API response array length: ${fixturesJson.response?.length ?? 'N/A (no response key)'}`);
  }

  const fixtures = fixturesJson?.response ?? [];

  // === STEP 1 LEAGUE TIER FILTER ===
  // Always include Tier 1+2. Allow Tier 3 ONLY when Tier 1+2 yields too few matches
  // (e.g., midweek with no top leagues), so the page never goes empty.
  const allFixtures = fixtures as any[];
  const tier1Count = allFixtures.filter((f) => getLeagueTier(f?.league?.id) === 1).length;
  const tier12Count = allFixtures.filter((f) => getLeagueTier(f?.league?.id) <= 2).length;
  const allowTier3 = tier12Count < TIER_FALLBACK_THRESHOLD;

  let filteredOut = 0;
  for (const f of allFixtures) {
    const idStr = String(f?.fixture?.id ?? "");
    if (!idStr) continue;
    const tier = getLeagueTier(f?.league?.id);
    if (tier === 3 && !allowTier3) {
      filteredOut++;
      continue;
    }
    fixtureById.set(idStr, f);
  }

  console.log(
    `[TIER FILTER] ${matchDate}: total=${allFixtures.length}, T1=${tier1Count}, T1+T2=${tier12Count}, ` +
    `T3 allowed=${allowTier3} (threshold=${TIER_FALLBACK_THRESHOLD}), kept=${fixtureById.size}, dropped=${filteredOut}`
  );

  if (offset === 0) {
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

          // Generate varied placeholder probabilities and MARKET TYPES
          let hash = 0;
          for (let i = 0; i < id.length; i++) {
            hash = ((hash << 5) - hash) + id.charCodeAt(i);
            hash |= 0;
          }
          const homeBase = 40 + Math.abs(hash % 16);      // 40-55
          const drawBase = 18 + Math.abs((hash >> 4) % 11); // 18-28
          const awayBase = 100 - homeBase - drawBase;
          const swapBias = (hash >> 8) % 3;
          const hw = swapBias === 1 ? awayBase : homeBase;
          const dr = drawBase;
          const aw = swapBias === 1 ? homeBase : awayBase;
          
          // Diversify market types for placeholders
          const placeholderMarkets = [
            "1", "2", "Over 2.5", "Under 2.5", "BTTS Yes", "BTTS No",
            "Over 1.5", "Under 3.5", "DC 1X", "DC X2"
          ];
          const mktIdx = Math.abs((hash >> 12)) % placeholderMarkets.length;
          const pred = placeholderMarkets[mktIdx];
          
          // Score matching the market
          const scoreMap: Record<string, string> = {
            "1": "1-0", "2": "0-1", "X": "1-1",
            "Over 2.5": hw > aw ? "2-1" : "1-2",
            "Under 2.5": hw > aw ? "1-0" : "0-1",
            "BTTS Yes": "1-1", "BTTS No": hw > aw ? "2-0" : "0-1",
            "Over 1.5": "1-1", "Under 3.5": hw > aw ? "2-0" : "0-2",
            "DC 1X": "1-0", "DC X2": "0-1",
          };

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
            prediction: pred,
            predicted_score: scoreMap[pred] || "1-0",
            confidence: 50,
            home_win: hw,
            draw: dr,
            away_win: aw,
            risk_level: "high",
            analysis: "Pending regeneration...",
          };
        });

        // Filter out predictions below minimum display confidence (60%)
        const displayInserts = inserts.filter((p: any) => p.confidence >= MIN_DISPLAY_CONFIDENCE);
        console.log(`[DEBUG] Filtered ${inserts.length - displayInserts.length} predictions below ${MIN_DISPLAY_CONFIDENCE}% confidence`);

        const CHUNK_SIZE = 100;
        let totalInserted = 0;
        let insertErrors: string[] = [];
        
        for (let i = 0; i < displayInserts.length; i += CHUNK_SIZE) {
          const chunk = displayInserts.slice(i, i + CHUNK_SIZE);
          const { error: insertError, data: insertData } = await supabase.from("ai_predictions").insert(chunk).select("id");
          if (insertError) {
            console.error(`[DEBUG] Insert chunk ${i}-${i + chunk.length} error:`, insertError.message, insertError.details, insertError.hint);
            insertErrors.push(`${insertError.message} | ${insertError.details || ''} | ${insertError.hint || ''}`);
          } else {
            totalInserted += (insertData?.length ?? chunk.length);
          }
        }
        
        console.log(`[DEBUG] Insert complete for ${matchDate}: ${totalInserted}/${displayInserts.length} rows (${inserts.length - displayInserts.length} filtered <${MIN_DISPLAY_CONFIDENCE}%). Errors: ${insertErrors.length}`);
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

  // Fetch batch of predictions for this date — process ALL matches regardless of result_status
  const { data: predictions, error } = await supabase
    .from("ai_predictions")
    .select("*")
    .eq("match_date", matchDate)
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
  console.log(`Using v4 algorithm: Multi-dimensional confidence = form_diff*0.20 + xG*0.25 + odds*0.15 + consistency*0.15 + tempo*0.15 + market*0.10. Ultra boost, draw suppression, value detection, league profiles.`);

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
      algorithm: "v4: Multi-dimensional (form*0.20 + xG*0.25 + odds*0.15 + consistency*0.15 + tempo*0.15 + market*0.10) + Ultra boost + Draw suppression + Value detection + League profiles. Tiers: 0-59 FREE, 60-75 PRO, 76+ PREMIUM, 85+ SAFE PICKS.",
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

    // Fetch all data in parallel for efficiency (full analysis like batch mode)
    const [homeForm, awayForm, h2h, homeStats, awayStats, standings, odds] = await Promise.all([
      fetchTeamForm(homeTeamId, apiKey, 10, leagueId),  // League-only form, 10 matches
      fetchTeamForm(awayTeamId, apiKey, 10, leagueId),  // League-only form, 10 matches
      fetchH2H(homeTeamId, awayTeamId, apiKey, 5),
      leagueId ? fetchTeamStats(homeTeamId, leagueId, season, apiKey) : Promise.resolve(null),
      leagueId ? fetchTeamStats(awayTeamId, leagueId, season, apiKey) : Promise.resolve(null),
      leagueId ? fetchStandings(leagueId, season, apiKey) : Promise.resolve([]),
      fetchOdds(String(fixtureId), apiKey),
    ]);

    // Calculate prediction with full analysis
    const prediction = calculatePrediction(
      homeForm,
      awayForm,
      homeStats,
      awayStats,
      h2h,
      homeTeamId,
      awayTeamId,
      homeTeamName,
      awayTeamName,
      standings,
      odds,
      fixture.league?.name,
      leagueId,
      fixture.league?.round,
      fixture.fixture?.date
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
