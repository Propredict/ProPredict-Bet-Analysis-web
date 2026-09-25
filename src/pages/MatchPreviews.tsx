import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, Loader2, Sparkles, ChevronRight, Trophy, Check, Crown, Diamond } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMatchPreviews } from "@/hooks/useMatchPreviews";
import { useAIPredictions, type AIPrediction } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useLiveScores } from "@/hooks/useLiveScores";
import { calculateGoalMarketProbs } from "@/components/ai-predictions/utils/marketDerivation";
import { getStrongestMarketPick as getTopMatchPreviewPick, TOP10_MIN_CONFIDENCE, TOP10_MAX } from "@/utils/matchPreviewPicks";
import AdSlot from "@/components/ads/AdSlot";
import { PageHero } from "@/components/layout/PageHero";
import aiBrainAsset from "@/assets/ai-brain.png.asset.json";

const MIN_CONFIDENCE_PRIMARY = 80; // Prefer 80%+ matches
const MIN_CONFIDENCE_FALLBACK = 70; // Fallback to 70%+ if not enough
const MAX_MATCHES = TOP10_MAX;

// Tier 1 = elite top-flight leagues + UEFA competitions (always shown first)
// Tier 2 = strong second-tier / mid-strength leagues
// Tier 3 = remaining recognized leagues
// Anything not listed → tier 4 (only used as last-resort fallback)
const LEAGUE_TIERS: Record<string, number> = {
  // Tier 1 — elite
  "Premier League": 1,
  "La Liga": 1,
  "Primera Division": 1,
  "Bundesliga": 1,
  "Serie A": 1,
  "Ligue 1": 1,
  "UEFA Champions League": 1,
  "Champions League": 1,
  "UEFA Europa League": 1,
  "Europa League": 1,
  "UEFA Europa Conference League": 1,
  "Conference League": 1,
  "FIFA World Cup": 1,
  "European Championship": 1,
  "Euro Championship": 1,
  "Copa America": 1,
  "Copa Libertadores": 1,
  // Tier 2 — strong second-tier / solid leagues
  "Championship": 2,
  "Segunda División": 2,
  "2. Bundesliga": 2,
  "Serie B": 2,
  "Ligue 2": 2,
  "Eredivisie": 2,
  "Primeira Liga": 2,
  "Super Lig": 2,
  "Liga Profesional Argentina": 2,
  // Tier 3 — recognized minor leagues
  "League One": 3,
  "League Two": 3,
  "Eerste Divisie": 3,
  "Challenger Pro League": 3,
  "Ekstraklasa": 3,
};

// Within a tier, this sub-priority orders the elite leagues so PL/LaLiga/UCL show first
const LEAGUE_PRIORITY: Record<string, number> = {
  "UEFA Champions League": 1, "Champions League": 1,
  "Premier League": 2,
  "La Liga": 3, "Primera Division": 3,
  "Bundesliga": 4,
  "Serie A": 5,
  "Ligue 1": 6,
  "UEFA Europa League": 7, "Europa League": 7,
  "UEFA Europa Conference League": 8, "Conference League": 8,
  "FIFA World Cup": 9, "European Championship": 9, "Euro Championship": 9,
  "Copa America": 10, "Copa Libertadores": 11,
  "Championship": 20, "Segunda División": 21, "2. Bundesliga": 22, "Serie B": 23, "Ligue 2": 24,
  "Eredivisie": 25, "Primeira Liga": 26, "Super Lig": 27, "Liga Profesional Argentina": 28,
  "League One": 40, "League Two": 41, "Eerste Divisie": 42,
  "Challenger Pro League": 43, "Ekstraklasa": 44,
};

function getLeagueTier(league: string | null): number {
  if (!league) return 4;
  const entry = Object.entries(LEAGUE_TIERS).find(([key]) => key.toLowerCase() === league.toLowerCase());
  return entry ? entry[1] : 4;
}

const EPL_TEAMS = new Set([
  "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton",
  "Burnley", "Chelsea", "Crystal Palace", "Everton", "Fulham",
  "Ipswich", "Leeds", "Leicester", "Liverpool", "Luton",
  "Manchester City", "Manchester United", "Newcastle", "Nottingham Forest",
  "Sheffield United", "Southampton", "Tottenham", "West Ham", "Wolverhampton",
  "Wolves", "Norwich", "Watford", "West Brom", "Sheffield Wed",
]);

function isQualityLeague(league: string | null, homeTeam?: string): boolean {
  if (!league) return false;
  const lower = league.toLowerCase();
  const match = Object.keys(LEAGUE_PRIORITY).find(k => k.toLowerCase() === lower);
  if (!match) return false;
  if (lower === "premier league" && homeTeam) return EPL_TEAMS.has(homeTeam);
  return true;
}

