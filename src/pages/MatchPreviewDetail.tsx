import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2, Clock, Sparkles, Lock, Zap, Trophy, Target, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLiveScores } from "@/hooks/useLiveScores";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { MatchPreviewAnalysis } from "@/components/match-previews/MatchPreviewAnalysis";
import { useMatchPreviewGenerator } from "@/hooks/useMatchPreviewGenerator";
import { cn } from "@/lib/utils";
import type { Match } from "@/hooks/useLiveScores";

interface PredictionRouteState {
  unlocked?: boolean;
  predictionId?: string;
}

interface AIPick {
  emoji: string;
  label: string;
  confidence: number;
  color: string;
  bg: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function extractGoalsFromAnalysis(analysis: string | null): {
  homeGoals: number;
  awayGoals: number;
  homeConc: number;
  awayConc: number;
} {
  if (!analysis) return { homeGoals: 0, awayGoals: 0, homeConc: 0, awayConc: 0 };

  let homeGoals = 0;
  let awayGoals = 0;
  let homeConc = 0;
  let awayConc = 0;

  const splitsSection = analysis.match(/HOME\/AWAY SPLITS.*?(?=📈|🛡️|🔥|$)/s);
  if (splitsSection) {
    const homeMatch = splitsSection[0].match(/at home.*?avg\s*([\d.]+)\/([\d.]+)/i);
    if (homeMatch) {
      homeGoals = parseFloat(homeMatch[1]);
      homeConc = parseFloat(homeMatch[2]);
    }

    const awayMatch = splitsSection[0].match(/away.*?avg\s*([\d.]+)\/([\d.]+)/i);
    if (awayMatch) {
      awayGoals = parseFloat(awayMatch[1]);
      awayConc = parseFloat(awayMatch[2]);
    }
  }

  if (!homeGoals || !awayGoals) {
    const seasonSection = analysis.match(/SEASON STATS.*?(?=🛡️|🔥|🚑|$)/s);
    if (seasonSection) {
      const avgMatches = seasonSection[0].match(/Avg goals:\s*([\d.]+)\s*scored,\s*([\d.]+)\s*conceded/gi);
      if (avgMatches?.[0] && !homeGoals) {
        const m1 = avgMatches[0].match(/Avg goals:\s*([\d.]+)\s*scored,\s*([\d.]+)\s*conceded/i);
        if (m1) {
          homeGoals = parseFloat(m1[1]);
          homeConc = parseFloat(m1[2]);
        }
      }

      if (avgMatches?.[1] && !awayGoals) {
        const m2 = avgMatches[1].match(/Avg goals:\s*([\d.]+)\s*scored,\s*([\d.]+)\s*conceded/i);
        if (m2) {
          awayGoals = parseFloat(m2[1]);
          awayConc = parseFloat(m2[2]);
        }
      }
    }
  }

  if (!homeGoals || !awayGoals) {
    const pairs = [...analysis.matchAll(/avg\s*([\d.]+)\s*\/\s*([\d.]+)/gi)];
    if (pairs[0] && !homeGoals) {
      homeGoals = parseFloat(pairs[0][1]);
      homeConc = parseFloat(pairs[0][2]);
    }
    if (pairs[1] && !awayGoals) {
      awayGoals = parseFloat(pairs[1][1]);
      awayConc = parseFloat(pairs[1][2]);
    }
  }

  return { homeGoals, awayGoals, homeConc, awayConc };
}

function resolveGoalMetrics(pred: any) {
  const extracted = extractGoalsFromAnalysis(pred.analysis);

  let homeGoals = pred.last_home_goals && pred.last_home_goals > 0 ? pred.last_home_goals : extracted.homeGoals;
  let awayGoals = pred.last_away_goals && pred.last_away_goals > 0 ? pred.last_away_goals : extracted.awayGoals;

  const homeWin = pred.home_win ?? 33;
  const draw = pred.draw ?? 34;
  const awayWin = pred.away_win ?? 33;

  if (homeGoals <= 0 || awayGoals <= 0) {
    const estimatedTotal = clamp(2 + (100 - draw) / 110 + Math.abs(homeWin - awayWin) / 180, 1.7, 3.7);
    const homeShare = clamp((homeWin + draw * 0.5) / 100, 0.35, 0.7);
    homeGoals = homeGoals > 0 ? homeGoals : Number((estimatedTotal * homeShare).toFixed(1));
    awayGoals = awayGoals > 0 ? awayGoals : Number((estimatedTotal - homeGoals).toFixed(1));
  }

  const homeConc = extracted.homeConc > 0 ? extracted.homeConc : awayGoals;
  const awayConc = extracted.awayConc > 0 ? extracted.awayConc : homeGoals;

  return {
    homeGoals,
    awayGoals,
    homeConc,
    awayConc,
    totalGoalsAvg: Number((homeGoals + awayGoals).toFixed(1)),
  };
}

function makePick(label: string, confidence: number, seed: number): AIPick {
  const conf = clamp(Math.round(confidence + (seed - 5) * 0.5), 30, 95);
  const emoji = conf >= 80 ? "🔥" : conf >= 75 ? "🟢" : conf >= 60 ? "🟡" : "⚠️";
  const color = conf >= 75 ? "text-emerald-400" : conf >= 60 ? "text-amber-400" : "text-red-400";
  const bg =
    conf >= 75
      ? "bg-emerald-500/10 border-emerald-500/20"
      : conf >= 60
        ? "bg-amber-500/10 border-amber-500/20"
        : "bg-red-500/10 border-red-500/20";

  return { emoji, label, confidence: conf, color, bg };
}

function deriveAIPicks(pred: any): AIPick[] {
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const draw = pred.draw ?? 0;
  const { homeGoals, awayGoals, homeConc, awayConc, totalGoalsAvg } = resolveGoalMetrics(pred);

  const seed = (pred.match_id || "")
    .split("")
    .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 10;

  const over25Raw = clamp(28 + totalGoalsAvg * 18 - ((homeConc + awayConc) / 2 > 1.6 ? 8 : 0), 30, 92);
  const under25Raw = clamp(100 - over25Raw, 30, 92);
  const goalsPick =
    over25Raw >= under25Raw
      ? makePick("Over 2.5", over25Raw, seed)
      : makePick("Under 2.5", under25Raw, seed);

  const bttsYesRaw = clamp(
    32 + Math.min(homeGoals, awayGoals) * 22 + (homeGoals >= 1 && awayGoals >= 1 ? 10 : -6),
    30,
    90
  );
  const bttsNoRaw = clamp(100 - bttsYesRaw + (homeConc <= 0.9 || awayConc <= 0.9 ? 8 : 0), 30, 90);
  const bttsPick =
    bttsYesRaw >= bttsNoRaw
      ? makePick("BTTS Yes", bttsYesRaw, seed)
      : makePick("BTTS No", bttsNoRaw, seed);

  const candidatePicks: AIPick[] = [
    makePick("Home Win", homeWin, seed),
    makePick("Draw", draw, seed),
    makePick("Away Win", awayWin, seed),
    makePick("1X (Home/Draw)", clamp(homeWin + draw * 0.65, 35, 95), seed),
    makePick("X2 (Draw/Away)", clamp(awayWin + draw * 0.65, 35, 95), seed),
    makePick(homeWin >= awayWin ? "DNB Home" : "DNB Away", clamp(Math.max(homeWin, awayWin) + draw * 0.35, 35, 92), seed),
    goalsPick,
    bttsPick,
  ];

  const highConfidence = candidatePicks
    .filter((pick) => pick.confidence >= 75)
    .sort((a, b) => b.confidence - a.confidence);

  const finalPicks = [...highConfidence];
  const included = new Set(finalPicks.map((pick) => pick.label));

  for (const mandatoryPick of [goalsPick, bttsPick]) {
    if (!included.has(mandatoryPick.label)) {
      finalPicks.push(mandatoryPick);
      included.add(mandatoryPick.label);
    }
  }

  if (finalPicks.length < 5) {
    const fallback = candidatePicks
      .filter((pick) => !included.has(pick.label))
      .sort((a, b) => b.confidence - a.confidence);

    for (const pick of fallback) {
      finalPicks.push(pick);
      if (finalPicks.length >= 5) break;
    }
  }

  return finalPicks.slice(0, 8);
}

function deriveStatsGrid(pred: any) {
  const { homeGoals, awayGoals, totalGoalsAvg } = resolveGoalMetrics(pred);
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const bttsChance = Math.round(clamp(32 + Math.min(homeGoals, awayGoals) * 22, 30, 90));

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
  const aiPicks = prediction && unlocked ? deriveAIPicks(prediction) : [];
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
                {/* Main prediction */}
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">{getPredictionEmoji(prediction.prediction)}</span>
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {getPredictionLabel(prediction.prediction)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-xl sm:text-2xl font-black text-emerald-400">{prediction.confidence}%</span>
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
              /* Locked state */
              <div className="text-center space-y-3 py-2">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-white/60">Confidence</span>
                  <span className="text-lg font-black text-white">{prediction.confidence ?? 0}%</span>
                </div>
                <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase", risk.bg, risk.color)}>
                  {risk.label}
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

        {/* ============ UNLOCK BUTTON ============ */}
        {!unlocked && (
          <div className="pt-1">
            {canGenerate ? (
              <Button
                size="lg"
                className="w-full text-sm font-bold h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-900/30 animate-pulse rounded-xl"
                onClick={() => setUnlocked(true)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Unlock Prediction & Full Analysis
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full text-sm font-bold h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-900/30 rounded-xl"
                onClick={() => navigate("/get-premium")}
              >
                <Lock className="h-4 w-4 mr-2" />
                Upgrade Plan to Unlock
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
