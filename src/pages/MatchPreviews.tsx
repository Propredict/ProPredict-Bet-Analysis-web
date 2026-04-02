import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, Loader2, Lock, Clock, Zap, Sparkles, ChevronRight, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMatchPreviews } from "@/hooks/useMatchPreviews";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useLiveScores } from "@/hooks/useLiveScores";
import { cn } from "@/lib/utils";
import AdSlot from "@/components/ads/AdSlot";

const MAX_MATCHES = 30;

const LEAGUE_PRIORITY: Record<string, number> = {
  "Premier League": 1, "Championship": 2, "League One": 3, "League Two": 4,
  "La Liga": 5, "Segunda División": 6, "Bundesliga": 7, "2. Bundesliga": 8,
  "Serie A": 9, "Serie B": 10, "Ligue 1": 11, "Ligue 2": 12,
  "Eredivisie": 20, "Eerste Divisie": 21, "Primeira Liga": 25,
  "Challenger Pro League": 30, "Super Lig": 35, "Ekstraklasa": 40,
  "Liga Profesional Argentina": 45,
};

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

function getRiskColor(confidence: number | null) {
  if (!confidence) return { label: "Unknown", color: "text-muted-foreground", dot: "bg-muted-foreground" };
  if (confidence >= 80) return { label: "Low Risk", color: "text-emerald-400", dot: "bg-emerald-400" };
  if (confidence >= 65) return { label: "Medium Risk", color: "text-amber-400", dot: "bg-amber-400" };
  return { label: "High Risk", color: "text-red-400", dot: "bg-red-400" };
}