function getLeaguePriority(league: string | null): number {
  if (!league) return 999;
  const entry = Object.entries(LEAGUE_PRIORITY).find(([key]) => key.toLowerCase() === league.toLowerCase());
  return entry ? entry[1] : 999;
}

function getRiskColor(bestPickPct: number) {
  if (bestPickPct >= 80) return { label: "Low Risk", color: "text-success", dot: "bg-success" };
  if (bestPickPct >= 65) return { label: "Medium Risk", color: "text-primary", dot: "bg-primary" };
  return { label: "High Risk", color: "text-red-400", dot: "bg-red-400" };
}

function getRiskRating(bestPickPct: number): string {
  if (bestPickPct >= 80) return "low";
  if (bestPickPct >= 65) return "medium";
  return "high";
}

function getTeamInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
}

function getRankStyle(rank: number): { bg: string; text: string; border: string; label: string } {
  if (rank === 1) return { bg: "bg-gradient-to-br from-primary to-primary", text: "text-primary", border: "ring-2 ring-primary/60", label: "🥇" };
  if (rank === 2) return { bg: "bg-gradient-to-br from-gray-300 to-gray-400", text: "text-gray-800", border: "ring-2 ring-gray-300/60", label: "🥈" };
  if (rank === 3) return { bg: "bg-gradient-to-br from-orange-400 to-orange-600", text: "text-orange-900", border: "ring-2 ring-orange-400/60", label: "🥉" };
  return { bg: "bg-muted", text: "text-muted-foreground", border: "", label: `#${rank}` };
}

