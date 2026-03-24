import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ============ TIER CRITERIA ============
// Dynamic distribution: predictions sorted by confidence, then:
//   Top 10% → PREMIUM
//   Next 30% → PRO  
//   Bottom 60% → FREE
// Minimum confidence to display at all: 60%
// Fallback fixed thresholds (used only when dynamic calc isn't available on frontend)
const MIN_DISPLAY_CONFIDENCE = 50;
const FREE_MAX_CONFIDENCE = 72;
const PRO_MIN_CONFIDENCE = 73;
const PRO_MAX_CONFIDENCE = 82;
const PREMIUM_MIN_CONFIDENCE = 83;

// Dynamic distribution percentages
const PREMIUM_PERCENT = 0.10; // Top 10%
const PRO_PERCENT = 0.30;     // Next 30%
// Remaining 60% → FREE

const PREMIUM_MAX_DRAWS = 1;
const PREMIUM_MAX_COUNT = 10;
const PREMIUM_MIN_COUNT = 5;
const PREMIUM_ALLOWED_RISK = ["low", "medium"];

// ============ MINIMUM DATA THRESHOLDS ============
const MIN_SEASON_MATCHES = 5;
const MIN_SEASON_CONFIDENCE_CAP = 70; // Was 62 — too aggressive

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
const WEIGHT_FORM = 0.30;         // 30% - Recent form (last 10 real matches)
const WEIGHT_QUALITY = 0.20;      // 20% - Team quality (season stats)
const WEIGHT_SQUAD = 0.10;        // 10% - Squad strength / goal diff
const WEIGHT_HOME = 0.08;         // 8%  - Home advantage
const WEIGHT_H2H = 0.12;          // 12% - Head-to-Head history
const WEIGHT_STANDINGS = 0.10;    // 10% - League table position
const WEIGHT_ODDS = 0.10;         // 10% - Bookmaker odds signal

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
const standingsCache = new Map<string, StandingEntry[]>();
const oddsCache = new Map<string, OddsData | null>();
const leagueAccuracyCache = new Map<string, number>();

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

  const result: OddsData = {
    homeOdds, drawOdds, awayOdds,
    homeProb: Math.round((rawHomeProb / overround) * 100),
    drawProb: Math.round((rawDrawProb / overround) * 100),
    awayProb: Math.round((rawAwayProb / overround) * 100),
  };

  oddsCache.set(fixtureId, result);
  return result;
}

/**
 * Calculate form score (0-100) from last 5 matches with recency weighting.
 * Weights: Match -1 → 1.0, -2 → 0.9, -3 → 0.8, -4 → 0.7, -5 → 0.6
 */
