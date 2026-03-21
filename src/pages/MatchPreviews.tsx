import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Eye, Loader2, RefreshCw, Lock, Shield, TrendingUp, ChevronRight } from "lucide-react";
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
  // England
  "Premier League": 1,
  "Championship": 2,
  "League One": 3,
  "League Two": 4,
  // Scotland
  "Premiership": 5,
  "Bundesliga": 10,
  "2. Bundesliga": 11,
  // Italy
  "Serie A": 15,
  "Serie B": 16,
  // Spain
  "La Liga": 20,
  "Segunda División": 21,
  // France
  "Ligue 1": 25,
  "Ligue 2": 26,
  // Netherlands
  "Eredivisie": 30,
  "Eerste Divisie": 31,
  // Portugal
  "Primeira Liga": 35,
  // Belgium
  "Challenger Pro League": 40,
  // Turkey
  "Super Lig": 45,
  // Poland
  "Ekstraklasa": 50,
  // Argentina
  "Liga Profesional Argentina": 55,
};

const QUALITY_SET = new Set(Object.keys(LEAGUE_PRIORITY).map((l) => l.toLowerCase()));

function isQualityLeague(league: string | null): boolean {
  if (!league) return false;
  return QUALITY_SET.has(league.toLowerCase());
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
      .filter((p) => isQualityLeague(p.league))
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
                      "p-3 transition-all hover:border-violet-500/40",
                      isExpanded && "border-violet-500/50 bg-violet-500/5"
                    )}
                  >
                    {/* League */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                        {match.league || "Unknown League"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {match.match_time || ""}
                      </span>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold truncate flex-1">
                        {match.home_team} vs {match.away_team}
                      </h3>
                    </div>

                    {/* Prediction row */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/30 text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {predLabel}
                      </Badge>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                        {match.confidence ?? 0}%
                      </Badge>
                      <Badge variant="outline" className={cn("text-xs border", risk.bg, risk.color)}>
                        <Shield className="h-3 w-3 mr-1" />
                        {risk.label}
                      </Badge>
                    </div>

                    {/* Unlock button */}
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-xs"
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
                          Preview Generated
                        </>
                      ) : isFreeUser ? (
                        <>
                          <Lock className="h-3.5 w-3.5 mr-1.5" />
                          Upgrade to Unlock
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
                          Unlock Preview
                        </>
                      )}
                    </Button>
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
