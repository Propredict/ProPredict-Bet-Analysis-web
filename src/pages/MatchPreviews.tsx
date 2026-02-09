import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Eye, Calendar, Trophy, Loader2, RefreshCw, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFixtures, type Match } from "@/hooks/useFixtures";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { MatchPreviewSelector } from "@/components/match-previews/MatchPreviewSelector";
import { MatchPreviewAnalysis } from "@/components/match-previews/MatchPreviewAnalysis";
import { MatchPreviewStats } from "@/components/match-previews/MatchPreviewStats";
import { useMatchPreviewGenerator } from "@/hooks/useMatchPreviewGenerator";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";

// Top leagues to display
const TOP_LEAGUES = [
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Eredivisie",
  "Jupiler Pro League",
  "Primeira Liga",
  "Champions League",
  "Europa League",
  "Conference League",
];

const PRO_PREVIEW_LIMIT = 5;

export default function MatchPreviews() {
  // Fetch both today and tomorrow matches
  const { matches: todayMatches, isLoading: loadingToday, error: errorToday, refetch: refetchToday } = useFixtures("today");
  const { matches: tomorrowMatches, isLoading: loadingTomorrow, error: errorTomorrow, refetch: refetchTomorrow } = useFixtures("tomorrow");
  
  const { plan } = useUserPlan();
  const { isAdmin } = useAdminAccess();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const { isGenerating, analysis, generatedMatch, generate, reset } = useMatchPreviewGenerator();
  const { maybeShowInterstitial } = useAndroidInterstitial();

  const isLoading = loadingToday || loadingTomorrow;
  const error = errorToday || errorTomorrow;
  
  const refetch = () => {
    refetchToday();
    refetchTomorrow();
  };

  // Combine and filter matches from both days to top leagues only
  const topLeagueMatches = useMemo(() => {
    const allMatches = [...todayMatches, ...tomorrowMatches];
    return allMatches.filter((match) =>
      TOP_LEAGUES.some((league) =>
        match.league?.toLowerCase().includes(league.toLowerCase())
      )
    );
  }, [todayMatches, tomorrowMatches]);
  
  const todayCount = todayMatches.filter((match) =>
    TOP_LEAGUES.some((league) => match.league?.toLowerCase().includes(league.toLowerCase()))
  ).length;
  
  const tomorrowCount = tomorrowMatches.filter((match) =>
    TOP_LEAGUES.some((league) => match.league?.toLowerCase().includes(league.toLowerCase()))
  ).length;

  // Access rules: Free = 0, Pro (basic) = 5, Premium = unlimited
  const isPremiumUser = plan === "premium" || isAdmin;
  const isProUser = plan === "basic";
  const isFreeUser = plan === "free";
  
  // Calculate remaining previews and access
  const getPreviewLimit = () => {
    if (isPremiumUser) return Infinity;
    if (isProUser) return PRO_PREVIEW_LIMIT;
    return 0; // Free users
  };
  
  const previewLimit = getPreviewLimit();
  const remainingPreviews = Math.max(0, previewLimit - previewCount);
  const canGenerate = isPremiumUser || (isProUser && previewCount < PRO_PREVIEW_LIMIT);

  const handleGenerate = async () => {
    if (!selectedMatch || !canGenerate) return;
    
    // Android only: show interstitial on match preview generation (if not already shown this session)
    maybeShowInterstitial("match_preview");
    
    await generate(selectedMatch);
    
    // Only track count for Pro users (Premium is unlimited, Free can't generate)
    if (isProUser) {
      setPreviewCount((prev) => prev + 1);
    }
  };

  const handleMatchSelect = (match: Match | null) => {
    setSelectedMatch(match);
    reset();
  };

  const leagueCount = new Set(topLeagueMatches.map((m) => m.league)).size;
  const matchCount = topLeagueMatches.length;
  const tomorrow = addDays(new Date(), 1);

  return (
    <>
      <Helmet>
        <title>Match Previews – AI Sports Predictions | ProPredict</title>
        <meta
          name="description"
          content="AI-powered match analysis and predictions for today's top football matches. For informational and entertainment purposes only."
        />
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
                <h1 className="text-lg font-bold">Your Match Preview</h1>
                <p className="text-xs text-muted-foreground">
                  AI-powered analysis for top matches
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="h-8"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Description Card */}
        <Card className="p-4 bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/20">
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>
              Select any match directly and instantly view AI-powered analysis and predictions for that specific game.
            </li>
            <li>
              The AI evaluates team form, recent results, statistics, and trends to generate an informative match preview.
            </li>
            <li>
              This feature is designed to help you understand the matchup better and follow the analysis in one place.
            </li>
            <li className="text-xs text-muted-foreground/70 italic">
              For informational and entertainment purposes only.
            </li>
          </ul>
          
          {/* Access Tiers */}
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

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gradient-to-br from-violet-500/20 via-violet-500/10 to-transparent border border-violet-500/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-sm font-bold text-violet-400">{todayCount}</span>
            </div>
            <span className="text-[10px] text-violet-400/70">Today</span>
          </div>
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-bold text-primary">{tomorrowCount}</span>
            </div>
            <span className="text-[10px] text-primary/70">Tomorrow</span>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">{leagueCount}</span>
            </div>
            <span className="text-[10px] text-emerald-400/70">Leagues</span>
          </div>
          <div className="bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Eye className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">{matchCount}</span>
            </div>
            <span className="text-[10px] text-amber-400/70">Total</span>
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
                Upgrade to Pro
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
                  <span className="text-muted-foreground"> of {PRO_PREVIEW_LIMIT} previews remaining today</span>
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40">
                Premium = Unlimited
              </Badge>
            </div>
          </Card>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
              Try Again
            </Button>
          </Card>
        ) : matchCount === 0 ? (
          <Card className="p-6 text-center">
            <Eye className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No top league matches scheduled for today
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Match Selector */}
            <MatchPreviewSelector
              matches={topLeagueMatches}
              selectedMatch={selectedMatch}
              onMatchSelect={handleMatchSelect}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              canGenerate={canGenerate}
              isFreeUser={isFreeUser}
              isProUser={isProUser}
              remainingPreviews={remainingPreviews}
            />

            {/* Analysis Section */}
            {(analysis || isGenerating) && generatedMatch && (
              <>
                <MatchPreviewAnalysis
                  match={generatedMatch}
                  analysis={analysis}
                  isLoading={isGenerating}
                />
                
                {/* Match Stats Tabs - H2H, Stats, Lineups, Events */}
                {analysis && (
                  <MatchPreviewStats match={generatedMatch} />
                )}
              </>
            )}

            {/* Empty state when no match selected */}
            {!selectedMatch && !analysis && (
              <Card className="p-8 text-center border-dashed">
                <Eye className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-medium text-muted-foreground mb-1">
                  Select a match to preview
                </h3>
                <p className="text-xs text-muted-foreground/70">
                  Choose a league and match above, then generate AI analysis
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
