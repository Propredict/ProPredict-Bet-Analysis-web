import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2, Clock, Sparkles, TrendingUp, Lock, Zap, Users, Eye, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLiveScores } from "@/hooks/useLiveScores";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { MatchPreviewAnalysis } from "@/components/match-previews/MatchPreviewAnalysis";
import { MatchPreviewStats } from "@/components/match-previews/MatchPreviewStats";
import { useMatchPreviewGenerator } from "@/hooks/useMatchPreviewGenerator";
import { cn } from "@/lib/utils";
import type { Match } from "@/hooks/useLiveScores";

function getTeamInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
}

function getRiskColor(confidence: number | null) {
  if (!confidence) return { label: "Unknown", color: "text-muted-foreground", dot: "bg-muted-foreground" };
  if (confidence >= 80) return { label: "Low Risk", color: "text-emerald-500", dot: "bg-emerald-500" };
  if (confidence >= 65) return { label: "Medium Risk", color: "text-amber-500", dot: "bg-amber-500" };
  return { label: "High Risk", color: "text-red-500", dot: "bg-red-500" };
}

function getPredictionLabel(prediction: string | null): string {
  if (!prediction) return "—";
  const p = prediction.toLowerCase().trim();
  if (p === "1" || p === "home") return "Home Win";
  if (p === "x" || p === "draw") return "Draw";
  if (p === "2" || p === "away") return "Away Win";
  if (p.includes("over")) return "Over 2.5 Goals";
  if (p.includes("under")) return "Under 2.5 Goals";
  if (p.includes("btts")) return "Both Teams to Score";
  return prediction;
}

export default function MatchPreviewDetail() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { plan } = useUserPlan();
  const { isAdmin } = useAdminAccess();
  const { matches: liveMatches } = useLiveScores({ dateMode: "today" });
  const { isGenerating, analysis, generatedMatch, generate } = useMatchPreviewGenerator();

  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  const isPremiumUser = plan === "premium" || isAdmin;
  const canGenerate = isPremiumUser || plan === "basic";

  // Fetch prediction data
  useEffect(() => {
    if (!matchId) return;

    async function fetchPrediction() {
      setLoading(true);
      const { data } = await supabase
        .from("ai_predictions")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle();

      if (!data) {
        // Try by id
        const { data: byId } = await supabase
          .from("ai_predictions")
          .select("*")
          .eq("id", matchId)
          .maybeSingle();
        setPrediction(byId);
      } else {
        setPrediction(data);
      }
      setLoading(false);
    }

    fetchPrediction();
  }, [matchId]);

  // Generate analysis only after unlock
  useEffect(() => {
    if (!prediction || !unlocked || analysis || isGenerating) return;
    if (!canGenerate) return;

    const lm = liveMatches.find(
      m => m.homeTeam === prediction.home_team && m.awayTeam === prediction.away_team
    );

    const mockMatch: Match = {
      id: prediction.match_id,
      homeTeam: prediction.home_team,
      awayTeam: prediction.away_team,
      homeTeamId: 0,
      awayTeamId: 0,
      startTime: prediction.match_time || "",
      status: "upcoming" as const,
      league: prediction.league || "",
      homeScore: null,
      awayScore: null,
      minute: null,
      leagueCountry: "",
      homeLogo: lm?.homeLogo || null,
      awayLogo: lm?.awayLogo || null,
      leagueLogo: lm?.leagueLogo || null,
    };

    generate(mockMatch);
  }, [prediction, liveMatches, unlocked, analysis, isGenerating, canGenerate, generate]);

  // Get logos
  const liveMatch = prediction
    ? liveMatches.find(m => m.homeTeam === prediction.home_team && m.awayTeam === prediction.away_team)
    : null;
  const homeLogo = liveMatch?.homeLogo || null;
  const awayLogo = liveMatch?.awayLogo || null;
  const risk = prediction ? getRiskColor(prediction.confidence) : getRiskColor(null);

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="page-content space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/match-previews")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Match Previews
        </Button>
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Match not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{prediction.home_team} vs {prediction.away_team} – Match Preview | ProPredict</title>
      </Helmet>

      <div className="page-content space-y-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/match-previews")}
          className="gap-2 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Match Previews
        </Button>

        {/* Match card header */}
        <Card className="overflow-hidden bg-white dark:bg-card border border-gray-200 dark:border-border/60 shadow-sm">
          <div className="p-5 space-y-4">
            {/* League */}
            <div className="text-center">
              <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                {prediction.league || "Unknown"}
              </span>
            </div>

            {/* Teams */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {homeLogo ? (
                  <img src={homeLogo} alt={prediction.home_team} className="w-20 h-20 object-contain drop-shadow-sm" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-500/20 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-violet-600 dark:text-violet-300">
                      {getTeamInitials(prediction.home_team)}
                    </span>
                  </div>
                )}
                <span className="text-base font-bold text-center leading-tight line-clamp-2 text-gray-900 dark:text-foreground">
                  {prediction.home_team}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 flex-shrink-0 px-3">
                <span className="text-[10px] text-gray-500 dark:text-muted-foreground font-medium">
                  {prediction.match_date || "Today"}
                </span>
                <span className="text-xl font-black text-gray-800 dark:text-foreground tracking-tight">VS</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-gray-400 dark:text-muted-foreground/60" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">
                    {prediction.match_time || "TBD"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {awayLogo ? (
                  <img src={awayLogo} alt={prediction.away_team} className="w-20 h-20 object-contain drop-shadow-sm" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-primary/20 border border-blue-200 dark:border-primary/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600 dark:text-primary/70">
                      {getTeamInitials(prediction.away_team)}
                    </span>
                  </div>
                )}
                <span className="text-base font-bold text-center leading-tight line-clamp-2 text-gray-900 dark:text-foreground">
                  {prediction.away_team}
                </span>
              </div>
            </div>

            {/* AI Prediction — hero banner */}
            <div className="text-center py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-500/20">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-white/80" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">AI Prediction</span>
              </div>
              <span className="text-2xl font-black text-white tracking-tight">
                {getPredictionLabel(prediction.prediction)}
              </span>
            </div>

            {/* Confidence & Risk */}
            <div className="flex items-center justify-center gap-5 text-sm pt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500 dark:text-primary" />
                <span className="text-gray-500 dark:text-muted-foreground font-bold">Confidence</span>
                <span className="font-extrabold text-gray-800 dark:text-foreground text-base">{prediction.confidence ?? 0}%</span>
              </div>
              <span className="text-gray-300 dark:text-border">•</span>
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", risk.dot)} />
                <span className={cn("font-semibold text-base", risk.color)}>{risk.label}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Analysis content */}
        {(isGenerating || analysis) && generatedMatch && (
          <div className="space-y-2">
            <MatchPreviewAnalysis
              match={generatedMatch}
              analysis={analysis}
              isLoading={isGenerating}
            />
            {analysis && <MatchPreviewStats match={generatedMatch} />}
          </div>
        )}

        {!canGenerate && (
          <Card className="p-4 text-center bg-gradient-to-r from-red-500/10 to-transparent border-red-500/30">
            <p className="text-sm text-muted-foreground">
              Match previews require a Pro or Premium subscription.
            </p>
            <Button
              size="sm"
              className="mt-3 bg-gradient-to-r from-violet-600 to-fuchsia-500"
              onClick={() => navigate("/get-premium")}
            >
              Upgrade Plan to Unlock
            </Button>
          </Card>
        )}
      </div>
    </>
  );
}