export default function MatchPreviews() {
  const { previews, loading: previewsLoading } = useMatchPreviews();
  const { predictions, loading: predictionsLoading } = useAIPredictions("today");
  const { matches: liveMatches } = useLiveScores({ dateMode: "today" });
  const { plan } = useUserPlan();
  const { isAdmin } = useAdminAccess();
  const navigate = useNavigate();

  const isPremiumUser = plan === "premium" || isAdmin;
  const isProUser = plan === "basic";
  const isFreeUser = plan === "free";

  // Always use AI predictions as primary source (has proper confidence engine)
  // Enrich with match_previews data when available
  const loading = predictionsLoading;

  const logoMap = useMemo(() => {
    const map: Record<string, { home: string | null; away: string | null }> = {};
    for (const m of liveMatches) {
      const key = `${m.homeTeam.toLowerCase()}|${m.awayTeam.toLowerCase()}`;
      map[key] = { home: m.homeLogo, away: m.awayLogo };
      map[m.homeTeam.toLowerCase()] = { home: m.homeLogo, away: null };
      map[m.awayTeam.toLowerCase()] = { home: null, away: m.awayLogo };
    }
    return map;
  }, [liveMatches]);

  function getTeamLogo(homeTeam: string, awayTeam: string, side: "home" | "away"): string | null {
    const matchKey = `${homeTeam.toLowerCase()}|${awayTeam.toLowerCase()}`;
    const matchEntry = logoMap[matchKey];
    if (matchEntry) return side === "home" ? matchEntry.home : matchEntry.away;
    const teamName = side === "home" ? homeTeam.toLowerCase() : awayTeam.toLowerCase();
    const entry = logoMap[teamName];
    if (entry) return side === "home" ? entry.home : entry.away;
    return null;
  }

  // Always use AI predictions — sorted by confidence (highest/safest first)
  // Enrich with match_previews extra data when available
  const topMatches = useMemo(() => {
    const isPending = (p: typeof predictions[0]) =>
      p.confidence === 50 && (p.analysis || "").toLowerCase().includes("pending");
    const valid = predictions.filter(p => !isPending(p));

    // Tier-first ordering (matches Premium AI logic):
    //   1) Group by league tier (1 = elite → 4 = obscure)
    //   2) Within a tier: highest best-pick % first
    //   3) Tie-break: general AI confidence, then sub-league priority
    // We then take only top MAX_MATCHES, which naturally hides minor leagues
    // when there are enough strong matches from top leagues.
    // Same quality gate as the AI Predictions page: only verified picks
    // (best market strength >= 65%) are eligible. Fewer than 30 cards is fine.
    const enriched = valid
      .filter(p => getTopMatchPreviewPick(p as any).confidence >= TOP10_MIN_CONFIDENCE)
      .map(p => ({
        p,
        bestPct: getTopMatchPreviewPick(p as any).confidence,
        tier: getLeagueTier(p.league),
      }))
      .sort((a, b) => {
        const pctDiff = b.bestPct - a.bestPct;
        if (pctDiff !== 0) return pctDiff;
        if (a.tier !== b.tier) return a.tier - b.tier;
        const confDiff = (b.p.confidence ?? 0) - (a.p.confidence ?? 0);
        if (confDiff !== 0) return confDiff;
        return getLeaguePriority(a.p.league) - getLeaguePriority(b.p.league);
      });
    const pool = enriched.map(x => x.p);

    // Build a lookup from match_previews for enrichment
    const previewMap = new Map<string, typeof previews[0]>();
    for (const pv of previews) {
      previewMap.set(pv.match_id, pv);
    }

    return pool.slice(0, MAX_MATCHES).map((p, i) => {
      const pv = previewMap.get(p.match_id);
      const top = getTopMatchPreviewPick(p as any);
      const bestPick = { label: top.label, pct: top.confidence, emoji: top.emoji };
      return {
        id: p.id,
        match_id: p.match_id,
        home_team: p.home_team,
        away_team: p.away_team,
        league: p.league,
        match_date: p.match_date,
        match_time: p.match_time,
        match_timestamp: (p as any).match_timestamp ?? null,
        confidence: p.confidence ?? 0,
        risk_rating: getRiskRating(bestPick.pct),
        home_win: p.home_win,
        away_win: p.away_win,
        draw: p.draw,
        key_factors: p.key_factors,
        analysis: p.analysis,
        prediction: p.prediction,
        predicted_score: p.predicted_score,
        tactical_notes: pv?.tactical_notes ?? null,
        home_form: pv?.home_form ?? null,
        away_form: pv?.away_form ?? null,
        h2h_summary: pv?.h2h_summary ?? null,
        rank: i + 1,
        bestPick,
      };
    });
  }, [previews, predictions]);

  const handleCardClick = (match: typeof topMatches[0]) => {
    if (isFreeUser) return;
    navigate(`/match-preview/${match.match_id}`, {
      state: { unlocked: true },
    });
  };

  return (
    <>
      <Helmet>
        <title>Top 10 AI Picks – Safest Football Predictions | ProPredict</title>
        <meta name="description" content="The Top 10 AI Picks of the day — only matches where our AI model is 80%+ confident in a pick." />
      </Helmet>

      <div className="page-content space-y-4">
        {/* Page Header */}
        <PageHero
          title="Top 10 AI Picks"
          subtitle="Only picks with 80%+ AI confidence / Samo tipovi sa 80%+ sigurnosti"
          icon={Trophy}
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
              <Sparkles className="h-3 w-3" />
              AI Curated
            </span>
          }
        />


        {/* Sponsored: 1xBet affiliate banner – web only */}

        {/* Premium Info Card */}
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background/80 to-background p-5">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1 rounded-md bg-primary/20 border border-primary/40">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm text-foreground/90">
                  Only matches where our AI is <span className="text-primary font-bold">80%+ confident</span> in any pick (1, X, 2, Over/Under 2.5, BTTS). / Samo utakmice gde je naš AI 80%+ siguran u bilo koji tip.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1 rounded-md bg-primary/20 border border-primary/40">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm text-foreground/90">
                  Click any match to unlock full AI-powered analysis, predictions, and key factors.
                </p>
              </div>
              <div className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-primary/10 border border-primary/20 w-fit">
                <Diamond className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary font-black tracking-widest uppercase text-[10px]">Premium</span>
                <span className="h-1 w-1 rounded-full bg-primary" />
                <span className="text-muted-foreground text-[10px] font-semibold">Unlimited Match Previews</span>
              </div>
            </div>
            <div className="hidden md:flex justify-end items-center">
              <img
                src={aiBrainAsset.url}
                alt="AI brain"
                className="w-24 h-24 object-contain drop-shadow-[0_0_25px_hsl(var(--primary)/0.35)]"
                loading="lazy"
                width={96}
                height={96}
              />
            </div>
          </div>
        </Card>

        {isFreeUser && (
          <Card className="relative overflow-hidden p-5 border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Match previews require a Premium subscription</h4>
                  <p className="text-sm text-muted-foreground">Upgrade to unlock all AI match previews and predictions.</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-full border-primary/50 text-primary hover:bg-primary hover:text-white hover:border-primary px-6 shadow-[0_0_20px_rgba(232,121,249,0.15)]"
                onClick={() => navigate("/get-premium")}
              >
                <Crown className="h-4 w-4 mr-2" />
                Subscribe
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : topMatches.length === 0 ? (
          <Card className="p-6 text-center">
            <Eye className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No picks with 80%+ confidence today / Danas nema tipova sa 80%+ sigurnosti</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {topMatches.map((match) => {
              const homeLogo = getTeamLogo(match.home_team, match.away_team, "home");
              const awayLogo = getTeamLogo(match.home_team, match.away_team, "away");
              const pct = match.bestPick?.pct ?? match.confidence;
              // Real bookmaker consensus odds for 1X2 picks; fair odds from our
              // model only for markets where bookmaker odds are not stored.
              const pickLabel = match.bestPick?.label ?? "";
              const realOdds =
                pickLabel === "Home Win" ? match.consensus_home
                : pickLabel === "Draw" ? match.consensus_draw
                : pickLabel === "Away Win" ? match.consensus_away
                : null;
              const displayOdds = realOdds && realOdds > 1
                ? realOdds.toFixed(2)
                : (100 / Math.max(pct, 1)).toFixed(2);

              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => (isFreeUser ? navigate("/get-premium") : handleCardClick(match))}
                  className="flex w-full min-w-0 items-center gap-2 rounded-2xl border-2 border-primary/50 bg-card px-3 py-3 text-left transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 sm:gap-4 sm:px-5 sm:py-4"
                >
                  {/* Rank */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-base font-black text-primary-foreground sm:h-11 sm:w-11 sm:text-lg">
                    {match.rank}
                  </div>

                  {/* League (desktop) */}
                  <span className="hidden w-32 shrink-0 truncate text-sm font-bold text-muted-foreground lg:block">
                    {match.league || ""}
                  </span>

                  {/* Home team */}
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <span className="text-right text-xs font-black leading-tight text-foreground break-words sm:text-base md:text-lg">
                      {match.home_team}
                    </span>
                    {homeLogo ? (
                      <img src={homeLogo} alt={match.home_team} className="h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9" loading="lazy" />
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary sm:h-9 sm:w-9">
                        {getTeamInitials(match.home_team)}
                      </span>
                    )}
                  </div>

                  <span className="shrink-0 text-[11px] font-black text-muted-foreground sm:text-sm">VS</span>

                  {/* Away team */}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {awayLogo ? (
                      <img src={awayLogo} alt={match.away_team} className="h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9" loading="lazy" />
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary sm:h-9 sm:w-9">
                        {getTeamInitials(match.away_team)}
                      </span>
                    )}
                    <span className="text-xs font-black leading-tight text-foreground break-words sm:text-base md:text-lg">
                      {match.away_team}
                    </span>
                  </div>

                  {/* Pick */}
                  <div className="flex w-20 shrink-0 flex-col items-center rounded-xl bg-secondary/70 px-2 py-2 sm:w-28 sm:px-3 sm:py-2.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground sm:text-[11px]">Pick</span>
                    <span className="truncate text-xs font-black text-success sm:text-lg">
                      {isFreeUser ? "🔒" : match.bestPick?.label}
                    </span>
                  </div>

                  {/* Confidence */}
                  <div className="w-16 shrink-0 sm:w-24">
                    <div className="text-center text-sm font-black text-foreground sm:text-base">{pct}%</div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>

                  {/* Fair odds (desktop) */}
                  <div className="hidden w-20 shrink-0 flex-col items-center rounded-xl bg-secondary/70 px-2 py-2 sm:flex">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Odds</span>
                    <span className="text-base font-black text-primary">{displayOdds}</span>
                  </div>

                  <ChevronRight className="h-6 w-6 shrink-0 text-primary" />
                </button>
              );
            })}
          </div>
        )}

        <AdSlot />
      </div>
    </>
  );
}