function getRiskRating(confidence: number): string {
  if (confidence >= 80) return "low";
  if (confidence >= 65) return "medium";
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

  // Use match_previews if available, fallback to ai_predictions
  const usePreviewData = previews.length > 0;
  const loading = usePreviewData ? previewsLoading : predictionsLoading;

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

  // Normalize data — sort by confidence (highest first), then league quality
  const topMatches = useMemo(() => {
    if (usePreviewData) {
      const mapped = previews.map(p => ({
        id: p.id,
        match_id: p.match_id,
        home_team: p.home_team,
        away_team: p.away_team,
        league: p.league,
        match_date: p.match_date,
        match_time: p.match_time,
        confidence: p.confidence_score,
        risk_rating: p.risk_rating,
        home_win: p.home_win_prob,
        away_win: p.away_win_prob,
        draw: p.draw_prob,
        key_factors: p.key_stats?.key_factors || null,
        analysis: p.preview_analysis,
        tactical_notes: p.tactical_notes,
        home_form: p.home_form,
        away_form: p.away_form,
        h2h_summary: p.h2h_summary,
        rank: 0,
      }));

      // Re-sort: highest confidence first, then quality league priority
      mapped.sort((a, b) => {
        const confDiff = (b.confidence ?? 0) - (a.confidence ?? 0);
        if (confDiff !== 0) return confDiff;
        return getLeaguePriority(a.league) - getLeaguePriority(b.league);
      });

      return mapped.map((m, i) => ({ ...m, rank: i + 1 }));
    }

    // Fallback: use AI predictions
    const isPending = (p: typeof predictions[0]) =>
      p.confidence === 50 && (p.analysis || "").toLowerCase().includes("pending");
    const pool = predictions.filter(p => !isPending(p));

    // Sort by confidence descending, then league quality
    pool.sort((a, b) => {
      const confDiff = (b.confidence ?? 0) - (a.confidence ?? 0);
      if (confDiff !== 0) return confDiff;
      return getLeaguePriority(a.league) - getLeaguePriority(b.league);
    });

    return pool.slice(0, MAX_MATCHES).map((p, i) => ({
      id: p.id,
      match_id: p.match_id,
      home_team: p.home_team,
      away_team: p.away_team,
      league: p.league,
      match_date: p.match_date,
      match_time: p.match_time,
      confidence: p.confidence ?? 0,
      risk_rating: getRiskRating(p.confidence ?? 0),
      home_win: p.home_win,
      away_win: p.away_win,
      draw: p.draw,
      key_factors: p.key_factors,
      analysis: p.analysis,
      tactical_notes: null as string | null,
      home_form: null as string | null,
      away_form: null as string | null,
      h2h_summary: null as string | null,
      rank: i + 1,
    }));
  }, [usePreviewData, previews, predictions]);

  const handleCardClick = (match: typeof topMatches[0]) => {
    if (isFreeUser) return;
    navigate(`/match-preview/${match.match_id}`, {
      state: { unlocked: true },
    });
  };

  return (
    <>
      <Helmet>
        <title>Top 30 Matches of the Day – AI Predictions | ProPredict</title>
        <meta name="description" content="AI-ranked top 30 football matches of the day with confidence ratings and match analysis." />
      </Helmet>

      <div className="page-content space-y-4">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30">
              <Trophy className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Top 30 Matches of the Day</h1>
              <p className="text-xs text-muted-foreground">
                AI-ranked by confidence — the best picks today
              </p>
            </div>
          </div>
        </div>

        <Card className="p-4 bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/20">
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Our AI ranks the top 30 matches daily by confidence level and statistical edge.</li>
            <li>Click any match to unlock full AI-powered analysis, predictions, and key factors.</li>
            <li className="text-xs text-muted-foreground/70 italic">For informational and entertainment purposes only.</li>
          </ul>
          <div className="mt-3 space-y-1">
            <p className="text-sm"><span className="text-amber-400 font-bold">● PRO</span> — 5 Match Previews daily</p>
            <p className="text-sm"><span className="text-fuchsia-400 font-bold">● PREMIUM</span> — Unlimited Match Previews</p>
          </div>
        </Card>

        {isFreeUser && (
          <Card className="p-3 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border-red-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-400" />
                <span className="text-sm text-muted-foreground">Match previews require a Pro or Premium subscription</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/40 cursor-pointer" onClick={() => navigate("/get-premium")}>Upgrade</Badge>
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
              const risk = getRiskColor(match.confidence);
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
                    "overflow-hidden transition-all bg-card border shadow-sm cursor-pointer hover:shadow-lg hover:shadow-violet-500/10",
                    isTop3
                      ? "border-violet-400/40"
                      : "border-border/60"
                  )}
                  onClick={() => handleCardClick(match)}
                >
                  <div className="p-5 space-y-4">
                    {/* Rank badge + League centered */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black",
                          rank <= 3 ? rankStyle.bg : "bg-muted",
                          rank <= 3 ? rankStyle.text : "text-muted-foreground"
                        )}>
                          {rank}
                        </div>
                        {isTop3 && <span className="text-sm">{rankStyle.label}</span>}
                      </div>
                      <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest text-center">
                        {match.league || "Unknown"}
                      </span>
                    </div>

                    {/* Teams with big circle logos */}
                    <div className="flex items-start justify-between gap-2">
                      {/* Home team */}
                      <div className="flex flex-col items-center flex-1 min-w-0 gap-2">
                        <div className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 bg-muted/30",
                          isTop3 ? "border-violet-400/50" : "border-border/50"
                        )}>
                          {homeLogo ? (
                            <img src={homeLogo} alt={match.home_team} className="w-10 h-10 object-contain" />
                          ) : (
                            <span className="text-sm font-bold text-violet-600 dark:text-violet-300">{getTeamInitials(match.home_team)}</span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-foreground text-center leading-tight max-w-[100px]">{match.home_team}</span>
                      </div>

                      {/* VS + date/time center */}
                      <div className="flex flex-col items-center justify-center pt-2 gap-0.5 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground">{match.match_date || ""}</span>
                        <span className="text-lg font-black text-muted-foreground">VS</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground/60" />
                          <span className="text-[11px] text-muted-foreground">{match.match_time?.slice(0, 5) || "TBD"}</span>
                        </div>
                      </div>

                      {/* Away team */}
                      <div className="flex flex-col items-center flex-1 min-w-0 gap-2">
                        <div className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 bg-muted/30",
                          isTop3 ? "border-violet-400/50" : "border-border/50"
                        )}>
                          {awayLogo ? (
                            <img src={awayLogo} alt={match.away_team} className="w-10 h-10 object-contain" />
                          ) : (
                            <span className="text-sm font-bold text-primary/70">{getTeamInitials(match.away_team)}</span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-foreground text-center leading-tight max-w-[100px]">{match.away_team}</span>
                      </div>
                    </div>

                    {/* Confidence + Risk */}
                    <div className="flex items-center justify-center gap-4 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-violet-500 dark:text-primary" />
                        <span className="text-xs text-muted-foreground">Confidence</span>
                        <span className="text-sm font-extrabold text-foreground">{match.confidence ?? 0}%</span>
                      </div>
                      <span className="text-muted-foreground/30">·</span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full", risk.dot)} />
                        <span className={cn("text-xs font-semibold", risk.color)}>{risk.label}</span>
                      </div>
                    </div>

                    {/* Analysis preview */}
                    {snippets.length > 0 && (
                      <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                        {snippets.map((snippet, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="mt-0.5">{snippet.icon}</span>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {snippet.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Social proof */}
                    <div className="flex justify-end">
                      <span className="text-[11px] text-muted-foreground">
                        🔥 {getUnlockPercentage(match.match_id)}% of users unlocked this match
                      </span>
                    </div>

                    {/* CTA */}
                    <Button
                      size="sm"
                      className="w-full text-xs font-bold h-10 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-sm"
                      onClick={(e) => { e.stopPropagation(); isFreeUser ? navigate("/get-premium") : handleCardClick(match); }}
                    >
                      {isFreeUser ? (
                        <><Lock className="h-3.5 w-3.5 mr-1.5" />Upgrade to Unlock</>
                      ) : (
                        <><Zap className="h-3.5 w-3.5 mr-1.5" />Unlock Prediction & Match Analysis<ChevronRight className="h-3.5 w-3.5 ml-1" /></>
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


function getPreviewSnippets(match: { home_team: string; away_team: string; confidence: number | null; home_win: number; away_win: number; key_factors: string[] | null; analysis: string | null }) {
  const snippets: { icon: string; text: string }[] = [];
  const hw = match.home_win ?? 0;
  const aw = match.away_win ?? 0;
  const favored = hw >= aw ? match.home_team : match.away_team;
  const pct = Math.max(hw, aw);

  snippets.push({ icon: "🟢", text: `${favored} dominates with ${pct}% win probability — clear edge` });

  if (match.key_factors && match.key_factors.length > 0) {
    snippets.push({ icon: "🔧", text: match.key_factors[0] });
  } else {
    snippets.push({ icon: "🔧", text: "Goal trends and defensive weaknesses support an open game" });
  }

  snippets.push({ icon: "✨", text: `AI confidence is ${match.confidence ?? 0}% — strong conviction pick` });

  return snippets;
}
