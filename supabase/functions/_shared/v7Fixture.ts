// Engine v7 — shared API-Football data collection for one fixture.
// Used by the dry-run function and the production generator so both feed the
// engine exactly the same inputs.
import { classifyLeague } from "./leaguePriorityV7.ts";
import { runEngine, type FixtureInput, type VenueStats, type MatchScore, type H2HMatch, type OddsInput, type LeagueAverages } from "./predictionEngineV7.ts";

const API = "https://v3.football.api-sports.io";

export async function api(path: string, key: string): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`${API}${path}`, { headers: { "x-apisports-key": key } });
    if (r.status === 429) { await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); continue; }
    if (!r.ok) return null;
    const j = await r.json();
    const errs = j?.errors && (Array.isArray(j.errors) ? j.errors.length : Object.keys(j.errors).length);
    if (errs) {
      if (JSON.stringify(j.errors).toLowerCase().includes("rate")) { await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); continue; }
      return null;
    }
    return j.response ?? [];
  }
  return null;
}

const FT = new Set(["FT", "AET", "PEN"]);
const leagueCache = new Map<string, Promise<LeagueAverages | null>>();

function leagueAverages(leagueId: number, season: number, key: string) {
  const k = `${leagueId}-${season}`;
  if (!leagueCache.has(k)) {
    leagueCache.set(k, (async () => {
      const r = await api(`/fixtures?league=${leagueId}&season=${season}&status=FT-AET-PEN`, key);
      if (!r || !r.length) return null;
      let h = 0, a = 0, n = 0;
      for (const f of r) {
        if (f.goals?.home == null || f.goals?.away == null) continue;
        h += f.goals.home; a += f.goals.away; n++;
      }
      return n ? { homeGoals: h / n, awayGoals: a / n, matches: n } : null;
    })());
  }
  return leagueCache.get(k)!;
}

function venue(stats: any, side: "home" | "away" | "total"): VenueStats | null {
  const played = stats?.fixtures?.played?.[side];
  if (!played) return null;
  return { played, goalsFor: stats.goals?.for?.total?.[side] ?? 0, goalsAgainst: stats.goals?.against?.total?.[side] ?? 0 };
}

function form(list: any[] | null, teamId: number, beforeTs: number): MatchScore[] {
  if (!list) return [];
  return list
    .filter((f) => FT.has(f.fixture?.status?.short) && f.fixture?.timestamp < beforeTs && f.goals?.home != null)
    .slice(0, 10)
    .map((f) => {
      const isHome = f.teams?.home?.id === teamId;
      return { for: isHome ? f.goals.home : f.goals.away, against: isHome ? f.goals.away : f.goals.home };
    });
}

function oddsFrom(resp: any[] | null): OddsInput | null {
  const bms = resp?.[0]?.bookmakers;
  if (!bms?.length) return null;
  const acc: Record<string, number[]> = {};
  const push = (k: string, v: string) => { const x = parseFloat(v); if (x > 1) (acc[k] ||= []).push(x); };
  for (const b of bms) for (const bet of b.bets ?? []) {
    for (const v of bet.values ?? []) {
      if (bet.name === "Match Winner") push(String(v.value).toLowerCase(), v.odd);
      else if (bet.name === "Goals Over/Under" && (v.value === "Over 2.5" || v.value === "Under 2.5")) push(v.value, v.odd);
      else if (bet.name === "Both Teams Score") push(`btts_${String(v.value).toLowerCase()}`, v.odd);
    }
  }
  const avg = (k: string) => (acc[k]?.length ? acc[k].reduce((s, x) => s + x, 0) / acc[k].length : undefined);
  return {
    bookmakers: bms.length,
    home: avg("home"), draw: avg("draw"), away: avg("away"),
    over25: avg("Over 2.5"), under25: avg("Under 2.5"),
    bttsYes: avg("btts_yes"), bttsNo: avg("btts_no"),
  };
}

export async function analyseFixture(fx: any, key: string) {
  const id = fx.fixture.id, lid = fx.league.id, season = fx.league.season;
  const hid = fx.teams.home.id, aid = fx.teams.away.id, ts = fx.fixture.timestamp;
  const [hs, as, hf, af, h2h, odds, inj, lg] = await Promise.all([
    api(`/teams/statistics?league=${lid}&season=${season}&team=${hid}`, key),
    api(`/teams/statistics?league=${lid}&season=${season}&team=${aid}`, key),
    api(`/fixtures?team=${hid}&last=10`, key),
    api(`/fixtures?team=${aid}&last=10`, key),
    api(`/fixtures/headtohead?h2h=${hid}-${aid}&last=10`, key),
    api(`/odds?fixture=${id}`, key),
    api(`/injuries?fixture=${id}`, key),
    leagueAverages(lid, season, key),
  ]);
  const hStats: any = Array.isArray(hs) ? null : hs;
  const aStats: any = Array.isArray(as) ? null : as;
  const h2hList: H2HMatch[] = (h2h ?? [])
    .filter((f: any) => FT.has(f.fixture?.status?.short) && f.goals?.home != null)
    .map((f: any) => ({ homeGoals: f.goals.home, awayGoals: f.goals.away, homeIsFixtureHome: f.teams.home.id === hid }));
  const input: FixtureInput = {
    tier: classifyLeague(lid, fx.league.name, fx.teams.home.name, fx.teams.away.name),
    league: lg,
    homeSeasonVenue: venue(hStats, "home"),
    awaySeasonVenue: venue(aStats, "away"),
    homeSeasonAll: venue(hStats, "total"),
    awaySeasonAll: venue(aStats, "total"),
    homeForm: form(hf, hid, ts),
    awayForm: form(af, aid, ts),
    h2h: h2hList,
    odds: oddsFrom(odds),
    injuries: inj === null ? null : {
      home: inj.filter((x: any) => x.team?.id === hid).length,
      away: inj.filter((x: any) => x.team?.id === aid).length,
    },
  };
  const result = runEngine(input);
  return {
    id: String(id), league: `${fx.league.country} - ${fx.league.name}`, leagueId: lid, tier: input.tier,
    home: fx.teams.home.name, away: fx.teams.away.name, kickoff: fx.fixture.date, result,
  };
}
