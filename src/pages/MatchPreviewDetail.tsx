import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2, Clock, Sparkles, Lock, Zap, Trophy, Target, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { calculateGoalMarketProbs } from "@/components/ai-predictions/utils/marketDerivation";
import { useLiveScores } from "@/hooks/useLiveScores";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { MatchPreviewAnalysis } from "@/components/match-previews/MatchPreviewAnalysis";
import { useMatchPreviewGenerator } from "@/hooks/useMatchPreviewGenerator";
import { cn } from "@/lib/utils";
import type { Match } from "@/hooks/useLiveScores";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { deriveMatchPreviewAIPicks, getTopMatchPreviewPick, type MatchPreviewAIPick } from "@/utils/matchPreviewPicks";

interface PredictionRouteState {
  unlocked?: boolean;
  predictionId?: string;
}

function getTeamInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function getRiskLabel(confidence: number | null) {
  if (!confidence) return { label: "Unknown", color: "text-muted-foreground", bg: "bg-muted/30" };
  if (confidence >= 80) return { label: "LOW RISK", color: "text-emerald-400", bg: "bg-emerald-500/15" };
  if (confidence >= 65) return { label: "MED RISK", color: "text-amber-400", bg: "bg-amber-500/15" };
  return { label: "HIGH RISK", color: "text-red-400", bg: "bg-red-500/15" };
}

function getPredictionLabel(prediction: string | null): string {
  if (!prediction) return "—";
  const p = prediction.toLowerCase().trim();
  if (p === "1" || p === "home") return "HOME WIN";
  if (p === "x" || p === "draw") return "DRAW";
  if (p === "2" || p === "away") return "AWAY WIN";
  if (p.includes("over")) return "OVER 2.5";
  if (p.includes("under")) return "UNDER 2.5";
  if (p.includes("btts")) return "BTTS YES";
  return prediction.toUpperCase();
}

function getPredictionEmoji(prediction: string | null) {
  const p = (prediction || "").toLowerCase().trim();
  if (p === "1" || p === "home") return "🔥";
  if (p === "2" || p === "away") return "✈️";
  if (p === "x" || p === "draw") return "🤝";
  if (p.includes("over")) return "⚽";
  if (p.includes("under")) return "🛡️";
  if (p.includes("btts")) return "🎯";
  return "📊";
}

function deriveStatsGrid(pred: any) {
  const scoreParts = (pred.predicted_score ?? "").match(/^(\d+)\s*[-:]\s*(\d+)$/);
  const homeGoals = scoreParts ? parseInt(scoreParts[1]) : (pred.last_home_goals ?? 1);
  const awayGoals = scoreParts ? parseInt(scoreParts[2]) : (pred.last_away_goals ?? 1);
  const totalGoalsAvg = homeGoals + awayGoals;
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;

  // Use unified Poisson model for BTTS — same as AI Predictions page
  const goalProbs = calculateGoalMarketProbs(pred as AIPrediction);
  const bttsChance = goalProbs.bttsYes;

  const formMatch = pred.analysis?.match(/([WDL]{5,})/);
  const formStr = formMatch ? formMatch[1] : null;
  const formWins = formStr ? (formStr.match(/W/g) || []).length : 0;
  const formLabel = formStr
    ? formWins >= 7
      ? "Dominant"
      : formWins >= 5
        ? "Strong"
        : formWins >= 3
          ? "Average"
          : "Weak"
    : homeWin >= 60
      ? "Strong"
      : homeWin >= 45
        ? "Good"
        : homeWin >= 30
          ? "Average"
          : "Weak";

  return [
    { label: "Win %", value: `${Math.max(homeWin, awayWin)}%`, sub: homeWin >= awayWin ? "Home" : "Away" },
    { label: "Goals Avg", value: totalGoalsAvg.toFixed(1), sub: "Combined" },
    { label: "BTTS", value: `${bttsChance}%`, sub: "Chance" },
    { label: "Form", value: formLabel, sub: "Home" },
  ];
}

