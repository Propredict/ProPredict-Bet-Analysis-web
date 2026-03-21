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
import { MatchPreviewAnalysis } from "@/components/match-previews/MatchPreviewAnalysis";
import { MatchPreviewStats } from "@/components/match-previews/MatchPreviewStats";
import { useMatchPreviewGenerator } from "@/hooks/useMatchPreviewGenerator";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
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
  const [previewCount, setPreviewCount] = useState(0);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const { isGenerating, analysis, generatedMatch, generate, reset } = useMatchPreviewGenerator();
  const { maybeShowInterstitial } = useAndroidInterstitial();

  const isPremiumUser = plan === "premium" || isAdmin;
  const isProUser = plan === "basic";
  const isFreeUser = plan === "free";
  const remainingPreviews = Math.max(0, (isPremiumUser ? Infinity : isProUser ? PRO_PREVIEW_LIMIT : 0) - previewCount);
  const canGenerate = isPremiumUser || (isProUser && previewCount < PRO_PREVIEW_LIMIT);

  // Build logo lookup from live scores data
  const logoMap = useMemo(() => {
    const map: Record<string, { home: string | null; away: string | null }> = {};
    for (const m of liveMatches) {
      // Match by team names (normalized)
      const key = `${m.homeTeam.toLowerCase()}|${m.awayTeam.toLowerCase()}`;
      map[key] = { home: m.homeLogo, away: m.awayLogo };
      // Also index by individual team name
      map[m.homeTeam.toLowerCase()] = { home: m.homeLogo, away: null };
      map[m.awayTeam.toLowerCase()] = { home: null, away: m.awayLogo };
    }
    return map;
  }, [liveMatches]);

  function getTeamLogo(homeTeam: string, awayTeam: string, side: "home" | "away"): string | null {
    const matchKey = `${homeTeam.toLowerCase()}|${awayTeam.toLowerCase()}`;
    const matchEntry = logoMap[matchKey];
    if (matchEntry) return side === "home" ? matchEntry.home : matchEntry.away;
    // Fallback: lookup by individual team name
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

  const handleUnlockPreview = async (prediction: typeof topMatches[0]) => {
    if (!canGenerate) return;
    maybeShowInterstitial("match_preview");

    const mockMatch = {
      id: prediction.match_id,
      homeTeam: prediction.home_team,
      awayTeam: prediction.away_team,
      startTime: prediction.match_time || "",
      status: "upcoming" as const,
      league: prediction.league || "",
      homeScore: null,
      awayScore: null,
      minute: null,
      leagueCountry: "",
    };

    setExpandedMatchId(prediction.id);
    await generate(mockMatch);

    if (isProUser) {
      setPreviewCount((prev) => prev + 1);
    }
  };

  return (
    <>
      <Helmet>
        <title>Match Previews – AI Sports Predictions | ProPredict</title>
        <meta name="description" content="AI-powered match analysis and predictions for today's top football matches." />
      </Helmet>

      <div className="page-content space-y-4">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30">
                <Eye className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Today's AI Matches</h1>
                <p className="text-xs text-muted-foreground">
                  Top {topMatches.length} matches · Sorted by confidence
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Description Card */}
        <Card className="p-4 bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/20">
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Select any match directly and instantly view AI-powered analysis and predictions for that specific game.</li>
            <li>The AI evaluates team form, recent results, statistics, and trends to generate an informative match preview.</li>
            <li>This feature is designed to help you understand the matchup better and follow the analysis in one place.</li>
            <li className="text-xs text-muted-foreground/70 italic">For informational and entertainment purposes only.</li>
          </ul>
          <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-sm">
                <span className="font-semibold text-amber-400">PRO</span>
                <span className="text-muted-foreground"> — Limited to 5 Match Previews daily</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-fuchsia-500"></span>
              <span className="text-sm">
                <span className="font-semibold text-fuchsia-400">PREMIUM</span>
                <span className="text-muted-foreground"> — Unlimited Match Previews</span>
              </span>
            </div>
          </div>
        </Card>

        {/* Access Banner */}
        {isFreeUser && (
          <Card className="p-3 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border-red-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-400" />
                <span className="text-sm text-muted-foreground">
                  Match previews require a Pro or Premium subscription
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/40">
                Upgrade
              </Badge>
            </div>
          </Card>
        )}

        {isProUser && (
          <Card className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-400" />
                <span className="text-sm">
                  <span className="font-medium text-amber-400">{remainingPreviews}</span>
                  <span className="text-muted-foreground"> of {PRO_PREVIEW_LIMIT} previews remaining</span>
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40">
                Premium = Unlimited
              </Badge>
            </div>
          </Card>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : topMatches.length === 0 ? (
          <Card className="p-6 text-center">
            <Eye className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No quality league matches available today
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
             {topMatches.map((match) => {
              const risk = getRiskColor(match.confidence);
              const isExpanded = expandedMatchId === match.id;
              const homeLogo = getTeamLogo(match.home_team, match.away_team, "home");
              const awayLogo = getTeamLogo(match.home_team, match.away_team, "away");

              return (
                <div key={match.id} className="space-y-2">
                  <Card
                    className={cn(
                      "overflow-hidden transition-all bg-white dark:bg-card border border-gray-200 dark:border-border/60 hover:shadow-lg hover:shadow-violet-500/10 shadow-sm",
                      isExpanded && "border-violet-400 dark:border-violet-500/40 shadow-lg shadow-violet-500/10"
                    )}
                  >
                    <div className="p-5 space-y-4">
                      {/* League header */}
                      <div className="text-center">
                        <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                          {match.league || "Unknown"}
                        </span>
                      </div>

                      {/* Match announcement layout: Home - Info - Away */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Home team */}
                        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                          {homeLogo ? (
                            <img src={homeLogo} alt={match.home_team} className="w-20 h-20 object-contain drop-shadow-sm" />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-500/20 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center">
                              <span className="text-lg font-bold text-violet-600 dark:text-violet-300">
                                {getTeamInitials(match.home_team)}
                              </span>
                            </div>
                          )}
                          <span className="text-base font-bold text-center leading-tight line-clamp-2 text-gray-900 dark:text-foreground">{match.home_team}</span>
                        </div>

                        {/* Center: date, time, VS */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0 px-3">
                          <span className="text-[10px] text-gray-500 dark:text-muted-foreground font-medium">
                            {match.match_date || "Today"}
                          </span>
                          <span className="text-xl font-black text-gray-800 dark:text-foreground tracking-tight">VS</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400 dark:text-muted-foreground/60" />
                            <span className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">
                              {match.match_time || "TBD"}
                            </span>
                          </div>
                        </div>

                        {/* Away team */}
                        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                          {awayLogo ? (
                            <img src={awayLogo} alt={match.away_team} className="w-20 h-20 object-contain drop-shadow-sm" />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-primary/20 border border-blue-200 dark:border-primary/20 flex items-center justify-center">
                              <span className="text-lg font-bold text-blue-600 dark:text-primary/70">
                                {getTeamInitials(match.away_team)}
                              </span>
                            </div>
                          )}
                          <span className="text-base font-bold text-center leading-tight line-clamp-2 text-gray-900 dark:text-foreground">{match.away_team}</span>
                        </div>
                      </div>

                      {/* Confidence & Risk row */}
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

                      {/* CTA Button */}
                      <Button
                        size="sm"
                        className={cn(
                          "w-full text-sm font-bold h-10 animate-pulse",
                          isExpanded && analysis
                            ? "bg-emerald-600 hover:bg-emerald-700 animate-none"
                            : "bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-md shadow-violet-500/15"
                        )}
                        disabled={!canGenerate || (isExpanded && isGenerating)}
                        onClick={() => handleUnlockPreview(match)}
                      >
                        {isExpanded && isGenerating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Generating...
                          </>
                        ) : isExpanded && analysis ? (
                          <>
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Analysis Ready
                          </>
                        ) : isFreeUser ? (
                          <>
                            <Lock className="h-3.5 w-3.5 mr-1.5" />
                            Upgrade to Unlock
                          </>
                        ) : (
                          <>
                            <Zap className="h-3.5 w-3.5 mr-1.5" />
                            Unlock Full Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>

                  {/* Expanded Analysis */}
                  {isExpanded && (analysis || isGenerating) && generatedMatch && (
                    <div className="space-y-2 pl-2 border-l-2 border-violet-500/30">
                      <MatchPreviewAnalysis
                        match={generatedMatch}
                        analysis={analysis}
                        isLoading={isGenerating}
                      />
                      {analysis && (
                        <MatchPreviewStats match={generatedMatch} />
                      )}
                      {/* Close / collapse button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 text-sm font-semibold gap-2 border-violet-300 dark:border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                        onClick={() => { setExpandedMatchId(null); reset(); }}
                      >
                        <ChevronUp className="h-4 w-4" />
                        Close Analysis
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <AdSlot />
      </div>
    </>
  );
}
