import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ============ TIER CRITERIA (v3) ============
// 0–59  → FREE
// 60–75 → PRO
// 75+   → PREMIUM
// 85+   → SAFE PICK (subset of PREMIUM, shown first)
const MIN_DISPLAY_CONFIDENCE = 45;
const FREE_MAX_CONFIDENCE = 59;
const PRO_MIN_CONFIDENCE = 60;
const PRO_MAX_CONFIDENCE = 75;
const PREMIUM_MIN_CONFIDENCE = 76;
const SAFE_PICK_MIN_CONFIDENCE = 85;

const PREMIUM_MAX_COUNT = 15;
const PREMIUM_MIN_COUNT = 5;

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

// ============ WEIGHTING CONSTANTS (v4 multi-dimensional) ============
const WEIGHT_FORM = 0.20;         // 20% - Recent form (goals-based quality)
const WEIGHT_QUALITY = 0.15;      // 15% - Team quality (season stats)
const WEIGHT_SQUAD = 0.08;        // 8%  - Squad strength / goal diff
const WEIGHT_HOME = 0.07;         // 7%  - Home advantage (per-league dynamic)
const WEIGHT_H2H = 0.05;          // 5%  - Head-to-Head history
const WEIGHT_STANDINGS = 0.10;    // 10% - League table position
const WEIGHT_ODDS = 0.15;         // 15% - Bookmaker odds signal
const WEIGHT_TEMPO = 0.10;        // 10% - Match intensity/tempo score
const WEIGHT_LEAGUE_PROFILE = 0.10; // 10% - League-specific goal/btts tendencies

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
const marketAccuracyCache = new Map<string, number>();
const leagueHomeAdvantageCache = new Map<number, number>(); // leagueId → home win % from standings

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

      return { result, goalsFor, goalsAgainst, isHome, opponentId };
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
  leagueId?: number
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
  
  // === C) HOME vs AWAY SPLIT ===
  const homeVenueForm = calculateVenueFormScore(homeForm, true);
  const awayVenueForm = calculateVenueFormScore(awayForm, false);
  // Blend: 50% venue-specific + 30% opponent-weighted overall + 20% goals-based quality
  const homeFormScore = Math.round(homeVenueForm * 0.45 + homeFormAll * 0.30 + homeFormQuality * 0.25);
  const awayFormScore = Math.round(awayVenueForm * 0.45 + awayFormAll * 0.30 + awayFormQuality * 0.25);

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

  // === ODDS (15%) ===
  let homeOddsScore = 50, awayOddsScore = 50;
  if (odds) {
    homeOddsScore = clamp(odds.homeProb, 10, 90);
    awayOddsScore = clamp(odds.awayProb, 10, 90);
  }

  // === TEMPO COMPONENT (10%) ===
  // Both teams contribute to tempo; higher tempo → more goals
  const tempoComponent = tempo.score;

  // === LEAGUE PROFILE COMPONENT (10%) ===
  const leagueProfileComponent = leagueProfile.score;

  // === WEIGHTED TOTAL ===
  const wF = WEIGHT_FORM;
  const wQ = WEIGHT_QUALITY;
  const wS = WEIGHT_SQUAD;
  const wH = WEIGHT_HOME;
  const wH2H = WEIGHT_H2H;
  const wSt = WEIGHT_STANDINGS;
  const wO = WEIGHT_ODDS;
  // Tempo and league profile affect goal markets more than 1X2

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

  // === xG MODEL ===
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

  // === E) DRAW SUPPRESSION ===
  let rawDraw = 30 - strength * 14;
  rawDraw = suppressDraw(Math.round(rawDraw), homeXg, awayXg);

  const homeShare = sigmoid(diff / 7);
  let homeWin = (100 - rawDraw) * homeShare;
  let awayWin = 100 - rawDraw - homeWin;
  let draw = rawDraw;
  homeWin = Math.round(clamp(homeWin, 10, 75));
  draw = Math.round(clamp(draw, 12, 28));
  awayWin = 100 - homeWin - draw;
  if (awayWin < 10) { const d = 10 - awayWin; awayWin = 10; const td = Math.min(d, Math.max(0, draw - 12)); draw -= td; homeWin = 100 - draw - awayWin; }
  if (homeWin < 10) { const d = 10 - homeWin; homeWin = 10; const td = Math.min(d, Math.max(0, draw - 12)); draw -= td; awayWin = 100 - draw - homeWin; }

  // === GOAL MARKETS (Poisson) + STYLE MATCHUP + LEAGUE PROFILE ===
  const goalMarkets = poissonGoalMarkets(homeXg, awayXg);
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

  // Form-based Over 2.5 score (0-100): 30% homeFreq + 30% awayFreq + 20% goalsAvg + 20% odds
  const homeOver25Freq = homeFormLast5.length > 0 ? homeOver25Count / homeFormLast5.length : 0.5;
  const awayOver25Freq = awayFormLast5.length > 0 ? awayOver25Count / awayFormLast5.length : 0.5;
  const avgGoalsAll = ((homeAvgScored5 + homeAvgConceded5) + (awayAvgScored5 + awayAvgConceded5)) / 2;
  const goalsAvgNorm = clamp(avgGoalsAll / 4.0, 0, 1); // normalize to 0-1 (4 goals = max)
  
  // Odds boost: if bookmaker Over 2.5 odds are short (<1.80), boost
  let oddsOverBoost = 0;
  if (odds) {
    // We don't have Over 2.5 odds directly, but short 1X2 odds indicate predictability
    const shortestOdds1x2 = Math.min(odds.homeOdds, odds.awayOdds);
    if (shortestOdds1x2 < 1.80) oddsOverBoost = 0.2;
    else if (shortestOdds1x2 < 2.20) oddsOverBoost = 0.1;
  }
  
  const formOverScore = homeOver25Freq * 0.30 + awayOver25Freq * 0.30 + goalsAvgNorm * 0.20 + oddsOverBoost;
  
  // Form-based BTTS score (0-100): 40% homeBTTS + 40% awayBTTS + 10% homeScoring + 10% awayScoring
  const homeBttsFreq = homeFormLast5.length > 0 ? homeBttsCount / homeFormLast5.length : 0.5;
  const awayBttsFreq = awayFormLast5.length > 0 ? awayBttsCount / awayFormLast5.length : 0.5;
  const homeScoringBonus = homeAvgScored5 >= 1.2 ? 0.1 : 0;
  const awayScoringBonus = awayAvgScored5 >= 1.2 ? 0.1 : 0;
  
  const formBttsScore = homeBttsFreq * 0.40 + awayBttsFreq * 0.40 + homeScoringBonus + awayScoringBonus;
  
  // Convert form scores to probability adjustments (-15 to +15)
  const formOverAdjust = Math.round((formOverScore - 0.5) * 30); // -15 to +15
  const formBttsAdjust = Math.round((formBttsScore - 0.5) * 30); // -15 to +15

  // Blend Poisson + Style + League + Form-based scoring
  let adjustedOver25 = clamp(goalMarkets.over25 + style.overBoost + leagueProfile.overBoost + formOverAdjust, 5, 95);
  let adjustedBttsYes = clamp(goalMarkets.bttsYes + style.bttsBoost + leagueProfile.bttsBoost + formBttsAdjust, 5, 95);

  // === ANTI-ERROR OVERRIDES ===
  // Rule 1: If either team has 4+ Over 2.5 in last 5 → FORCE Over direction
  if (homeOver25Count >= 4 || awayOver25Count >= 4) {
    adjustedOver25 = Math.max(adjustedOver25, 65); // Floor at 65%
  }
  // Rule 2: If both teams scored in 4+ of last 5 → FORCE BTTS Yes
  if (homeBttsCount >= 4 && awayBttsCount >= 4) {
    adjustedBttsYes = Math.max(adjustedBttsYes, 62); // Floor at 62%
  }
  // Rule 3: Both teams low scoring → lock Under + BTTS No
  if (homeAvgScored5 + homeAvgConceded5 < 1.8 && awayAvgScored5 + awayAvgConceded5 < 1.8) {
    adjustedOver25 = Math.min(adjustedOver25, 35); // Cap Over at 35%
    adjustedBttsYes = Math.min(adjustedBttsYes, 35); // Cap BTTS Yes at 35%
  }
  // Rule 4: Both teams high scoring (avg scored ≥ 1.5) → prevent BTTS No
  if (homeAvgScored5 >= 1.5 && awayAvgScored5 >= 1.5) {
    adjustedBttsYes = Math.max(adjustedBttsYes, 58);
  }

  const adjustedUnder25 = clamp(100 - adjustedOver25, 5, 95);
  const adjustedBttsNo = clamp(100 - adjustedBttsYes, 5, 95);

  // === MATCH CONTEXT ENGINE ===
  const context = standings ? getMatchContext(standings, homeTeamId, awayTeamId) : { confidenceBoost: 0, factors: [] };

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
  const totalXg = homeXg + awayXg;
  const isLowGoals = totalXg < 2.3;
  const isHighGoals = totalXg > 2.8;
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
  const predictedScore = scorePrediction;

  // === D) MARKET INTELLIGENCE (odds alignment) ===
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

  // Form-based Over/BTTS insights
  if (prediction.includes("Over") || prediction === "BTTS Yes") {
    if (homeOver25Count >= 4) analysisReasons.push(`⚽ ${homeTeamName}: ${homeOver25Count}/5 matches Over 2.5`);
    if (awayOver25Count >= 4) analysisReasons.push(`⚽ ${awayTeamName}: ${awayOver25Count}/5 matches Over 2.5`);
    if (homeBttsCount >= 4 && awayBttsCount >= 4) analysisReasons.push(`🔄 BTTS in ${homeBttsCount}/5 (H) & ${awayBttsCount}/5 (A) recent matches`);
  }
  if (prediction.includes("Under") || prediction === "BTTS No") {
    if (homeOver25Count <= 1) analysisReasons.push(`🛡️ ${homeTeamName}: Only ${homeOver25Count}/5 matches Over 2.5`);
    if (awayOver25Count <= 1) analysisReasons.push(`🛡️ ${awayTeamName}: Only ${awayOver25Count}/5 matches Over 2.5`);
  }

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
      leagueId
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

  // === TIER DISTRIBUTION (v3) ===
  // Sort by confidence descending
  const sorted = allPredictions
    .filter((p: any) => (p.confidence ?? 0) >= MIN_DISPLAY_CONFIDENCE)
    .sort((a: any, b: any) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const total = sorted.length;
  
  if (total === 0) {
    console.log("No predictions to distribute across tiers.");
    return { free: 0, pro: 0, premium: 0 };
  }

  // PREMIUM: confidence > 75, top 10-15 matches
  const premiumPreds = sorted.filter((p: any) => (p.confidence ?? 0) >= PREMIUM_MIN_CONFIDENCE)
    .slice(0, PREMIUM_MAX_COUNT);
  const premiumIds = premiumPreds.map((p: any) => p.id);

  // Safe picks: confidence > 85 (subset of premium, marked via is_premium flag)
  const safePicks = premiumPreds.filter((p: any) => (p.confidence ?? 0) >= SAFE_PICK_MIN_CONFIDENCE)
    .slice(0, 3);
  const safePickIds = safePicks.map((p: any) => p.id);

  // PRO: confidence 60-75, next 20-30
  const proPreds = sorted.filter((p: any) => {
    const conf = p.confidence ?? 0;
    return conf >= PRO_MIN_CONFIDENCE && conf <= PRO_MAX_CONFIDENCE && !premiumIds.includes(p.id);
  }).slice(0, 30);
  
  // FREE: all remaining
  const freeCount = total - premiumIds.length - proPreds.length;

  console.log(`\n=== TIER DISTRIBUTION (v3) ===`);
  console.log(`Total: ${total}, Premium: ${premiumIds.length} (Safe: ${safePickIds.length}), Pro: ${proPreds.length}, Free: ${freeCount}`);

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

  return { free: freeCount, pro: proPreds.length, premium: premiumIds.length };
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
      fallbackHomeWin = odds.homeProb;
      fallbackDraw = odds.drawProb;
      fallbackAwayWin = odds.awayProb;

      // Best implied 1X2 outcome from bookmaker odds
      if (odds.homeProb >= odds.drawProb && odds.homeProb >= odds.awayProb) fallbackPrediction = "1";
      else if (odds.awayProb >= odds.homeProb && odds.awayProb >= odds.drawProb) fallbackPrediction = "2";
      else fallbackPrediction = "X";

      fallbackConfidence = Math.max(50, Math.max(odds.homeProb, odds.drawProb, odds.awayProb));
      fallbackAnalysis = `Limited team-form data. Fallback to bookmaker 1X2 odds (${odds.homeOdds.toFixed(2)}/${odds.drawOdds.toFixed(2)}/${odds.awayOdds.toFixed(2)}). ${reason}`;

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

      // Fetch ALL data in parallel: stats, H2H, LEAGUE-ONLY form (10 matches), standings, odds
      const [homeStats, awayStats, h2h, realHomeForm, realAwayForm, standings, odds] = await Promise.all([
        fetchTeamStats(homeTeamId, leagueId, season, apiKey),
        fetchTeamStats(awayTeamId, leagueId, season, apiKey),
        fetchH2H(homeTeamId, awayTeamId, apiKey, 5),
        fetchTeamForm(homeTeamId, apiKey, 10, leagueId),  // League-only form (no cups/friendlies)
        fetchTeamForm(awayTeamId, apiKey, 10, leagueId),  // League-only form (no cups/friendlies)
        fetchStandings(leagueId, season, apiKey),
        fetchOdds(fixtureIdStr, apiKey),
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
        leagueId
      );

      // Calculate Poisson goal markets for key_factors and more accurate score
      const homeGoalRate = calculateGoalRate(homeForm);
      const awayGoalRate = calculateGoalRate(awayForm);
      const homeXg = clamp((homeGoalRate.scored + awayGoalRate.conceded) / 2, 0.3, 3.0);
      const awayXg = clamp((awayGoalRate.scored + homeGoalRate.conceded) / 2, 0.3, 3.0);
      const goalMarkets = poissonGoalMarkets(homeXg, awayXg);

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
  for (const f of fixtures) {
    const idStr = String(f?.fixture?.id ?? "");
    if (idStr) fixtureById.set(idStr, f);
  }

  console.log(`Fetched ${fixtures.length} fixtures from API for ${matchDate}`);

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
      leagueId
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
