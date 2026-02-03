import { useState, useEffect } from "react";
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
import { useMatchPreviewGenerator } from "@/hooks/useMatchPreviewGenerator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

const FREE_PREVIEW_LIMIT = 3;

export default function MatchPreviews() {
  const { matches, isLoading, error, refetch } = useFixtures("today");
  const { plan } = useUserPlan();
  const { isAdmin } = useAdminAccess();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const { isGenerating, analysis, generatedMatch, generate, reset } = useMatchPreviewGenerator();

  // Filter to top leagues only
  const topLeagueMatches = matches.filter((match) =>
    TOP_LEAGUES.some((league) =>
      match.league?.toLowerCase().includes(league.toLowerCase())
    )
  );

  // Check if user can generate more previews
  const isPremiumUser = plan === "basic" || plan === "premium" || isAdmin;
  const canGenerate = isPremiumUser || previewCount < FREE_PREVIEW_LIMIT;
  const remainingPreviews = FREE_PREVIEW_LIMIT - previewCount;

  const handleGenerate = async () => {
    if (!selectedMatch || !canGenerate) return;
    
    await generate(selectedMatch);
    
    if (!isPremiumUser) {
      setPreviewCount((prev) => prev + 1);
    }
  };

  const handleMatchSelect = (match: Match | null) => {
    setSelectedMatch(match);
    reset();
  };

  const leagueCount = new Set(topLeagueMatches.map((m) => m.league)).size;
  const matchCount = topLeagueMatches.length;

  return (
    <>
      <Helmet>
        <title>Match Previews | ProPredict</title>
        <meta
          name="description"
          content="Expert AI analysis and predictions for today's top football matches from Premier League, La Liga, Serie A, Bundesliga and more."
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
                <h1 className="text-lg font-bold">Match Previews</h1>
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

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-br from-violet-500/20 via-violet-500/10 to-transparent border border-violet-500/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Calendar className="h-4 w-4 text-violet-400" />
              <span className="text-lg font-bold text-violet-400">
                {format(new Date(), "dd MMM")}
              </span>
            </div>
            <span className="text-[10px] text-violet-400/70">Today</span>
          </div>
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold text-primary">{leagueCount}</span>
            </div>
            <span className="text-[10px] text-primary/70">Leagues</span>
          </div>
          <div className="bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Eye className="h-4 w-4 text-amber-400" />
              <span className="text-lg font-bold text-amber-400">{matchCount}</span>
            </div>
            <span className="text-[10px] text-amber-400/70">Matches</span>
          </div>
        </div>

        {/* Free User Limit Banner */}
        {!isPremiumUser && (
          <Card className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400" />
                <span className="text-sm">
                  <span className="font-medium text-amber-400">{remainingPreviews}</span>
                  <span className="text-muted-foreground"> free previews remaining today</span>
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/40">
                Upgrade for unlimited
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
            />

            {/* Analysis Section */}
            {(analysis || isGenerating) && generatedMatch && (
              <MatchPreviewAnalysis
                match={generatedMatch}
                analysis={analysis}
                isLoading={isGenerating}
              />
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
