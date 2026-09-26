// Engine v7 — league priority classification.
// Tier controls the ORDER fixtures enter the pool (strict queue), plus a small
// data-coverage contribution to data quality. World Cup is fully excluded.

export type LeagueTier = 1 | 2 | 3;

// World Cup competitions — excluded from ProPredict entirely.
const WORLD_CUP_IDS = new Set<number>([1, 8, 15, 29, 30, 31, 32, 33, 34, 37, 480, 1067]);

export const TIER1_IDS = new Set<number>([
  39, 40, 41, 42,        // England: PL, Championship, League One, League Two
  135, 136,              // Italy: Serie A, Serie B
  78, 79,                // Germany: Bundesliga, 2. Bundesliga
  140, 141,              // Spain: La Liga, Segunda
  61, 62,                // France: Ligue 1, Ligue 2
  88,                    // Netherlands: Eredivisie
  94,                    // Portugal: Primeira Liga
  144,                   // Belgium: Jupiler Pro League
  179,                   // Scotland: Premiership
  203,                   // Turkey: Super Lig
  197,                   // Greece: Super League
  218,                   // Austria: Bundesliga
  207,                   // Switzerland: Super League
  2, 3, 848,             // UCL, UEL, UECL
  4, 5, 960, 9, 6,       // Euro, Nations League, Euro qualification, Copa America, AFCON
]);

export const TIER2_IDS = new Set<number>([
  // Other established European leagues
  106, 119, 103, 113, 345, 210, 283, 333, 286, 172, 271, 332, 373, 244, 357, 318, 383, 116, 235,
  // Second tiers of strong nations
  89, 95, 180, 204, 145, 208, 219,
  // Domestic cups of Tier-1 nations
  45, 48, 143, 137, 81, 66, 90, 96, 147, 181, 206,
  // Established non-European professional leagues
  71, 128, 262, 253, 307, 98, 292, 188, 239, 265, 268, 281,
  // Continental club competitions outside UEFA
  13, 11, 17, 12,
  7, // Asian Cup
]);

// Known women's competitions (forced to Tier 3).
const WOMEN_IDS = new Set<number>([44, 254, 525, 82, 139, 64, 142, 146, 699, 743]);

const WOMEN_RE = /\b(women|women's|womens|female|feminine|féminine|femenina|femminile|frauen|damen|ladies)\b/i;
const YOUTH_RE = /\b(u1[5-9]|u2[0-3]|youth|primavera|juniors?)\b/i;
const RESERVE_RE = /\b(ii|reserves?|b team)\b/i;

export function isWorldCup(leagueId: number | null | undefined, leagueName?: string | null): boolean {
  if (leagueId && WORLD_CUP_IDS.has(leagueId)) return true;
  return /world cup/i.test(leagueName ?? "");
}

export function isForcedTier3(leagueId: number | null | undefined, leagueName?: string | null, homeTeam?: string | null, awayTeam?: string | null): boolean {
  if (leagueId && WOMEN_IDS.has(leagueId)) return true;
  const texts = [leagueName ?? "", homeTeam ?? "", awayTeam ?? ""];
  return texts.some((t) => WOMEN_RE.test(t) || YOUTH_RE.test(t) || RESERVE_RE.test(t));
}

export function classifyLeague(leagueId: number | null | undefined, leagueName?: string | null, homeTeam?: string | null, awayTeam?: string | null): LeagueTier {
  if (isForcedTier3(leagueId, leagueName, homeTeam, awayTeam)) return 3;
  if (leagueId && TIER1_IDS.has(leagueId)) return 1;
  if (leagueId && TIER2_IDS.has(leagueId)) return 2;
  return 3;
}

/** Leagues we consider "important" for the missing-coverage check in the report. */
export const IMPORTANT_LEAGUE_IDS = new Set<number>([39, 40, 135, 78, 140, 61, 88, 94, 2, 3, 848, 5]);