// Deterministic pseudo-random unlock % per match (75-96 range)
function getUnlockPercentage(matchId: string): number {
  let hash = 0;
  for (let i = 0; i < matchId.length; i++) {
    hash = ((hash << 5) - hash + matchId.charCodeAt(i)) | 0;
  }
  return 75 + (Math.abs(hash) % 22); // 75-96%
}




function getPreviewSnippets(match: { home_team: string; away_team: string; confidence: number | null; home_win: number; away_win: number; key_factors: string[] | null; analysis: string | null; bestPick?: { label: string; pct: number; emoji: string } }) {
  const snippets: { icon: string; text: string }[] = [];

  // Best market pick first
  if (match.bestPick) {
    snippets.push({ icon: match.bestPick.emoji, text: `Best Pick: ${match.bestPick.label} — ${match.bestPick.pct}% probability` });
  }

  const hw = match.home_win ?? 0;
  const aw = match.away_win ?? 0;
  const favored = hw >= aw ? match.home_team : match.away_team;
  const pct = Math.max(hw, aw);

  snippets.push({ icon: "🟢", text: `${favored} dominates with ${pct}% win probability` });

  if (match.key_factors && match.key_factors.length > 0) {
    snippets.push({ icon: "🔧", text: match.key_factors[0] });
  }

  return snippets;
}