function calculateFormScore(form: FormMatch[]): number {
  if (form.length === 0) return 50;
  const matches = form.slice(0, 5);
  let weightedPoints = 0;
  let weightSum = 0;
  let gf = 0, ga = 0;
  for (let i = 0; i < matches.length; i++) {
    const weight = 1.0 - (i * 0.1); // 1.0, 0.9, 0.8, 0.7, 0.6
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
 * DEEP form score using last 10 matches with steep recency decay.
 * Weights: Match -1 → 1.0, -2 → 0.93, ..., -10 → 0.4
 */
function calculateFormScoreDeep(form: FormMatch[]): number {
  if (form.length === 0) return 50;
  const matches = form.slice(0, 10);
  let weightedPoints = 0;
  let weightSum = 0;
  let gf = 0, ga = 0;
  for (let i = 0; i < matches.length; i++) {
    const weight = Math.max(0.4, 1.0 - (i * 0.067)); // 1.0 → ~0.4 over 10 matches
    const pts = matches[i].result === "W" ? 3 : matches[i].result === "D" ? 1 : 0;
    weightedPoints += pts * weight;
    weightSum += 3 * weight;
    gf += matches[i].goalsFor;
    ga += matches[i].goalsAgainst;
  }
  const pointsScore = (weightedPoints / weightSum) * 100;
  const goalDiff = gf - ga;
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
 * MATCH CONTEXT ENGINE: Table gap, motivation, must-win scenarios.
 */
function getMatchContext(
  standings: StandingEntry[],
  homeTeamId: number,
  awayTeamId: number
): { confidenceBoost: number; factors: string[] } {
  if (standings.length === 0) return { confidenceBoost: 0, factors: [] };
  const homeEntry = standings.find(s => s.teamId === homeTeamId);
  const awayEntry = standings.find(s => s.teamId === awayTeamId);
  if (!homeEntry || !awayEntry) return { confidenceBoost: 0, factors: [] };

  const factors: string[] = [];
  let boost = 0;
  const rankGap = Math.abs(homeEntry.rank - awayEntry.rank);
  const totalTeams = homeEntry.totalTeams || 20;

  // Big table gap (e.g., 1st vs 18th)
  if (rankGap >= Math.floor(totalTeams * 0.6)) {
    boost += 3;
    const stronger = homeEntry.rank < awayEntry.rank ? "Home" : "Away";
    factors.push(`Table gap: ${homeEntry.rank}th vs ${awayEntry.rank}th (${stronger} favored)`);
  }
  // Relegation battle → upset risk
  if (homeEntry.rank >= totalTeams - 2 || awayEntry.rank >= totalTeams - 2) {
    factors.push("Relegation battle → desperate motivation");
    boost -= 1;
  }
  // Title race
  if (homeEntry.rank <= 2 || awayEntry.rank <= 2) {
    factors.push("Title contender → high stakes");
  }
  // Mid-table vs top → potential complacency
  const midLow = Math.floor(totalTeams * 0.35);
  const midHigh = Math.floor(totalTeams * 0.65);
  if (homeEntry.rank >= midLow && homeEntry.rank <= midHigh && awayEntry.rank <= 3) {
    factors.push("Mid-table home vs top team → complacency risk");
  }

  return { confidenceBoost: boost, factors };
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
  if (raw <= 58) return raw;
  
  // Gentler dampening: preserve more of the calculated confidence
  // Anchor points: 60→59, 65→63, 70→68, 75→73, 80→77, 85→82, 90→87
  const dampened = 58 + (raw - 58) * 0.90;
  
  // For very high values, apply mild additional dampening
  if (raw >= 85) {
    const excess = raw - 85;
    return Math.round(clamp(dampened - excess * 0.15, 55, 94));
  }
  
  return Math.round(clamp(dampened, 50, 94));
}

/**
 * Main prediction calculation using enhanced weights:
 * Form 30%, Quality 20%, Squad 10%, Home 8%, H2H 12%, Standings 10%, Odds 10%.
 *
 * Uses real last 10 matches, league position, and bookmaker odds for calibration.
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
  leagueName?: string
): PredictionResult {
  // === FORM (30%) — RECENCY WEIGHTED + VENUE SPLIT ===
  const homeFormAll = homeForm.length > 5 ? calculateFormScoreDeep(homeForm) : calculateFormScore(homeForm);
  const awayFormAll = awayForm.length > 5 ? calculateFormScoreDeep(awayForm) : calculateFormScore(awayForm);
  const homeVenueForm = calculateVenueFormScore(homeForm, true);
  const awayVenueForm = calculateVenueFormScore(awayForm, false);
  // Blend: 60% venue-specific + 40% overall
  const homeFormScore = Math.round(homeVenueForm * 0.6 + homeFormAll * 0.4);
  const awayFormScore = Math.round(awayVenueForm * 0.6 + awayFormAll * 0.4);

  // === QUALITY (20%) ===
  const homeQualityScore = calculateQualityScore(homeStats);
  const awayQualityScore = calculateQualityScore(awayStats);

  // === SQUAD (10%) — venue-specific goal rates ===
  const homeGoalRate = calculateGoalRate(homeForm);
  const awayGoalRate = calculateGoalRate(awayForm);
  const homeEffScored = homeStats?.homeGoalsForAvg || homeGoalRate.scored;
  const homeEffConceded = homeStats?.homeGoalsAgainstAvg || homeGoalRate.conceded;
  const awayEffScored = awayStats?.awayGoalsForAvg || awayGoalRate.scored;
  const awayEffConceded = awayStats?.awayGoalsAgainstAvg || awayGoalRate.conceded;
  const homeSquadScore = clamp(50 + (homeEffScored - homeEffConceded) * 18, 0, 100);
  const awaySquadScore = clamp(50 + (awayEffScored - awayEffConceded) * 18, 0, 100);

  // === HOME ADVANTAGE (8%) ===
  let homeAdvantageScore = 51;
  let awayAdvantageScore = 49;
  if (homeStats && homeStats.home.played > 2 && awayStats && awayStats.away.played > 2) {
    const homeWinRateAtHome = homeStats.home.wins / homeStats.home.played;
    const awayWinRateAway = awayStats.away.wins / awayStats.away.played;
    homeAdvantageScore = clamp(50 + (homeWinRateAtHome - 0.4) * 10, 48, 55);
    awayAdvantageScore = clamp(50 + (awayWinRateAway - 0.3) * 8, 45, 52);
  }

  // === H2H (12%) ===
  const homeH2HScore = calculateH2HScore(h2h, homeTeamId, awayTeamId);
  const awayH2HScore = 100 - homeH2HScore;

  // === STANDINGS (10%) ===
  const homeStandingsScore = standings ? getStandingsScore(standings, homeTeamId) : 50;
  const awayStandingsScore = standings ? getStandingsScore(standings, awayTeamId) : 50;

  // === ODDS (10%) ===
  let homeOddsScore = 50;
  let awayOddsScore = 50;
  if (odds) {
    homeOddsScore = clamp(odds.homeProb, 10, 90);
    awayOddsScore = clamp(odds.awayProb, 10, 90);
  }

  // === SELF-LEARNING: adjust weights by league accuracy ===
  let formWeight = WEIGHT_FORM;
  let qualityWeight = WEIGHT_QUALITY;
  let h2hWeight = WEIGHT_H2H;
  let oddsWeight = WEIGHT_ODDS;
  if (leagueName && leagueAccuracyCache.size > 0) {
    const leagueAcc = leagueAccuracyCache.get(leagueName);
    if (leagueAcc !== undefined) {
      if (leagueAcc < 55) {
        oddsWeight += 0.05; formWeight -= 0.03; qualityWeight -= 0.02;
      } else if (leagueAcc > 75) {
        formWeight += 0.03; qualityWeight += 0.02; oddsWeight -= 0.03;
      }
    }
  }

  // Normalize weights
  const totalWeight = formWeight + qualityWeight + WEIGHT_SQUAD + WEIGHT_HOME + h2hWeight + WEIGHT_STANDINGS + oddsWeight;
  const wF = formWeight / totalWeight;
  const wQ = qualityWeight / totalWeight;
  const wS = WEIGHT_SQUAD / totalWeight;
  const wH = WEIGHT_HOME / totalWeight;
  const wH2H = h2hWeight / totalWeight;
  const wSt = WEIGHT_STANDINGS / totalWeight;
  const wO = oddsWeight / totalWeight;

  const homeTotal =
    homeFormScore * wF + homeQualityScore * wQ + homeSquadScore * wS +
    homeAdvantageScore * wH + homeH2HScore * wH2H + homeStandingsScore * wSt + homeOddsScore * wO;
  const awayTotal =
    awayFormScore * wF + awayQualityScore * wQ + awaySquadScore * wS +
    awayAdvantageScore * wH + awayH2HScore * wH2H + awayStandingsScore * wSt + awayOddsScore * wO;

  // === PROBABILITIES ===
  const diff = homeTotal - awayTotal;
  const diffAbs = Math.abs(diff);
  const strength = clamp(diffAbs / 18, 0, 1);
  let draw = 30 - strength * 14;
  const homeShare = sigmoid(diff / 7);
  let homeWin = (100 - draw) * homeShare;
  let awayWin = 100 - draw - homeWin;
  homeWin = Math.round(clamp(homeWin, 10, 75));
  draw = Math.round(clamp(draw, 15, 30));
  awayWin = 100 - homeWin - draw;
  if (awayWin < 10) { const d = 10 - awayWin; awayWin = 10; const td = Math.min(d, Math.max(0, draw - 15)); draw -= td; homeWin = 100 - draw - awayWin; }
  if (homeWin < 10) { const d = 10 - homeWin; homeWin = 10; const td = Math.min(d, Math.max(0, draw - 15)); draw -= td; awayWin = 100 - draw - homeWin; }

  // === xG MODEL (Dixon-Coles cross-multiplication) ===
  const leagueAvgGoals = 1.30;
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

  // === GOAL MARKETS (Poisson) + STYLE MATCHUP ===
  const goalMarkets = poissonGoalMarkets(homeXg, awayXg);
  const style = detectStyleMatchup(homeStats, awayStats, homeForm, awayForm);
  const adjustedOver25 = clamp(goalMarkets.over25 + style.overBoost, 5, 95);
  const adjustedUnder25 = clamp(100 - adjustedOver25, 5, 95);
  const adjustedBttsYes = clamp(goalMarkets.bttsYes + style.bttsBoost, 5, 95);
  const adjustedBttsNo = clamp(100 - adjustedBttsYes, 5, 95);

  // === MATCH CONTEXT ENGINE ===
  const context = standings ? getMatchContext(standings, homeTeamId, awayTeamId) : { confidenceBoost: 0, factors: [] };

  // === SMART MARKET SELECTION ENGINE ===
  // Extended markets: 1X2, Over/Under (1.5/2.5/3.5), BTTS, Double Chance
  const dc1X = homeWin + draw; // Double Chance: Home or Draw
  const dc12 = homeWin + awayWin; // Double Chance: Home or Away (no draw)
  const dcX2 = awayWin + draw; // Double Chance: Away or Draw

  // Market priority tiers (profitability ranking):
  // HIGH ACCURACY: Under 3.5, Over 1.5, BTTS, Double Chance
  // MEDIUM: Over 2.5, Under 2.5
  // LOW (avoid): Exact score, Draw (unless strong signal)
  const MARKET_PRIORITY: Record<string, number> = {
    "Under 3.5": 1.08,   // HIGH accuracy boost
    "Over 1.5": 1.06,
    "BTTS Yes": 1.05,
    "BTTS No": 1.05,
    "DC 1X": 1.04,
    "DC X2": 1.04,
    "DC 12": 1.02,
    "Over 2.5": 1.00,    // MEDIUM - baseline
    "Under 2.5": 1.00,
    "1": 0.97,            // 1X2 slightly penalized (harder to hit)
    "2": 0.97,
    "Over 3.5": 0.95,
    "Under 1.5": 0.93,
    "X": 0.85,            // Draw penalized (unpredictable)
  };

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

  // === SMART MARKET SWITCHING based on xG profile ===
  const totalXg = homeXg + awayXg;
  const isLowGoals = totalXg < 2.3;
  const isHighGoals = totalXg > 2.8;
  const bothHighScoring = homeXg > 1.3 && awayXg > 1.0;
  const bothDefensive = homeXg < 1.0 && awayXg < 0.9;
  const dominantTeam = Math.abs(homeWin - awayWin) >= 25;

  // Apply smart boosts based on match profile
  for (const m of allMarkets) {
    if (isLowGoals && bothDefensive) {
      // LOW GOALS: boost Under markets
      if (m.label === "Under 2.5") m.priorityProb *= 1.12;
      if (m.label === "Under 3.5") m.priorityProb *= 1.10;
      if (m.label === "BTTS No") m.priorityProb *= 1.08;
      if (m.label.startsWith("Over")) m.priorityProb *= 0.90;
    }
    if (isHighGoals && bothHighScoring) {
      // HIGH GOALS: boost Over + BTTS
      if (m.label === "Over 2.5") m.priorityProb *= 1.12;
      if (m.label === "BTTS Yes") m.priorityProb *= 1.10;
      if (m.label === "Over 1.5") m.priorityProb *= 1.08;
      if (m.label.startsWith("Under")) m.priorityProb *= 0.90;
    }
    if (dominantTeam) {
      // DOMINANT TEAM: boost winner + DC
      const strongerIsHome = homeWin > awayWin;
      if (strongerIsHome && (m.label === "1" || m.label === "DC 1X")) m.priorityProb *= 1.08;
      if (!strongerIsHome && (m.label === "2" || m.label === "DC X2")) m.priorityProb *= 1.08;
    }
  }

  // === CONFLICT FILTER: skip match if top 2 opposing markets are too close ===
  const overUnder25Diff = Math.abs(adjustedOver25 - adjustedUnder25);
  const isConflicted = overUnder25Diff < 8 && Math.abs(homeWin - awayWin) < 10;

  // Sort by priority-weighted probability
  allMarkets.sort((a, b) => b.priorityProb - a.priorityProb);

  // Filter: only markets with raw probability >= 60%
  const viableMarkets = allMarkets.filter(m => m.prob >= 60);

  // If no viable market OR conflicted → will get low confidence (filtered by MIN_DISPLAY_CONFIDENCE)
  const bestMarket = viableMarkets.length > 0 ? viableMarkets[0] : allMarkets[0];
  const prediction = bestMarket.label;
  const bestProb = bestMarket.prob;

  // === SECONDARY/ALTERNATIVE PICK ===
  const altMarket = viableMarkets.length > 1 ? viableMarkets[1] : null;

  // === SCORE ===
  const predictedScore = predictScoreV2({
    homeGoalRate, awayGoalRate, homeWin, awayWin, draw,
    prediction: prediction === "1" || prediction === "2" || prediction === "X" ? prediction :
                (homeWin >= awayWin ? "1" : "2"),
  });

  // === 1. PROPER VALUE FORMULA (ai_prob - bookmaker_prob) ===
  let valuePercent = 0;
  let bookmakerProb = 0;
  let aiProb = bestProb;
  if (odds) {
    if (prediction === "1") { bookmakerProb = odds.homeProb; aiProb = homeWin; }
    else if (prediction === "2") { bookmakerProb = odds.awayProb; aiProb = awayWin; }
    else if (prediction === "X") { bookmakerProb = odds.drawProb; aiProb = draw; }
    else { aiProb = bestProb; bookmakerProb = 50; }
    valuePercent = aiProb - bookmakerProb;
  }

  // Value classification:
  // < 5% → IGNORE (no value)
  // 5-10% → NORMAL
  // 10%+ → VALUE BET
  // 10%+ AND confidence ≥ 75 → STRONG VALUE BET
  const isValueBet = valuePercent >= 10;
  const isStrongValueBet = valuePercent >= 10 && bestProb >= 72; // will check final confidence later

  // === 2. ODDS VS AI ALIGNMENT (prevent overconfidence) ===
  // If AI and bookmaker agree → boost confidence
  // If AI disagrees strongly with bookmaker → reduce confidence (model may be wrong)
  let oddsAlignmentAdjust = 0;
  if (odds) {
    const aiProbForPick = aiProb;
    const bookProbForPick = bookmakerProb;
    const probDiff = Math.abs(aiProbForPick - bookProbForPick);
    
    if (probDiff <= 10) {
      oddsAlignmentAdjust = clamp((10 - probDiff) / 2, 0, 5);
    } else if (probDiff >= 25) {
      oddsAlignmentAdjust = -clamp((probDiff - 20) / 5, 0, 4); // Was -8, now max -4
    } else if (probDiff >= 15) {
      oddsAlignmentAdjust = -clamp((probDiff - 10) / 5, 0, 2); // Was -3, now max -2
    }
  }

  // === 3. UNCERTAINTY ZONE (xG 2.2-2.6 = coin flip → NO BET) ===
  const totalXgForUncertainty = homeXg + awayXg;
  const isUncertaintyZone = totalXgForUncertainty >= 2.2 && totalXgForUncertainty <= 2.6;
  // Only apply to Over/Under markets (these are the "coin flip" markets in this zone)
  const isGoalMarketPick = prediction.includes("Over") || prediction.includes("Under");
  const uncertaintyPenalty = (isUncertaintyZone && isGoalMarketPick) ? -3 : 0; // Was -8

  // === 4. LEAGUE-SPECIFIC CALIBRATION ===
  // Different leagues = different styles
  // Already have self-learning weights above, but add goal-style adjustments
  let leagueStyleAdjust = 0;
  if (leagueName) {
    const ln = leagueName.toLowerCase();
    // High-scoring leagues → boost Over, penalize Under
    if (ln.includes("premier league") || ln.includes("bundesliga") || ln.includes("eredivisie")) {
      if (prediction.includes("Over")) leagueStyleAdjust = 2;
      else if (prediction.includes("Under")) leagueStyleAdjust = -2;
    }
    // Defensive leagues → boost Under, penalize Over
    if (ln.includes("serie a") && !ln.includes("brazil") || ln.includes("ligue 1")) {
      if (prediction.includes("Under")) leagueStyleAdjust = 2;
      else if (prediction.includes("Over")) leagueStyleAdjust = -2;
    }
  }

  // === 6. MULTI-SIGNAL BOOST (form + xG + odds alignment) ===
  const predicted = prediction === "1" ? "home" : prediction === "2" ? "away" : "neutral";
  let signalStrength = 0.5;
  let signalsAligned = 0;
  let signalsTotal = 0;
  if (predicted !== "neutral") {
    const signals = [
      { label: "form", dir: homeFormScore > awayFormScore ? "home" : "away" },
      { label: "quality", dir: homeQualityScore > awayQualityScore ? "home" : "away" },
      { label: "h2h", dir: homeH2HScore > 55 ? "home" : homeH2HScore < 45 ? "away" : "neutral" },
      { label: "standings", dir: homeStandingsScore > awayStandingsScore ? "home" : "away" },
      { label: "odds", dir: odds ? (odds.homeProb > odds.awayProb ? "home" : "away") : "neutral" },
    ];
    const nonNeutral = signals.filter(f => f.dir !== "neutral");
    signalsAligned = nonNeutral.filter(f => f.dir === predicted).length;
    signalsTotal = nonNeutral.length;
    signalStrength = signalsTotal > 0 ? signalsAligned / signalsTotal : 0.5;
  }

  // Multi-signal boost: if form + xG + odds ALL agree → +10% confidence
  // If they disagree → -10%
  let multiSignalBoost = 0;
  if (signalsTotal >= 3) {
    if (signalStrength >= 0.8) multiSignalBoost = 8;
    else if (signalStrength >= 0.6) multiSignalBoost = 4;
    else if (signalStrength <= 0.3) multiSignalBoost = -5; // Was -10
    else if (signalStrength <= 0.4) multiSignalBoost = -3; // Was -5
  }

  // === CONFIDENCE = BEST MARKET PROBABILITY (SIMPLE) ===
  // The confidence IS the probability of our best pick. No complex adjustments.
  let confidence = bestProb;

  // Only cap if data is very weak
  const hasSeasonStats = !!homeStats && !!awayStats && homeStats.played > 0 && awayStats.played > 0;
  const hasMinMatches = hasSeasonStats && homeStats!.played >= MIN_SEASON_MATCHES && awayStats!.played >= MIN_SEASON_MATCHES;
  
  if (!hasMinMatches) confidence = Math.min(confidence, 70);
  if (!hasSeasonStats) confidence = Math.min(confidence, 65);

  // Clamp to realistic range
  confidence = Math.round(clamp(confidence, 45, 92));

  // === RISK (simple) ===
  let riskLevel: "low" | "medium" | "high";
  if (confidence >= 75) riskLevel = "low";
  else if (confidence >= 60) riskLevel = "medium";
  else riskLevel = "high";

  // === RICH ANALYSIS ===
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
  
  // Value bet reasoning
  if (odds && valuePercent !== 0) {
    if (finalIsSuperValueBet) {
      analysisReasons.push(`🔥 SUPER VALUE: +${Math.round(valuePercent)}% edge vs market (conf ${confidence}%)`);
    } else if (finalIsStrongValueBet) {
      analysisReasons.push(`🔥 STRONG VALUE BET: +${Math.round(valuePercent)}% edge vs market (conf ${confidence}%)`);
    } else if (isValueBet) {
      analysisReasons.push(`🔥 Value Bet: +${Math.round(valuePercent)}% edge vs bookmaker`);
    } else if (valuePercent >= 5) {
      analysisReasons.push(`Value edge: +${Math.round(valuePercent)}% vs market`);
    } else if (valuePercent < -5) {
      analysisReasons.push(`⚠️ Market divergence: ${Math.round(valuePercent)}% (bookmaker disagrees)`);
    }
  }

  // Multi-signal info
  if (signalsTotal >= 3) {
    analysisReasons.push(`Signal alignment: ${signalsAligned}/${signalsTotal} factors agree`);
  }

  // Uncertainty zone warning
  if (isUncertaintyZone && isGoalMarketPick) {
    analysisReasons.push(`⚠️ Uncertainty zone: xG ${xgTotal} is borderline (2.2-2.6)`);
  }

  // Odds alignment info
  if (odds && Math.abs(oddsAlignmentAdjust) >= 2) {
    if (oddsAlignmentAdjust > 0) analysisReasons.push(`✅ AI-Odds aligned: bookmaker confirms pick`);
    else analysisReasons.push(`⚠️ AI-Odds mismatch: bookmaker disagrees by ${Math.round(Math.abs(aiProb - bookmakerProb))}%`);
  }

  for (const cf of context.factors.slice(0, 1)) analysisReasons.push(cf);

  // Recent form insight
  const homeRecentWins = homeForm.slice(0, 5).filter(m => m.result === "W").length;
  const awayRecentWins = awayForm.slice(0, 5).filter(m => m.result === "W").length;
  if (homeRecentWins >= 4) analysisReasons.push(`${homeTeamName}: ${homeRecentWins}/5 recent wins`);
  if (awayRecentWins >= 4) analysisReasons.push(`${awayTeamName}: ${awayRecentWins}/5 recent wins`);

  // Alternative pick reasoning
  if (altMarket) {
    analysisReasons.push(`Alternative pick: ${altMarket.label} (${altMarket.prob}%)`);
  }

  const analysis = generateAnalysisV2({
    homeTeamName, awayTeamName, prediction,
    homeWin, draw, awayWin,
    homeFormScore, awayFormScore,
    homeQualityScore, awayQualityScore,
    confidenceLabel, valuePercent, xgTotal,
    homeXg, awayXg, bestProb,
    analysisReasons, style,
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
  confidenceLabel?: string;
  valuePercent?: number;
  xgTotal?: string;
  homeXg?: number;
  awayXg?: number;
  bestProb?: number;
  analysisReasons?: string[];
  style?: { overBoost: number; underBoost: number; bttsBoost: number; label: string };
}): string {
  const {
    homeTeamName, awayTeamName, prediction,
    homeWin, draw, awayWin,
    homeFormScore, awayFormScore,
    homeQualityScore, awayQualityScore,
    confidenceLabel, valuePercent, xgTotal,
    homeXg, awayXg, bestProb,
    analysisReasons, style,
  } = params;

  const sections: string[] = [];

  // Structured header
  sections.push(`📌 Prediction: ${prediction}`);
  sections.push(`📊 Probability: ${bestProb ?? Math.max(homeWin, awayWin, draw)}%`);
  if (confidenceLabel) sections.push(`🎯 Confidence: ${confidenceLabel}`);
  if (valuePercent !== undefined && Math.abs(valuePercent) >= 3) {
    sections.push(`💰 Value: ${valuePercent > 0 ? "+" : ""}${Math.round(valuePercent)}%`);
  }

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
      pred.league || undefined
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
 * - HIDDEN: confidence < 60% (not displayed)
 * - FREE: confidence >= 60% AND < 75%
 * - PRO: 75–84%
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

  // === SIMPLE TIER DISTRIBUTION ===
  // Tier is now determined on frontend by best market probability (Poisson).
  // Backend just marks is_premium for the top-confidence predictions as a hint.
  const sorted = allPredictions
    .filter((p: any) => (p.confidence ?? 0) >= MIN_DISPLAY_CONFIDENCE)
    .sort((a: any, b: any) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const total = sorted.length;
  
  if (total === 0) {
    console.log("No predictions to distribute across tiers.");
    return { free: 0, pro: 0, premium: 0 };
  }

  // Mark top 10% as is_premium hint (frontend may override with market probability)
  const premiumCount = Math.min(10, Math.max(3, Math.ceil(total * 0.10)));
  const premiumPreds = sorted.slice(0, premiumCount);
  const premiumIds = premiumPreds.map((p: any) => p.id);

  console.log(`\n=== TIER DISTRIBUTION (simple) ===`);
  console.log(`Total: ${total}, Premium hint: ${premiumIds.length}`);
  console.log(`Frontend uses best market probability: 85%+ Premium, 75-84% Pro, rest Free`);

  // Reset all to not premium for the two dates
  const { error: resetError } = await supabase
    .from("ai_predictions")
    .update({ is_premium: false })
    .in("match_date", [todayStr, tomorrowStr]);

  if (resetError) {
    console.error("Error resetting premium flags:", resetError);
  }

  // Mark premium predictions
  if (premiumIds.length > 0) {
    const { error: premiumError } = await supabase
      .from("ai_predictions")
      .update({ is_premium: true })
      .in("id", premiumIds);

    if (premiumError) {
      console.error("Error assigning premium flags:", premiumError);
    }
  }

  return { free: total - premiumIds.length, pro: 0, premium: premiumIds.length };
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

  // 7. Last 10 matches form summary
  if (homeForm.length >= 8) {
    const wins = homeForm.filter(m => m.result === "W").length;
    const ratio = wins / homeForm.length;
    if (ratio >= 0.7) factors.push(`${homeTeamName}: ${wins}/${homeForm.length} wins in recent matches`);
    else if (ratio <= 0.2) factors.push(`${homeTeamName}: Only ${wins}/${homeForm.length} recent wins`);
  }
  if (awayForm.length >= 8) {
    const wins = awayForm.filter(m => m.result === "W").length;
    const ratio = wins / awayForm.length;
    if (ratio >= 0.7) factors.push(`${awayTeamName}: ${wins}/${awayForm.length} wins in recent matches`);
    else if (ratio <= 0.2) factors.push(`${awayTeamName}: Only ${wins}/${awayForm.length} recent wins`);
  }

  // Limit to 6 most relevant factors
  return factors.slice(0, 6);
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

  // === SELF-LEARNING: Load historical accuracy by league ===
  if (leagueAccuracyCache.size === 0) {
    try {
      const { data: accData } = await supabase
        .from("ai_accuracy_by_league")
        .select("league, accuracy, resolved_count");
      if (accData) {
        for (const row of accData) {
          if (row.league && row.accuracy != null && (row.resolved_count ?? 0) >= 20) {
            leagueAccuracyCache.set(row.league, Number(row.accuracy));
          }
        }
      }
      console.log(`Self-learning: loaded accuracy for ${leagueAccuracyCache.size} leagues`);
    } catch (e) {
      console.warn("Self-learning accuracy fetch failed:", e);
    }
  }

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

      // Fetch ALL data in parallel: stats, H2H, real form (10 matches), standings, odds
      const [homeStats, awayStats, h2h, realHomeForm, realAwayForm, standings, odds] = await Promise.all([
        fetchTeamStats(homeTeamId, leagueId, season, apiKey),
        fetchTeamStats(awayTeamId, leagueId, season, apiKey),
        fetchH2H(homeTeamId, awayTeamId, apiKey, 5),
        fetchTeamForm(homeTeamId, apiKey, 10),  // Last 10 real matches
        fetchTeamForm(awayTeamId, apiKey, 10),  // Last 10 real matches
        fetchStandings(leagueId, season, apiKey),
        fetchOdds(fixtureIdStr, apiKey),
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
        awayTeamName,
        standings,
        odds,
        pred.league || undefined
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
            season,
            standings,
            odds
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
  console.log(`Using ENHANCED algorithm: Form 30%, Quality 20%, Squad 10%, Home 8%, H2H 12%, Standings 10%, Odds 10%`);

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
