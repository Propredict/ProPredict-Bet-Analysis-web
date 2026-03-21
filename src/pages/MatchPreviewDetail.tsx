import { useEffect, useState, useMemo } from "react";
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

interface AIPick {
  emoji: string;
  label: string;
  confidence: number;
  color: string;
}

function deriveAIPicks(pred: any): AIPick[] {
  const allPicks: AIPick[] = [];
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const draw = pred.draw ?? 0;
  const homeGoals = pred.last_home_goals ?? 0;
  const awayGoals = pred.last_away_goals ?? 0;
  const totalGoalsAvg = homeGoals + awayGoals;

  const pick = (label: string, conf: number) => {
    conf = Math.max(30, Math.min(95, Math.round(conf)));
    const emoji = conf >= 75 ? "🟢" : conf >= 55 ? "🟡" : "⚠️";
    const color = conf >= 75 ? "text-emerald-600" : conf >= 55 ? "text-amber-600" : "text-red-500";
    allPicks.push({ emoji, label, confidence: conf, color });
  };

  // === 1X2 ===
  pick(`Home Win — ${pred.home_team}`, homeWin);
  pick("Draw", draw);
  pick(`Away Win — ${pred.away_team}`, awayWin);

  // === Double Chance ===
  pick(`1X (${pred.home_team} or Draw)`, homeWin + draw);
  pick(`X2 (Draw or ${pred.away_team})`, draw + awayWin);
  pick(`12 (No Draw)`, homeWin + awayWin);

  // === Over/Under Goals ===
  pick("Over 0.5 Goals", 55 + totalGoalsAvg * 15);
  pick("Under 0.5 Goals", 95 - totalGoalsAvg * 15);
  pick("Over 1.5 Goals", 40 + totalGoalsAvg * 12);
  pick("Under 1.5 Goals", 70 - totalGoalsAvg * 12);
  pick("Over 2.5 Goals", 25 + totalGoalsAvg * 10);
  pick("Under 2.5 Goals", 85 - totalGoalsAvg * 10);
  pick("Over 3.5 Goals", 15 + totalGoalsAvg * 8);
  pick("Under 3.5 Goals", 90 - totalGoalsAvg * 8);
  pick("Over 4.5 Goals", 8 + totalGoalsAvg * 6);
  pick("Under 4.5 Goals", 93 - totalGoalsAvg * 6);

  // === BTTS ===
  const bttsYesConf = 35 + Math.min(homeGoals, awayGoals) * 18 + (homeGoals >= 1 && awayGoals >= 1 ? 15 : 0);
  const bttsNoConf = 35 + (2.5 - Math.min(homeGoals, awayGoals)) * 15 + (homeGoals < 0.8 || awayGoals < 0.8 ? 15 : 0);
  pick("BTTS — Yes", bttsYesConf);
  pick("BTTS — No", bttsNoConf);

  // === Draw No Bet ===
  pick(`Draw No Bet — ${pred.home_team}`, homeWin + draw * 0.3);
  pick(`Draw No Bet — ${pred.away_team}`, awayWin + draw * 0.3);

  // === Correct Score (top pick from predicted_score) ===
  if (pred.predicted_score) {
    pick(`Correct Score ${pred.predicted_score}`, pred.confidence * 0.45);
  }

  // === Half-Time/Full-Time combos ===
  if (homeWin >= 55) pick(`HT/FT — ${pred.home_team}/${pred.home_team}`, homeWin * 0.7);
  if (awayWin >= 55) pick(`HT/FT — ${pred.away_team}/${pred.away_team}`, awayWin * 0.7);
  if (draw >= 30 && homeWin >= 40) pick(`HT/FT — Draw/${pred.home_team}`, draw * 0.5 + homeWin * 0.3);
  if (draw >= 30 && awayWin >= 40) pick(`HT/FT — Draw/${pred.away_team}`, draw * 0.5 + awayWin * 0.3);

  // === Clean Sheet ===
  const homeCS = Math.max(30, 70 - awayGoals * 20);
  const awayCS = Math.max(30, 70 - homeGoals * 20);
  pick(`${pred.home_team} Clean Sheet`, homeCS);
  pick(`${pred.away_team} Clean Sheet`, awayCS);

  // === Win to Nil ===
  pick(`${pred.home_team} Win to Nil`, homeWin * 0.6 * (1 - awayGoals * 0.15));
  pick(`${pred.away_team} Win to Nil`, awayWin * 0.6 * (1 - homeGoals * 0.15));

  // Sort by confidence — AI recommends the best picks first
  return allPicks.filter(p => p.confidence >= 70).sort((a, b) => b.confidence - a.confidence);
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

            {/* 🎯 AI Picks */}
            {unlocked && (
              <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border/40 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gray-50 dark:bg-muted/20 border-gray-100 dark:border-border/30">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-bold text-sm text-gray-800 dark:text-foreground">🎯 AI Picks</h3>
                  <Badge className="ml-auto bg-emerald-50 dark:bg-primary/20 text-emerald-700 dark:text-primary border-emerald-200 dark:border-primary/30 text-[9px]">
                    Multi-Market
                  </Badge>
                </div>
                <div className="p-3 space-y-2">
                  {deriveAIPicks(prediction).map((pick, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-muted/10 border border-gray-100 dark:border-border/20"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{pick.emoji}</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-foreground">{pick.label}</span>
                      </div>
                      <span className={cn("text-sm font-black", pick.color)}>{pick.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
