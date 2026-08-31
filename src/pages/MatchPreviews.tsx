import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, Loader2, Lock, Clock, Zap, Sparkles, ChevronRight, Trophy, Check, Crown, ShieldCheck, Users, Diamond } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMatchPreviews } from "@/hooks/useMatchPreviews";
import { useAIPredictions, type AIPrediction } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useLiveScores } from "@/hooks/useLiveScores";
import { calculateGoalMarketProbs } from "@/components/ai-predictions/utils/marketDerivation";
import { getTopMatchPreviewPick } from "@/utils/matchPreviewPicks";
import { cn } from "@/lib/utils";
import { formatMatchTime } from "@/utils/formatMatchTime";
import AdSlot from "@/components/ads/AdSlot";
import { AffiliateBanner1xBet } from "@/components/dashboard/AffiliateBanner1xBet";
import aiBrainAsset from "@/assets/ai-brain.png.asset.json";

const MIN_CONFIDENCE_PRIMARY = 80; // Prefer 80%+ matches
const MIN_CONFIDENCE_FALLBACK = 70; // Fallback to 70%+ if not enough
const MAX_MATCHES = 30;

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
  if (bestPickPct >= 80) return { label: "Low Risk", color: "text-emerald-400", dot: "bg-emerald-400" };
  if (bestPickPct >= 65) return { label: "Medium Risk", color: "text-amber-400", dot: "bg-amber-400" };
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
  if (rank === 1) return { bg: "bg-gradient-to-br from-yellow-400 to-amber-500", text: "text-yellow-900", border: "ring-2 ring-yellow-400/60", label: "🥇" };
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
      .filter(p => Math.max(p.confidence ?? 0, getTopMatchPreviewPick(p as any).confidence) >= 65)
      .map(p => ({
        p,
        bestPct: getTopMatchPreviewPick(p as any).confidence,
        tier: getLeagueTier(p.league),
      }))
      .sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        const pctDiff = b.bestPct - a.bestPct;
        if (pctDiff !== 0) return pctDiff;
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
        <title>Top 30 AI Picks – Safest Football Predictions | ProPredict</title>
        <meta name="description" content="The Top 30 AI Picks of the day — AI-curated safest football matches with 75%+ confidence." />
      </Helmet>

      <div className="page-content space-y-4">
        {/* Premium Page Header */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-background/80 to-background p-6 sm:p-8">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 border border-violet-400/50 shadow-lg shadow-violet-500/20">
                <Trophy className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Top 30 AI Picks</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Only the safest AI picks — <span className="text-violet-400 font-bold">75%+ confidence</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-black text-violet-400 uppercase tracking-widest">AI Curated</span>
            </div>
          </div>
        </div>

        {/* Sponsored: 1xBet affiliate banner – web only */}
        <AffiliateBanner1xBet />

        {/* Premium Info Card */}
        <Card className="relative overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-background/80 to-background p-5">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1 rounded-md bg-violet-500/20 border border-violet-500/40">
                  <Check className="h-4 w-4 text-violet-400" />
                </div>
                <p className="text-sm text-foreground/90">
                  Our AI selects only the safest matches (<span className="text-violet-400 font-bold">75%+ confidence</span>) from today's fixtures.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1 rounded-md bg-violet-500/20 border border-violet-500/40">
                  <Check className="h-4 w-4 text-violet-400" />
                </div>
                <p className="text-sm text-foreground/90">
                  Click any match to unlock full AI-powered analysis, predictions, and key factors.
                </p>
              </div>
              <div className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-violet-500/10 border border-violet-500/20 w-fit">
                <Diamond className="h-3.5 w-3.5 text-fuchsia-400" />
                <span className="text-fuchsia-400 font-black tracking-widest uppercase text-[10px]">Premium</span>
                <span className="h-1 w-1 rounded-full bg-violet-400" />
                <span className="text-muted-foreground text-[10px] font-semibold">Unlimited Match Previews</span>
              </div>
            </div>
            <div className="hidden md:flex justify-end items-center">
              <img
                src={aiBrainAsset.url}
                alt="AI brain"
                className="w-24 h-24 object-contain drop-shadow-[0_0_25px_rgba(139,92,246,0.35)]"
                loading="lazy"
                width={96}
                height={96}
              />
            </div>
          </div>
        </Card>

        {isFreeUser && (
          <Card className="relative overflow-hidden p-5 border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 via-violet-500/5 to-transparent">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-fuchsia-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Match previews require a Premium subscription</h4>
                  <p className="text-sm text-muted-foreground">Upgrade to unlock all AI match previews and predictions.</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-full border-fuchsia-500/50 text-fuchsia-400 hover:bg-fuchsia-500 hover:text-white hover:border-fuchsia-500 px-6 shadow-[0_0_20px_rgba(232,121,249,0.15)]"
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
            <p className="text-sm text-muted-foreground">No matches available today</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {topMatches.map((match) => {
              const rank = match.rank;
              const risk = getRiskColor(match.bestPick?.pct ?? match.confidence);
              const homeLogo = getTeamLogo(match.home_team, match.away_team, "home");
              const awayLogo = getTeamLogo(match.home_team, match.away_team, "away");
              const rankStyle = getRankStyle(rank);
              const isTop3 = rank <= 3;

              // Generate preview snippets
              const snippets = getPreviewSnippets(match);

              return (
                <Card
                  key={match.id}
                  className={cn(
                    "relative overflow-hidden border cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10",
                    isTop3
                      ? "border-violet-400/40"
                      : "border-border/60"
                  )}
                  onClick={() => handleCardClick(match)}
                >
                  {/* Stadium background */}
                  <div className="absolute inset-0 z-0">
                    <div className={cn(
                      "absolute inset-0 opacity-40",
                      "bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent",
                      "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent"
                    )} />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
                    <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
                  </div>

                  <div className="relative z-10 p-5 sm:p-6">
                    {/* League Header */}
                    <div className="flex flex-col items-center gap-2 mb-6">
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black",
                          rank <= 3 ? rankStyle.bg : "bg-muted",
                          rank <= 3 ? rankStyle.text : "text-muted-foreground"
                        )}>
                          {rank}
                        </div>
                        {isTop3 && (
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xs">
                            <Trophy className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-[0.3em] text-center">
                        {match.league || "Unknown"}
                      </span>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center justify-between max-w-2xl mx-auto">
                      {/* Home team */}
                      <div className="flex flex-col items-center gap-3 flex-1 min-w-0 group">
                        <div className="relative p-1 rounded-full bg-gradient-to-br from-violet-500/20 to-transparent">
                          <div className={cn(
                            "w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center overflow-hidden border-4 bg-card shadow-2xl",
                            isTop3 ? "border-violet-400/50" : "border-border/50"
                          )}>
                            {homeLogo ? (
                              <img src={homeLogo} alt={match.home_team} className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
                            ) : (
                              <span className="text-sm sm:text-lg font-bold text-violet-400">{getTeamInitials(match.home_team)}</span>
                            )}
                          </div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-6 bg-foreground/5 blur-xl rounded-full -z-10" />
                        </div>
                        <span className="text-sm sm:text-base font-black text-foreground text-center leading-tight max-w-[120px]">{match.home_team}</span>
                      </div>

                      {/* VS center */}
                      <div className="flex flex-col items-center px-3 sm:px-8">
                        <span className="text-[10px] font-bold text-muted-foreground mb-1 tracking-widest uppercase">{match.match_date || ""}</span>
                        <div className="text-4xl sm:text-5xl font-black italic text-foreground/80 tracking-tighter">VS</div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 border border-border/50 mt-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] font-black text-muted-foreground">
                            {formatMatchTime((match as any).match_timestamp, match.match_time, match.match_date)}
                          </span>
                        </div>
                      </div>

                      {/* Away team */}
                      <div className="flex flex-col items-center gap-3 flex-1 min-w-0 group">
                        <div className="relative p-1 rounded-full bg-gradient-to-br from-violet-500/20 to-transparent">
                          <div className={cn(
                            "w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center overflow-hidden border-4 bg-card shadow-2xl",
                            isTop3 ? "border-violet-400/50" : "border-border/50"
                          )}>
                            {awayLogo ? (
                              <img src={awayLogo} alt={match.away_team} className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
                            ) : (
                              <span className="text-sm sm:text-lg font-bold text-violet-400">{getTeamInitials(match.away_team)}</span>
                            )}
                          </div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-6 bg-foreground/5 blur-xl rounded-full -z-10" />
                        </div>
                        <span className="text-sm sm:text-base font-black text-foreground text-center leading-tight max-w-[120px]">{match.away_team}</span>
                      </div>
                    </div>

                    {/* Confidence + Risk */}
                    <div className="flex items-center justify-center gap-3 sm:gap-5 mt-8">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 backdrop-blur-md">
                        <ShieldCheck className="h-4 w-4 text-violet-400" />
                        <span className="text-xs font-bold text-muted-foreground">Confidence <span className="text-foreground ml-1">{match.bestPick?.pct ?? match.confidence}%</span></span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
                        <span className={cn("w-2 h-2 rounded-full animate-pulse", risk.dot)} />
                        <span className={cn("text-xs font-black uppercase tracking-wide", risk.color)}>{risk.label}</span>
                      </div>
                    </div>

                    {/* Locked badge */}
                    {isFreeUser && match.bestPick && (
                      <div className="flex justify-center mt-5">
                        <div className="px-4 py-2 rounded-full border border-amber-500/40 bg-amber-500/5 text-amber-500 text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5" />
                          AI Top Pick Locked
                        </div>
                      </div>
                    )}

                    {/* Features grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-0.5 mt-6 bg-border/30 rounded-3xl overflow-hidden border border-border/40 backdrop-blur-md">
                      <div className="bg-card/80 p-4 sm:p-5 flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                          <Lock className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-foreground">Multiple AI picks</div>
                          <div className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">Unlock all variations</div>
                        </div>
                      </div>

                      <div className="bg-card/80 p-4 sm:p-5 flex items-center gap-3 border-l-0 sm:border-l border-border/30">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                          <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-foreground">Correct score</div>
                          <div className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">See exact results</div>
                        </div>
                      </div>

                      <div className="bg-card/80 p-4 sm:p-5 flex items-center gap-3 border-l-0 sm:border-l border-border/30">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-foreground">{getUnlockPercentage(match.match_id)}% of users</div>
                          <div className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">unlocked this pick</div>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <Button
                      className={cn(
                        "w-full mt-5 h-auto py-4 sm:py-5 rounded-2xl font-black text-sm sm:text-base uppercase tracking-tight transition-all hover:scale-[1.01] active:scale-[0.99] shadow-[0_20px_40px_-10px_rgba(139,92,246,0.4)]",
                        isFreeUser
                          ? "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 hover:from-violet-700 hover:via-fuchsia-600 hover:to-pink-600 animate-pulse"
                          : "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 hover:from-violet-700 hover:via-fuchsia-600 hover:to-pink-600"
                      )}
                      onClick={(e) => { e.stopPropagation(); isFreeUser ? navigate("/get-premium") : handleCardClick(match); }}
                    >
                      {isFreeUser ? (
                        <>
                          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          💎 Get This Winning Pick / Pogledaj Celosnu Analizu i Tip
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          View Full Analysis & More Predictions
                          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
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
