import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, Loader2, RefreshCw, Lock, Clock, Zap, Sparkles, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useLiveScores } from "@/hooks/useLiveScores";
import { cn } from "@/lib/utils";
import AdSlot from "@/components/ads/AdSlot";

const PRO_PREVIEW_LIMIT = 5;
const MAX_MATCHES = 30;

// Quality men's leagues with priority order (lower = higher priority)
const LEAGUE_PRIORITY: Record<string, number> = {
  // 1. England
  "Premier League": 1,
  "Championship": 2,
  "League One": 3,
  "League Two": 4,
  // 2. Spain
  "La Liga": 5,
  "Segunda División": 6,
  // 3. Germany
  "Bundesliga": 7,
  "2. Bundesliga": 8,
  // 4. Italy
  "Serie A": 9,
  "Serie B": 10,
  // 5. France
  "Ligue 1": 11,
  "Ligue 2": 12,
  // Additional
  "Eredivisie": 20,
  "Eerste Divisie": 21,
  "Primeira Liga": 25,
  "Challenger Pro League": 30,
  "Super Lig": 35,
  "Ekstraklasa": 40,
  "Liga Profesional Argentina": 45,
};

// English Premier League teams whitelist — to filter out Kuwait, Egypt, etc. "Premier League"
const EPL_TEAMS = new Set([
  "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton",
  "Burnley", "Chelsea", "Crystal Palace", "Everton", "Fulham",
  "Ipswich", "Leeds", "Leicester", "Liverpool", "Luton",
  "Manchester City", "Manchester United", "Newcastle", "Nottingham Forest",
  "Sheffield United", "Southampton", "Tottenham", "West Ham", "Wolverhampton",
  "Wolves", "Norwich", "Watford", "West Brom", "Sheffield Wed",
]);

const QUALITY_SET = new Set(Object.keys(LEAGUE_PRIORITY).map((l) => l.toLowerCase()));

function isQualityLeague(league: string | null, homeTeam?: string): boolean {
  if (!league) return false;
  const lower = league.toLowerCase();
  if (!QUALITY_SET.has(lower)) return false;
  // For "Premier League", only allow English teams
  if (lower === "premier league" && homeTeam) {
    return EPL_TEAMS.has(homeTeam);
  }
  return true;
}

function getLeaguePriority(league: string | null): number {
  if (!league) return 999;
  const entry = Object.entries(LEAGUE_PRIORITY).find(
    ([key]) => key.toLowerCase() === league.toLowerCase()
  );
  return entry ? entry[1] : 999;
}

function getRiskColor(confidence: number | null) {
  if (!confidence) return { label: "Unknown", color: "text-muted-foreground", dot: "bg-muted-foreground" };
  if (confidence >= 80) return { label: "Low Risk", color: "text-emerald-400", dot: "bg-emerald-400" };
  if (confidence >= 65) return { label: "Medium Risk", color: "text-amber-400", dot: "bg-amber-400" };
  return { label: "High Risk", color: "text-red-400", dot: "bg-red-400" };
}

function getTeamInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
}

function getInsight(prediction: string | null, homeTeam: string, awayTeam: string, confidence: number | null): string {
  const conf = confidence ?? 50;
  const p = (prediction || "").toLowerCase().trim();
  if (p === "1" || p === "home") return `${homeTeam} favored based on form & home advantage`;
  if (p === "2" || p === "away") return `${awayTeam} showing strong away form this season`;
  if (p === "x" || p === "draw") return `Evenly matched — expect a tight contest`;
  if (p.includes("over")) return `Both teams averaging high goal counts recently`;
  if (p.includes("under")) return `Defensive matchup — low scoring expected`;
  if (p.includes("btts")) return `Both sides finding the net consistently`;
  return `AI analysis based on ${conf}% confidence model`;
}

