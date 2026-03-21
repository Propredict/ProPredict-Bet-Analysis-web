import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2, Clock, Sparkles, TrendingUp, Lock, Zap, Shield, Activity, Target, BarChart3, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  if (!confidence) return { label: "Unknown", color: "text-gray-400", dot: "bg-gray-400" };
  if (confidence >= 80) return { label: "Low Risk", color: "text-emerald-600", dot: "bg-emerald-500" };
  if (confidence >= 65) return { label: "Medium Risk", color: "text-amber-600", dot: "bg-amber-500" };
  return { label: "High Risk", color: "text-red-600", dot: "bg-red-500" };
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

function getPredictionIcon(prediction: string | null) {
  const p = (prediction || "").toLowerCase().trim();
  if (p === "1" || p === "home") return "🏠";
  if (p === "2" || p === "away") return "✈️";
  if (p === "x" || p === "draw") return "🤝";
  if (p.includes("over")) return "⚽";
  if (p.includes("under")) return "🛡️";
  if (p.includes("btts")) return "🎯";
  return "📊";
}

export default function MatchPreviewDetail() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { plan } = useUserPlan();
  const { isAdmin } = useAdminAccess();
  const { matches: liveMatches } = useLiveScores({ dateMode: "today" });
  const { isGenerating, analysis, generatedMatch, generate } = useMatchPreviewGenerator();

  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(!!(location.state as any)?.unlocked);

  const isPremiumUser = plan === "premium" || isAdmin;
  const canGenerate = isPremiumUser || plan === "basic";

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
        <Card className="p-6 text-center bg-white border-gray-200">
          <p className="text-gray-500">Match not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{prediction.home_team} vs {prediction.away_team} – Match Preview | ProPredict</title>
      </Helmet>

      <div className="page-content space-y-5">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/match-previews")}
          className="gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Match Previews
        </Button>

        {/* Hero Match Card */}
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border/40 shadow-lg shadow-gray-200/50 dark:shadow-none overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          
          <div className="p-6 space-y-5">
            {/* League badge */}
            <div className="flex justify-center">
              <Badge className="bg-emerald-50 dark:bg-primary/20 text-emerald-700 dark:text-primary border-emerald-200 dark:border-primary/30 px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
                {prediction.league || "Unknown League"}
              </Badge>
            </div>

            {/* Teams section */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
                {homeLogo ? (
                  <img src={homeLogo} alt={prediction.home_team} className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-md" />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-primary/20 dark:to-primary/10 border border-emerald-100 dark:border-primary/20 flex items-center justify-center">
                    <span className="text-xl font-black text-emerald-700 dark:text-primary">
                      {getTeamInitials(prediction.home_team)}
                    </span>
                  </div>
                )}
                <span className="text-sm sm:text-base font-bold text-center leading-tight line-clamp-2 text-gray-900 dark:text-foreground">
                  {prediction.home_team}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1.5 flex-shrink-0 px-2">
                <span className="text-[10px] text-gray-400 dark:text-muted-foreground font-medium uppercase tracking-wider">
                  {prediction.match_date || "Today"}
                </span>
                <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-muted/30 border-2 border-gray-200 dark:border-border flex items-center justify-center">
                  <span className="text-lg font-black text-gray-700 dark:text-foreground">VS</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-muted-foreground">
                    {prediction.match_time || "TBD"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
                {awayLogo ? (
                  <img src={awayLogo} alt={prediction.away_team} className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-md" />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/20 dark:to-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center">
                    <span className="text-xl font-black text-blue-700 dark:text-blue-400">
                      {getTeamInitials(prediction.away_team)}
                    </span>
                  </div>
                )}
                <span className="text-sm sm:text-base font-bold text-center leading-tight line-clamp-2 text-gray-900 dark:text-foreground">
                  {prediction.away_team}
                </span>
              </div>
            </div>

            {/* Confidence & Risk badges */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-muted/20 rounded-full px-4 py-2 border border-gray-100 dark:border-border/40">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-gray-500 dark:text-muted-foreground">Confidence</span>
                <span className="text-base font-black text-gray-900 dark:text-foreground">{prediction.confidence ?? 0}%</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-muted/20 rounded-full px-4 py-2 border border-gray-100 dark:border-border/40">
                <span className={cn("w-2.5 h-2.5 rounded-full", risk.dot)} />
                <span className={cn("text-sm font-bold", risk.color)}>{risk.label}</span>
              </div>
            </div>

            {/* UNLOCKED: AI Prediction Hero */}
            {unlocked && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5 shadow-xl shadow-emerald-200/30 dark:shadow-emerald-900/20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-white/70" />
                      <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">AI Prediction</span>
                      <Badge className="bg-white/20 text-white border-white/30 text-[9px]">AI Generated</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getPredictionIcon(prediction.prediction)}</span>
                      <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {getPredictionLabel(prediction.prediction)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-white">{prediction.confidence}%</div>
                    <div className="text-xs text-white/60 uppercase tracking-wider">Confidence</div>
                  </div>
                </div>
              </div>
            )}

            {/* Win Probabilities - show after unlock */}
            {unlocked && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-500/20">
                  <div className="text-xs text-gray-500 dark:text-muted-foreground mb-1 truncate">{prediction.home_team}</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{prediction.home_win}%</div>
                </div>
                <div className="bg-gray-50 dark:bg-muted/20 rounded-xl p-3 text-center border border-gray-100 dark:border-border/40">
                  <div className="text-xs text-gray-500 dark:text-muted-foreground mb-1">Draw</div>
                  <div className="text-xl font-black text-gray-600 dark:text-muted-foreground">{prediction.draw}%</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-500/20">
                  <div className="text-xs text-gray-500 dark:text-muted-foreground mb-1 truncate">{prediction.away_team}</div>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400">{prediction.away_win}%</div>
                </div>
              </div>
            )}

            {/* LOCKED: CTA */}
            {!unlocked && (
              <div className="space-y-3 pt-1">
                {canGenerate ? (
                  <Button
                    size="lg"
                    className="w-full text-sm font-bold h-13 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-200/40 dark:shadow-emerald-900/30 animate-pulse rounded-xl"
                    onClick={() => setUnlocked(true)}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Unlock Prediction & Full Analysis
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="w-full text-sm font-bold h-13 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-200/40 dark:shadow-emerald-900/30 rounded-xl"
                    onClick={() => navigate("/get-premium")}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Upgrade Plan to Unlock
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Analysis content — only after unlock */}
        {unlocked && (isGenerating || analysis) && generatedMatch && (
          <div className="space-y-4">
            <MatchPreviewAnalysis
              match={generatedMatch}
              analysis={analysis}
              isLoading={isGenerating}
              prediction={prediction}
            />
            {analysis && <MatchPreviewStats match={generatedMatch} />}
          </div>
        )}
      </div>
    </>
  );
}
