import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2, Clock, Sparkles, TrendingUp, Lock, Zap, Trophy, Target } from "lucide-react";
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

function getTeamInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
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

interface AIPick {
  emoji: string;
  label: string;
  confidence: number;
  color: string;
  bg: string;
}

function deriveAIPicks(pred: any): AIPick[] {
  const allPicks: AIPick[] = [];
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const draw = pred.draw ?? 0;
  const homeGoals = pred.last_home_goals ?? 0;
  const awayGoals = pred.last_away_goals ?? 0;
  const totalGoalsAvg = homeGoals + awayGoals;
  const confidence = pred.confidence ?? 60;

  const seed = (pred.match_id || "").split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 10;
  const jitter = (base: number) => base + (seed - 5) * 0.5;

  const pick = (label: string, conf: number) => {
    conf = Math.max(30, Math.min(95, Math.round(jitter(conf))));
    const emoji = conf >= 80 ? "🔥" : conf >= 75 ? "🟢" : conf >= 60 ? "🟡" : "⚠️";
    const color = conf >= 75 ? "text-emerald-400" : conf >= 60 ? "text-amber-400" : "text-red-400";
    const bg = conf >= 75 ? "bg-emerald-500/10 border-emerald-500/20" : conf >= 60 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";
    allPicks.push({ emoji, label, confidence: conf, color, bg });
  };

  // 1X2
  pick(`Home Win`, homeWin);
  pick("Draw", draw);
  pick(`Away Win`, awayWin);

  // Double Chance
  pick(`1X (Home/Draw)`, Math.min(95, homeWin + draw * 0.6));
  pick(`X2 (Draw/Away)`, Math.min(95, draw * 0.6 + awayWin));
  pick(`12 (No Draw)`, Math.min(95, homeWin + awayWin * 0.5));

  // Over/Under
  const overBase = 20 + totalGoalsAvg * 12;
  pick("Over 0.5", Math.min(95, 50 + totalGoalsAvg * 15));
  pick("Over 1.5", Math.min(93, 35 + totalGoalsAvg * 13));
  pick("Over 2.5", Math.min(90, overBase));
  pick("Over 3.5", Math.min(85, overBase - 15));
  pick("Under 0.5", Math.max(30, 50 - totalGoalsAvg * 15));
  pick("Under 1.5", Math.max(30, 60 - totalGoalsAvg * 12));
  pick("Under 2.5", Math.max(30, 72 - totalGoalsAvg * 10));
  pick("Under 3.5", Math.max(35, 82 - totalGoalsAvg * 8));
  pick("Under 4.5", Math.max(40, 90 - totalGoalsAvg * 6));

  // BTTS
  const bttsYesConf = 30 + Math.min(homeGoals, awayGoals) * 20 + (homeGoals >= 1 && awayGoals >= 1 ? 15 : 0);
  const bttsNoConf = 30 + (2.5 - Math.min(homeGoals, awayGoals)) * 15 + (homeGoals < 0.8 || awayGoals < 0.8 ? 15 : 0);
  pick("BTTS Yes", bttsYesConf);
  pick("BTTS No", bttsNoConf);

  // Draw No Bet
  pick(`DNB Home`, homeWin + draw * 0.3);
  pick(`DNB Away`, awayWin + draw * 0.3);

  // Clean Sheet
  pick(`Home CS`, Math.max(30, 65 - awayGoals * 18));
  pick(`Away CS`, Math.max(30, 65 - homeGoals * 18));

  return allPicks.filter(p => p.confidence > 75).sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}

function deriveStatsGrid(pred: any) {
  const homeGoals = pred.last_home_goals ?? 0;
  const awayGoals = pred.last_away_goals ?? 0;
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const totalAvg = homeGoals + awayGoals;
  const bttsChance = Math.min(95, 30 + Math.min(homeGoals, awayGoals) * 20 + (homeGoals >= 1 && awayGoals >= 1 ? 15 : 0));

  // Form indicator
  const formLabel = homeWin >= 60 ? "Strong" : homeWin >= 45 ? "Good" : homeWin >= 30 ? "Average" : "Weak";

  return [
    { label: "Win %", value: `${Math.max(homeWin, awayWin)}%`, sub: homeWin > awayWin ? "Home" : "Away" },
    { label: "Goals Avg", value: totalAvg.toFixed(1), sub: "Combined" },
    { label: "BTTS", value: `${Math.round(bttsChance)}%`, sub: "Chance" },
    { label: "Form", value: formLabel, sub: "Home" },
  ];
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
          className="gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
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
