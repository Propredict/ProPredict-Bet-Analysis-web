// ============================================================
// Injury & Lineup Impact Module
// Identifies missing key players and calculates penalty for
// team strength + final confidence.
//
// Key player categories (by importance score 0-100):
//   - Top 1 scorer            → 35
//   - Top 2-3 scorer          → 22 each
//   - Top assist provider     → 20
//   - Starting goalkeeper     → 25
//   - Other "Missing" players → 5 each (capped)
//
// Total importance per team is capped at 100.
// ============================================================

export interface MissingPlayerOut {
  name: string;
  role: "scorer" | "assist" | "gk" | "key";
  importance: number;
  reason?: string;
}

export interface InjuryAnalysis {
  homeMissing: MissingPlayerOut[];
  awayMissing: MissingPlayerOut[];
  homeImpact: number; // 0-100
  awayImpact: number; // 0-100
}

interface RawPlayer {
  name: string;
  team: string;
  goals: number;
  assists: number;
}

interface RawInjury {
  name: string;
  team: string;
  type: string;   // "Missing", "Questionable"
  reason: string; // "Knee Injury", "Suspended", etc.
}

interface SquadPlayer {
  name: string;
  position: string; // "G", "D", "M", "F"
}

/** Loose team-name matcher (handles "Real Madrid CF" vs "Real Madrid") */
function teamMatches(playerTeam: string, targetTeam: string): boolean {
  if (!playerTeam || !targetTeam) return false;
  const a = playerTeam.toLowerCase().trim();
  const b = targetTeam.toLowerCase().trim();
  if (a === b) return true;
  // last meaningful word match
  const lastA = a.split(" ").filter((w) => w.length > 2).pop() || "";
  const lastB = b.split(" ").filter((w) => w.length > 2).pop() || "";
  if (lastA && lastA === lastB) return true;
  return a.includes(b) || b.includes(a);
}

