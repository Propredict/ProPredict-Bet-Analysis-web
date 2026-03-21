import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Eye, Loader2, RefreshCw, Lock, Shield, TrendingUp, ChevronRight, Clock, Trophy, Zap, Sparkles } from "lucide-react";
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
  if (!confidence) return { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted/20" };
  if (confidence >= 80) return { label: "Low Risk", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
  if (confidence >= 65) return { label: "Medium", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
  return { label: "High Risk", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" };
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

  // Filter quality leagues, sort by confidence, limit to 30
  const topMatches = useMemo(() => {
    return predictions
      .filter((p) => isQualityLeague(p.league, p.home_team))
      .sort((a, b) => {
        // Primary: highest confidence first (most low-risk matches on top)
        const confDiff = (b.confidence ?? 0) - (a.confidence ?? 0);
        if (confDiff !== 0) return confDiff;
        // Secondary: league priority as tiebreaker
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
              const predLabel = getPredictionLabel(match.prediction);
              const isExpanded = expandedMatchId === match.id;

              return (
                <div key={match.id} className="space-y-2">
                  <Card
                    className={cn(
                      "overflow-hidden transition-all hover:border-violet-500/40",
                      isExpanded && "border-violet-500/50"
                    )}
                  >
                    {/* Top accent line */}
                    <div className={cn(
                      "h-0.5",
                      (match.confidence ?? 0) >= 80
                        ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500"
                        : (match.confidence ?? 0) >= 65
                          ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"
                          : "bg-gradient-to-r from-red-500 via-red-400 to-red-500"
                    )} />

                    <div className="p-4">
                      {/* League & Time header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="h-3 w-3 text-violet-400" />
                          <span className="text-[11px] font-medium text-violet-400 uppercase tracking-wider">
                            {match.league || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {match.match_time || "TBD"}
                          </span>
                        </div>
                      </div>

                      {/* Centered Teams */}
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="flex-1 text-right">
                          <span className="text-sm font-bold">{match.home_team}</span>
                        </div>
                        <div className="flex-shrink-0 px-3 py-1 rounded-full bg-muted/30 border border-border/50">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">vs</span>
                        </div>
                        <div className="flex-1 text-left">
                          <span className="text-sm font-bold">{match.away_team}</span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-border/40 mb-4" />

                      {/* Prediction Details Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {/* Prediction */}
                        <div className="text-center p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingUp className="h-3 w-3 text-violet-400" />
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Prediction</span>
                          <span className="text-xs font-bold text-violet-400">{predLabel}</span>
                        </div>

                        {/* Predicted Score */}
                        <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Target className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Score</span>
                          <span className="text-xs font-bold text-primary">{match.predicted_score || "—"}</span>
                        </div>

                        {/* Confidence */}
                        <div className={cn("text-center p-2 rounded-lg border", risk.bg)}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Shield className="h-3 w-3" />
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">
                            {risk.label}
                          </span>
                          <span className={cn("text-xs font-bold", risk.color)}>{match.confidence ?? 0}%</span>
                        </div>
                      </div>

                      {/* Confidence Bar */}
                      <div className="mb-4">
                        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              (match.confidence ?? 0) >= 80
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                : (match.confidence ?? 0) >= 65
                                  ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                  : "bg-gradient-to-r from-red-500 to-red-400"
                            )}
                            style={{ width: `${match.confidence ?? 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Unlock button */}
                      <Button
                        size="sm"
                        className={cn(
                          "w-full text-xs font-semibold",
                          isExpanded && analysis
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-500 hover:from-violet-700 hover:via-violet-600 hover:to-fuchsia-600 shadow-lg shadow-violet-500/20"
                        )}
                        disabled={!canGenerate || (isExpanded && isGenerating)}
                        onClick={() => handleUnlockPreview(match)}
                      >
                        {isExpanded && isGenerating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Generating Preview...
                          </>
                        ) : isExpanded && analysis ? (
                          <>
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Preview Ready
                          </>
                        ) : isFreeUser ? (
                          <>
                            <Lock className="h-3.5 w-3.5 mr-1.5" />
                            Upgrade to Unlock
                          </>
                        ) : (
                          <>
                            <Zap className="h-3.5 w-3.5 mr-1.5" />
                            Unlock Preview
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