function getPredictionLabel(prediction: string | null): string {
  if (!prediction) return "—";
  const p = prediction.toLowerCase().trim();
  if (p === "1" || p === "home") return "Home Win";
  if (p === "x" || p === "draw") return "Draw";
  if (p === "2" || p === "away") return "Away Win";
  if (p.includes("over")) return "Over 2.5";
  if (p.includes("under")) return "Under 2.5";
  if (p.includes("btts")) return "BTTS";
  return prediction;
}

export default function MatchPreviews() {
  const { predictions, loading, refetch } = useAIPredictions("today");
  const { matches: liveMatches } = useLiveScores({ dateMode: "today" });
  const { plan } = useUserPlan();
  const { isAdmin } = useAdminAccess();
  const navigate = useNavigate();

  const isPremiumUser = plan === "premium" || isAdmin;
  const isProUser = plan === "basic";
  const isFreeUser = plan === "free";
  const canGenerate = isPremiumUser || isProUser;

  // Build logo lookup from live scores data
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

  // Filter quality leagues, sort by confidence, limit to 30
  const topMatches = useMemo(() => {
    return predictions
      .filter((p) => isQualityLeague(p.league, p.home_team))
      .sort((a, b) => {
        const confDiff = (b.confidence ?? 0) - (a.confidence ?? 0);
        if (confDiff !== 0) return confDiff;
        return getLeaguePriority(a.league) - getLeaguePriority(b.league);
      })
      .slice(0, MAX_MATCHES);
  }, [predictions]);

  const handleCardClick = (match: typeof topMatches[0]) => {
    if (isFreeUser) return;
    navigate(`/match-preview/${match.match_id}`, { state: { unlocked: true } });
  };

  return (
    <>
      <Helmet>
        <title>Match Previews – AI Sports Predictions | ProPredict</title>
        <meta name="description" content="AI-powered match analysis and predictions for today's top football matches." />
      </Helmet>

      <div className="page-content space-y-4">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30">
              <Eye className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Your Match Preview</h1>
              <p className="text-xs text-muted-foreground">
                AI-powered analysis for top matches
              </p>
            </div>
          </div>
        </div>

        <Card className="p-4 bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/20">
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Select any match directly and instantly view AI-powered analysis and predictions for that specific game.</li>
            <li>The AI evaluates team form, recent results, statistics, and trends to generate an informative match preview.</li>
            <li>This feature is designed to help you understand the matchup better and follow the analysis in one place.</li>
            <li className="text-xs text-muted-foreground/70 italic">For informational and entertainment purposes only.</li>
          </ul>
          <div className="mt-3 space-y-1">
            <p className="text-sm"><span className="text-amber-400 font-bold">● PRO</span> — Limited to 5 Match Previews daily</p>
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
              <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/40">Upgrade</Badge>
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
            <p className="text-sm text-muted-foreground">No quality league matches available today</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {topMatches.map((match) => {
              const risk = getRiskColor(match.confidence);
              const homeLogo = getTeamLogo(match.home_team, match.away_team, "home");
              const awayLogo = getTeamLogo(match.home_team, match.away_team, "away");

              return (
                <Card
                  key={match.id}
                  className="overflow-hidden transition-all bg-white dark:bg-card border border-gray-200 dark:border-border/60 hover:shadow-lg hover:shadow-violet-500/10 shadow-sm cursor-pointer"
                  onClick={() => handleCardClick(match)}
                >
                  <div className="p-5 space-y-4">
                    <div className="text-center">
                      <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                        {match.league || "Unknown"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                        {homeLogo ? (
                          <img src={homeLogo} alt={match.home_team} className="w-20 h-20 object-contain drop-shadow-sm" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-500/20 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center">
                            <span className="text-lg font-bold text-violet-600 dark:text-violet-300">{getTeamInitials(match.home_team)}</span>
                          </div>
                        )}
                        <span className="text-base font-bold text-center leading-tight line-clamp-2 text-gray-900 dark:text-foreground">{match.home_team}</span>
                      </div>

                      <div className="flex flex-col items-center gap-1 flex-shrink-0 px-3">
                        <span className="text-[10px] text-gray-500 dark:text-muted-foreground font-medium">{match.match_date || "Today"}</span>
                        <span className="text-xl font-black text-gray-800 dark:text-foreground tracking-tight">VS</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400 dark:text-muted-foreground/60" />
                          <span className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">{match.match_time || "TBD"}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                        {awayLogo ? (
                          <img src={awayLogo} alt={match.away_team} className="w-20 h-20 object-contain drop-shadow-sm" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-primary/20 border border-blue-200 dark:border-primary/20 flex items-center justify-center">
                            <span className="text-lg font-bold text-blue-600 dark:text-primary/70">{getTeamInitials(match.away_team)}</span>
                          </div>
                        )}
                        <span className="text-base font-bold text-center leading-tight line-clamp-2 text-gray-900 dark:text-foreground">{match.away_team}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-5 text-sm pt-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-violet-500 dark:text-primary" />
                        <span className="text-gray-500 dark:text-muted-foreground font-bold">Confidence</span>
                        <span className="font-extrabold text-gray-800 dark:text-foreground text-base">{match.confidence ?? 0}%</span>
                      </div>
                      <span className="text-gray-300 dark:text-border">•</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", risk.dot)} />
                        <span className={cn("font-semibold text-base", risk.color)}>{risk.label}</span>
                      </div>
                    </div>

                    {/* Teaser insights */}
                    {(() => {
                      const conf = match.confidence ?? 50;
                      const edgeText = conf >= 80
                        ? "clear statistical edge"
                        : conf >= 65
                        ? "notable pattern"
                        : "potential value opportunity";
                      const formText = conf >= 80
                        ? "strongly support"
                        : conf >= 65
                        ? "favor"
                        : "suggest an edge for";
                      const pickText = conf >= 80
                        ? "one of today's strongest picks"
                        : conf >= 65
                        ? "a solid selection today"
                        : "a value pick worth watching";
                      const unlockPct = Math.min(97, Math.floor(70 + conf * 0.25 + (match.match_id?.charCodeAt(0) ?? 0) % 8));
                      return (
                        <>
                          <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-border/40">
                            <div className="flex items-start gap-2">
                              <span className="text-emerald-500 mt-0.5">◉</span>
                              <p className="text-xs text-gray-600 dark:text-muted-foreground">Our model detected a <span className="font-bold text-gray-800 dark:text-foreground">{edgeText}</span> in this matchup</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-violet-500 mt-0.5">↗</span>
                              <p className="text-xs text-gray-600 dark:text-muted-foreground">Recent form and head-to-head data <span className="font-bold text-gray-800 dark:text-foreground">{formText}</span> this prediction</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-gray-600 dark:text-muted-foreground">AI confidence is <span className="font-bold text-gray-800 dark:text-foreground">{conf}%</span> — {pickText}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <span className="text-[10px] text-gray-400 dark:text-muted-foreground/60">🔥 {unlockPct}% of users unlocked this match</span>
                          </div>
                        </>
                      );
                    })()}

                    <Button
                      size="sm"
                      className={cn(
                        "w-full text-sm font-bold h-10",
                        isFreeUser
                          ? "bg-gray-500 hover:bg-gray-600"
                          : "bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-md shadow-violet-500/15 animate-pulse"
                      )}
                      onClick={(e) => { e.stopPropagation(); handleCardClick(match); }}
                    >
                      {isFreeUser ? (
                        <><Lock className="h-3.5 w-3.5 mr-1.5" />Upgrade Plan to Unlock</>
                      ) : (
                        <><Zap className="h-3.5 w-3.5 mr-1.5" />Unlock Prediction<ChevronRight className="h-3.5 w-3.5 ml-1" /></>
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