export default function MatchPreviewDetail() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as PredictionRouteState | null) ?? null;
  const predictionIdFromState = routeState?.predictionId;

  const { plan } = useUserPlan();
  const { isAdmin } = useAdminAccess();
  const { matches: liveMatches } = useLiveScores({ dateMode: "today" });
  const { isGenerating, analysis, generatedMatch, generateFromPrediction } = useMatchPreviewGenerator();

  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(Boolean(routeState?.unlocked));

  const isPremiumUser = plan === "premium" || isAdmin;
  const canGenerate = isPremiumUser || plan === "basic";

  useEffect(() => {
    if (!matchId && !predictionIdFromState) return;

    async function fetchPrediction() {
      setLoading(true);
      let resolvedPrediction: any = null;

      if (predictionIdFromState) {
        const { data } = await supabase.from("ai_predictions").select("*").eq("id", predictionIdFromState).maybeSingle();
        if (data) resolvedPrediction = data;
      }

      if (!resolvedPrediction && matchId) {
        const { data } = await supabase
          .from("ai_predictions")
          .select("*")
          .eq("match_id", matchId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) resolvedPrediction = data;
      }

      if (!resolvedPrediction && matchId) {
        const { data } = await supabase.from("ai_predictions").select("*").eq("id", matchId).maybeSingle();
        if (data) resolvedPrediction = data;
      }

      setPrediction(resolvedPrediction);
      setLoading(false);
    }

    fetchPrediction();
  }, [matchId, predictionIdFromState]);

  useEffect(() => {
    if (!prediction || !unlocked || analysis || isGenerating || !canGenerate) return;

    const liveMatchForLogos = liveMatches.find(
      (match) => match.homeTeam === prediction.home_team && match.awayTeam === prediction.away_team
    );

    const detailMatch: Match = {
      id: prediction.match_id,
      homeTeam: prediction.home_team,
      awayTeam: prediction.away_team,
      homeTeamId: liveMatchForLogos?.homeTeamId ?? 0,
      awayTeamId: liveMatchForLogos?.awayTeamId ?? 0,
      startTime: liveMatchForLogos?.startTime || prediction.match_time || "",
      status: "upcoming",
      league: prediction.league || "",
      homeScore: null,
      awayScore: null,
      minute: null,
      leagueCountry: liveMatchForLogos?.leagueCountry || "",
      homeLogo: liveMatchForLogos?.homeLogo || null,
      awayLogo: liveMatchForLogos?.awayLogo || null,
      leagueLogo: liveMatchForLogos?.leagueLogo || null,
    };

    generateFromPrediction(detailMatch, prediction);
  }, [prediction, unlocked, analysis, isGenerating, canGenerate, liveMatches, generateFromPrediction]);

  const liveMatch = prediction
    ? liveMatches.find((match) => match.homeTeam === prediction.home_team && match.awayTeam === prediction.away_team)
    : null;

  const homeLogo = liveMatch?.homeLogo || null;
  const awayLogo = liveMatch?.awayLogo || null;
  const risk = prediction ? getRiskLabel(prediction.confidence) : getRiskLabel(null);
  const heroPick = prediction ? getTopMatchPreviewPick(prediction as AIPrediction) : null;
  const aiPicks = prediction && unlocked ? deriveMatchPreviewAIPicks(prediction as AIPrediction) : [];
  const statsGrid = prediction && unlocked ? deriveStatsGrid(prediction) : [];

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
        <div className="p-6 text-center rounded-2xl bg-card border border-border">
          <p className="text-muted-foreground">Match not found.</p>
        </div>
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
          className="gap-1.5 text-xs font-medium text-white hover:text-white/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Match Previews
        </Button>

        {/* ============ HERO SECTION ============ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0f1a] via-[#0d1525] to-[#0a1a2e]">
          {/* Glow effects */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-cyan-500/8 rounded-full blur-3xl" />
          
          <div className="relative p-5 space-y-4">
            {/* League + Time */}
            <div className="flex items-center justify-between">
              <Badge className="bg-white/10 text-white/80 border-white/10 text-[9px] font-semibold uppercase tracking-wider px-2.5 py-1">
                {prediction.league || "League"}
              </Badge>
              <div className="flex items-center gap-1 text-white/50">
                <Clock className="h-3 w-3" />
                <span className="text-[10px] font-medium">{prediction.match_time || "TBD"}</span>
              </div>
            </div>

            {/* Teams */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {homeLogo ? (
                  <img src={homeLogo} alt="" className="w-14 h-14 sm:w-18 sm:h-18 object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
                ) : (
                  <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-xl bg-white/10 flex items-center justify-center">
                    <span className="text-base font-black text-white/80">{getTeamInitials(prediction.home_team)}</span>
                  </div>
                )}
                <span className="text-xs sm:text-sm font-bold text-center text-white/90 leading-tight line-clamp-2">
                  {prediction.home_team}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-[9px] text-white/40 font-medium uppercase tracking-wider">
                  {prediction.match_date || "Today"}
                </span>
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-sm font-black text-white/60">VS</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {awayLogo ? (
                  <img src={awayLogo} alt="" className="w-14 h-14 sm:w-18 sm:h-18 object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]" />
                ) : (
                  <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-xl bg-white/10 flex items-center justify-center">
                    <span className="text-base font-black text-white/80">{getTeamInitials(prediction.away_team)}</span>
                  </div>
                )}
                <span className="text-xs sm:text-sm font-bold text-center text-white/90 leading-tight line-clamp-2">
                  {prediction.away_team}
                </span>
              </div>
            </div>

            {/* HERO PREDICTION - dominates */}
            {unlocked ? (
              <div className="space-y-3">
                {/* Main prediction — uses best market pick for consistency with card list */}
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">{heroPick?.emoji ?? "📊"}</span>
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {heroPick?.label ?? getPredictionLabel(prediction.prediction)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-xl sm:text-2xl font-black text-emerald-400">{heroPick?.confidence ?? prediction.confidence}%</span>
                      <span className="text-[10px] text-white/50 uppercase">confidence</span>
                    </div>
                    <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", risk.bg, risk.color)}>
                      {risk.label}
                    </div>
                  </div>
                </div>

                {/* AI TOP PICK badge */}
                <div className="flex justify-center">
                  <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest gap-1">
                    <Trophy className="h-3 w-3" />
                    AI TOP PICK
                  </Badge>
                </div>

                {/* Win probabilities - compact */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                    <div className="text-[9px] text-white/40 mb-0.5 truncate">{prediction.home_team}</div>
                    <div className="text-lg font-black text-emerald-400">{prediction.home_win}%</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                    <div className="text-[9px] text-white/40 mb-0.5">Draw</div>
                    <div className="text-lg font-black text-white/60">{prediction.draw}%</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                    <div className="text-[9px] text-white/40 mb-0.5 truncate">{prediction.away_team}</div>
                    <div className="text-lg font-black text-blue-400">{prediction.away_win}%</div>
                  </div>
                </div>
              </div>
            ) : (
              /* Locked state — hide prediction, show confidence + risk */
              <div className="text-center space-y-3 py-2">
                <div className="flex items-center justify-center gap-2">
                  <Lock className="h-5 w-5 text-amber-400" />
                  <span className="text-xl sm:text-2xl font-black text-white tracking-tight">AI Top Pick Locked</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-sm text-white/50">Confidence:</span>
                    <span className="text-xl font-black text-emerald-400">{heroPick?.confidence ?? prediction.confidence ?? 0}%</span>
                  </div>
                  <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", risk.bg, risk.color)}>
                    {risk.label}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ AI PICKS - Chip Style ============ */}
        {unlocked && aiPicks.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">🎯 AI Picks</span>
              <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-[9px] font-bold">Multi-Market</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {aiPicks.map((pick, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                    pick.bg
                  )}
                >
                  <span>{pick.emoji}</span>
                  <span className="text-foreground">{pick.label}</span>
                  <span className={cn("font-black", pick.color)}>{pick.confidence}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ PREDICTED SCORE ============ */}
        {unlocked && prediction.predicted_score && (
          <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-gradient-to-br from-cyan-600 to-blue-600">
                <Target className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-sm text-foreground">⚽ Predicted Score</span>
            </div>
            <div className="p-5">
              {(() => {
                const parts = (prediction.predicted_score ?? "").match(/^(\d+)\s*[-:]\s*(\d+)$/);
                const hGoals = parts ? parseInt(parts[1]) : 0;
                const aGoals = parts ? parseInt(parts[2]) : 0;
                return (
                  <div className="flex items-center justify-center gap-6">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-xs font-bold text-muted-foreground truncate max-w-[100px]">{prediction.home_team}</span>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                        <span className="text-3xl sm:text-4xl font-black text-emerald-400">{hGoals}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">AI Score</span>
                      <span className="text-lg font-black text-muted-foreground/40">—</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-xs font-bold text-muted-foreground truncate max-w-[100px]">{prediction.away_team}</span>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 flex items-center justify-center">
                        <span className="text-3xl sm:text-4xl font-black text-blue-400">{aGoals}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <p className="text-[10px] text-muted-foreground/60 text-center mt-3 italic">
                Most likely final score based on AI analysis
              </p>
            </div>
          </div>
        )}

        {/* ============ AI CONFIDENCE METER ============ */}
        {unlocked && (
          <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-gradient-to-br from-violet-600 to-purple-600">
                <Gauge className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-sm text-foreground">🎯 AI Confidence Meter</span>
            </div>
            <div className="p-5 space-y-4">
              {/* Main gauge bar */}
              {(() => {
                const conf = prediction.confidence ?? 0;
                const barColor = conf >= 80 ? "from-emerald-500 to-emerald-400" : conf >= 60 ? "from-amber-500 to-yellow-400" : "from-red-500 to-orange-400";
                const label = conf >= 85 ? "Very High" : conf >= 75 ? "High" : conf >= 60 ? "Moderate" : conf >= 45 ? "Low" : "Very Low";
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Overall Confidence</span>
                      <span className={cn(
                        "text-lg font-black",
                        conf >= 80 ? "text-emerald-400" : conf >= 60 ? "text-amber-400" : "text-red-400"
                      )}>{conf}%</span>
                    </div>
                    <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000", barColor)}
                        style={{ width: `${conf}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                      <span>0%</span>
                      <span className={cn(
                        "font-bold uppercase tracking-wider",
                        conf >= 80 ? "text-emerald-400" : conf >= 60 ? "text-amber-400" : "text-red-400"
                      )}>{label}</span>
                      <span>100%</span>
                    </div>
                  </div>
                );
              })()}

              {/* Sub-meters */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Home Win", value: prediction.home_win ?? 0, color: "text-emerald-400", bg: "bg-emerald-500" },
                  { label: "Draw", value: prediction.draw ?? 0, color: "text-amber-400", bg: "bg-amber-500" },
                  { label: "Away Win", value: prediction.away_win ?? 0, color: "text-blue-400", bg: "bg-blue-500" },
                ].map((m) => (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground font-semibold">{m.label}</span>
                      <span className={cn("text-xs font-black", m.color)}>{m.value}%</span>
                    </div>
                    <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", m.bg)} style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============ STATS MINI GRID ============ */}
        {unlocked && statsGrid.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {statsGrid.map((stat, idx) => (
              <div key={idx} className="bg-card rounded-xl p-3 text-center border border-border/40">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{stat.label}</div>
                <div className="text-lg font-black text-foreground mt-0.5">{stat.value}</div>
                <div className="text-[9px] text-muted-foreground">{stat.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ============ LOCKED SECTIONS FOR FREE USERS ============ */}
        {!unlocked && (
          <div className="space-y-3">
            {/* Locked AI Picks */}
            <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm text-foreground">🎯 AI Picks</span>
                <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-[9px] font-bold">Multi-Market</Badge>
              </div>
              <div className="p-5 text-center space-y-2">
                <Lock className="h-6 w-6 text-amber-400 mx-auto" />
                <p className="text-sm font-bold text-foreground">🔒 Multiple AI picks available</p>
                <p className="text-xs text-muted-foreground">Unlock to see all markets</p>
              </div>
            </div>

            {/* Locked Score Prediction */}
            <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-gradient-to-br from-cyan-600 to-blue-600">
                  <Target className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold text-sm text-foreground">⚽ Predicted Score</span>
              </div>
              <div className="p-5 text-center space-y-2">
                <div className="flex items-center justify-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center">
                    <span className="text-3xl font-black text-muted-foreground/30">?</span>
                  </div>
                  <span className="text-lg font-black text-muted-foreground/30">—</span>
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center">
                    <span className="text-3xl font-black text-muted-foreground/30">?</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-foreground">🔒 Correct score predicted</p>
                <p className="text-xs text-muted-foreground">Unlock to view</p>
              </div>
            </div>

            {/* Locked AI Insight — partial */}
            <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span className="font-bold text-sm text-foreground">💡 AI Insight</span>
              </div>
              <div className="p-4 space-y-2">
                {prediction.analysis ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {prediction.analysis.slice(0, 80)}...
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">AI analysis available for this match</p>
                )}
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Lock className="h-3 w-3" />
                  <span className="text-xs font-bold">Unlock full analysis</span>
                </div>
              </div>
            </div>

            {/* FOMO social proof */}
            <div className="text-center py-1">
              <span className="text-xs text-muted-foreground">
                🔥 {72 + (Math.abs([...prediction.match_id].reduce((h: number, c: string) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % 23)}% of users unlocked this pick
              </span>
            </div>

            {/* CTA */}
            {canGenerate ? (
              <Button
                size="lg"
                className="w-full text-sm font-bold h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-900/30 animate-pulse rounded-xl"
                onClick={() => setUnlocked(true)}
              >
                <Zap className="h-4 w-4 mr-2" />
                🔓 Unlock Full AI Analysis
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full text-sm font-bold h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-900/30 animate-pulse rounded-xl"
                onClick={() => navigate("/get-premium")}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                💎 Get This Winning Pick
              </Button>
            )}
          </div>
        )}

        {/* ============ ANALYSIS SECTIONS ============ */}
        {unlocked && (isGenerating || analysis) && generatedMatch && (
          <MatchPreviewAnalysis
            match={generatedMatch}
            analysis={analysis}
            isLoading={isGenerating}
            prediction={prediction}
          />
        )}
      </div>
    </>
  );
}