/** Loose name matcher for "G. Donnarumma" vs "Gianluigi Donnarumma" */
function nameMatches(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = a.toLowerCase().replace(/[.\-']/g, " ").trim();
  const nb = b.toLowerCase().replace(/[.\-']/g, " ").trim();
  if (na === nb) return true;
  const lastA = na.split(/\s+/).pop() || "";
  const lastB = nb.split(/\s+/).pop() || "";
  return lastA.length > 3 && lastA === lastB;
}

/**
 * Identify which key players are missing for both teams and compute impact scores.
 */
export function analyzeInjuryImpact(
  homeTeamName: string,
  awayTeamName: string,
  topScorers: RawPlayer[],
  topAssists: RawPlayer[],
  injuries: RawInjury[],
  homeGK: SquadPlayer | null,
  awayGK: SquadPlayer | null,
): InjuryAnalysis {
  // Filter injuries that are actually MISSING (not questionable)
  const realMissing = injuries.filter(
    (i) => i.type === "Missing" || /suspended|red card/i.test(i.reason),
  );

  const homeInjuries = realMissing.filter((i) => teamMatches(i.team, homeTeamName));
  const awayInjuries = realMissing.filter((i) => teamMatches(i.team, awayTeamName));

  // Top 3 scorers per team (sorted by goals)
  const homeScorers = topScorers
    .filter((p) => teamMatches(p.team, homeTeamName))
    .slice(0, 3);
  const awayScorers = topScorers
    .filter((p) => teamMatches(p.team, awayTeamName))
    .slice(0, 3);

  // Top assist provider per team (from topAssists list, fallback: scorer with most assists)
  const homeTopAssist =
    topAssists.find((p) => teamMatches(p.team, homeTeamName)) ||
    [...homeScorers].sort((a, b) => b.assists - a.assists)[0];
  const awayTopAssist =
    topAssists.find((p) => teamMatches(p.team, awayTeamName)) ||
    [...awayScorers].sort((a, b) => b.assists - a.assists)[0];

  const buildMissing = (
    teamInjuries: RawInjury[],
    scorers: RawPlayer[],
    topAssist: RawPlayer | undefined,
    gk: SquadPlayer | null,
  ): { list: MissingPlayerOut[]; impact: number } => {
    const out: MissingPlayerOut[] = [];
    const seen = new Set<string>();
    let impact = 0;

    // 1. Check each top scorer
    scorers.forEach((s, idx) => {
      const injured = teamInjuries.find((i) => nameMatches(i.name, s.name));
      if (injured) {
        const importance = idx === 0 ? 35 : 22;
        out.push({
          name: s.name,
          role: "scorer",
          importance,
          reason: injured.reason,
        });
        seen.add(s.name.toLowerCase());
        impact += importance;
      }
    });

    // 2. Check top assist (only if not already counted as scorer)
    if (topAssist && !seen.has(topAssist.name.toLowerCase())) {
      const injured = teamInjuries.find((i) => nameMatches(i.name, topAssist.name));
      if (injured) {
        out.push({
          name: topAssist.name,
          role: "assist",
          importance: 20,
          reason: injured.reason,
        });
        seen.add(topAssist.name.toLowerCase());
        impact += 20;
      }
    }

    // 3. Check starting GK
    if (gk) {
      const injured = teamInjuries.find((i) => nameMatches(i.name, gk.name));
      if (injured) {
        out.push({
          name: gk.name,
          role: "gk",
          importance: 25,
          reason: injured.reason,
        });
        seen.add(gk.name.toLowerCase());
        impact += 25;
      }
    }

    // 4. Other missing players (small bump, max 4)
    const others = teamInjuries
      .filter((i) => !seen.has(i.name.toLowerCase()))
      .slice(0, 4);
    others.forEach((p) => {
      out.push({
        name: p.name,
        role: "key",
        importance: 5,
        reason: p.reason,
      });
      impact += 5;
    });

    return { list: out, impact: Math.min(impact, 100) };
  };

  const home = buildMissing(homeInjuries, homeScorers, homeTopAssist, homeGK);
  const away = buildMissing(awayInjuries, awayScorers, awayTopAssist, awayGK);

  return {
    homeMissing: home.list,
    awayMissing: away.list,
    homeImpact: home.impact,
    awayImpact: away.impact,
  };
}

/**
 * Apply injury impact to prediction probabilities & confidence.
 *
 * Rules:
 *   - Each impact point shifts ~0.20% of win probability away from injured team
 *     (so 50 impact ≈ -10% win prob).
 *   - If MAX impact >= 30, lower overall confidence by 10%.
 *   - If MAX impact >= 50, lower overall confidence by 15%.
 *   - If both teams have similar impact (delta < 15), no probability shift —
 *     they cancel out. Only confidence is reduced.
 */
export function applyInjuryAdjustment(
  pred: {
    home_win: number;
    draw: number;
    away_win: number;
    confidence: number;
    prediction: string;
  },
  homeImpact: number,
  awayImpact: number,
): {
  home_win: number;
  draw: number;
  away_win: number;
  confidence: number;
} {
  const delta = homeImpact - awayImpact;
  const absDelta = Math.abs(delta);

  let { home_win, draw, away_win, confidence } = pred;

  // === 1. Probability shift (only if asymmetric impact) ===
  if (absDelta >= 15) {
    // Each impact point above 15 shifts ~0.20% from injured team to opponent
    // and a small fraction (15%) goes to draw.
    const shift = Math.min((absDelta - 15) * 0.20, 12); // cap at 12% swing
    const drawBoost = Math.round(shift * 0.15);
    const winShift = Math.round(shift - drawBoost);

    if (delta > 0) {
      // Home is more injured → reduce home_win, boost away_win + draw
      home_win -= winShift + drawBoost;
      away_win += winShift;
      draw += drawBoost;
    } else {
      // Away is more injured → reduce away_win, boost home_win + draw
      away_win -= winShift + drawBoost;
      home_win += winShift;
      draw += drawBoost;
    }

    // Clamp & re-normalize
    home_win = Math.max(5, home_win);
    away_win = Math.max(5, away_win);
    draw = Math.max(5, draw);
    const sum = home_win + draw + away_win;
    if (sum !== 100) {
      const diff = 100 - sum;
      // Add diff to whichever was favored after the shift
      if (delta > 0) away_win += diff;
      else if (delta < 0) home_win += diff;
      else draw += diff;
    }
  }

  // === 2. Confidence reduction (always if any meaningful injury) ===
  // If injuries hit the FAVORITE team specifically, drop more.
  const favIsHome = pred.prediction === "1";
  const favIsAway = pred.prediction === "2";
  const favImpact = favIsHome ? homeImpact : favIsAway ? awayImpact : Math.max(homeImpact, awayImpact);

  if (favImpact >= 50) {
    confidence = Math.round(confidence * 0.85); // -15%
  } else if (favImpact >= 30) {
    confidence = Math.round(confidence * 0.90); // -10%
  } else if (favImpact >= 15) {
    confidence = Math.round(confidence * 0.95); // -5%
  }

  // Underdog has many injuries → confidence in favorite goes UP slightly (max +3%)
  const underImpact = favIsHome ? awayImpact : favIsAway ? homeImpact : 0;
  if (underImpact >= 40 && favImpact < 15) {
    confidence = Math.min(100, confidence + 3);
  }

  return { home_win, draw, away_win, confidence: Math.max(40, Math.min(100, confidence)) };
}
