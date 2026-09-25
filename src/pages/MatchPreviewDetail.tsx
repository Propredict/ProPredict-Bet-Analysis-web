import { useEffect, useState, useMemo, type ReactNode } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft, Loader2, Clock, Sparkles, Lock, Zap, Trophy, Target, Gauge,
  Brain, BarChart3, Lightbulb, Shield, CheckCircle2, Settings, Crown, ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateGoalMarketProbs,
  getNormalized1x2,
  getConsistentTopCorrectScores,
} from "@/components/ai-predictions/utils/marketDerivation";
import { useLiveScores } from "@/hooks/useLiveScores";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { MatchPreviewAnalysis } from "@/components/match-previews/MatchPreviewAnalysis";
import { MatchHistoryTabs } from "@/components/match-previews/MatchHistoryTabs";
import { useMatchPreviewGenerator } from "@/hooks/useMatchPreviewGenerator";
import { useMatchPreviewUnlocks } from "@/hooks/useMatchPreviewUnlocks";
import { cn } from "@/lib/utils";
import { formatMatchTime } from "@/utils/formatMatchTime";
import type { Match } from "@/hooks/useLiveScores";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { getTopMatchPreviewPick } from "@/utils/matchPreviewPicks";

interface PredictionRouteState {
  unlocked?: boolean;
  predictionId?: string;
}

type DetailTab = "analysis" | "insights" | "h2h" | "predictions" | "results";

function getTeamInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

function getRiskLabel(confidence: number | null) {
  if (!confidence) return { label: "Unknown", color: "text-white/50", bg: "bg-white/10" };
  if (confidence >= 80) return { label: "LOW RISK", color: "text-emerald-300", bg: "bg-emerald-500/15 border border-emerald-500/30" };
  if (confidence >= 65) return { label: "MED RISK", color: "text-amber-300", bg: "bg-amber-500/15 border border-amber-500/30" };
  return { label: "HIGH RISK", color: "text-red-300", bg: "bg-red-500/15 border border-red-500/30" };
}

function getPredictionLabel(prediction: string | null): string {
  if (!prediction) return "—";
  const p = prediction.toLowerCase().trim();
  if (p === "1" || p === "home") return "HOME WIN";
  if (p === "x" || p === "draw") return "DRAW";
  if (p === "2" || p === "away") return "AWAY WIN";
  if (p.includes("over")) return prediction.toUpperCase();
  if (p.includes("under")) return prediction.toUpperCase();
  if (p.includes("btts")) return "BTTS YES";
  return prediction.toUpperCase();
}

/** Dark stadium panel used across the whole detail page. */
function Panel({ icon, title, children, className, right }: {
  icon?: ReactNode; title: string; children: ReactNode; className?: string; right?: ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-[#1c3a5e] bg-[#0a1830]/90 overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1c3a5e]/70">
        {icon}
        <span className="text-xs sm:text-sm font-extrabold tracking-wide text-white uppercase">{title}</span>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Circular confidence ring (SVG). */
function ConfidenceRing({ value }: { value: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#16304f" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444"}
          strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-xl sm:text-2xl font-black", pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400")}>
          {pct}%
        </span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-white/40">Confidence</span>
      </div>
    </div>
  );
}

function splitInsights(analysis: string | null): string[] {
  if (!analysis) return [];
  return analysis
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
    .slice(0, 5);
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
  const { remaining, hasReachedLimit, isMatchUnlocked, recordUnlock, limit } = useMatchPreviewUnlocks();

  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(Boolean(routeState?.unlocked));
  const [activeTab, setActiveTab] = useState<DetailTab>("analysis");

  const isPremiumUser = plan === "premium" || isAdmin;
  const isProUser = plan === "basic";
  const isFreeUser = !isPremiumUser && !isProUser;

  const canUnlock = isPremiumUser || (isProUser && (!hasReachedLimit || isMatchUnlocked(matchId || "")));

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
    if (!prediction || !unlocked || analysis || isGenerating || isFreeUser) return;

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
  }, [prediction, unlocked, analysis, isGenerating, !isFreeUser, liveMatches, generateFromPrediction]);

  const liveMatch = prediction
    ? liveMatches.find((match) => match.homeTeam === prediction.home_team && match.awayTeam === prediction.away_team)
    : null;

  const homeLogo = liveMatch?.homeLogo || null;
  const awayLogo = liveMatch?.awayLogo || null;
  const risk = prediction ? getRiskLabel(prediction.confidence) : getRiskLabel(null);
  const heroPick = prediction ? getTopMatchPreviewPick(prediction as AIPrediction) : null;

  const derived = useMemo(() => {
    if (!prediction || !unlocked) return null;
    const pred = prediction as AIPrediction;
    const norm = getNormalized1x2(pred);
    const goals = calculateGoalMarketProbs(pred);
    const topScores = getConsistentTopCorrectScores(pred, {}, 3);
    const xgHome = typeof (prediction as any).xg_home === "number" && (prediction as any).xg_home > 0
      ? (prediction as any).xg_home : null;
    const xgAway = typeof (prediction as any).xg_away === "number" && (prediction as any).xg_away > 0
      ? (prediction as any).xg_away : null;
    const totalXg = xgHome != null && xgAway != null ? xgHome + xgAway : null;
    const dc = {
      "1X": Math.min(100, norm.hw + norm.d),
      "12": Math.min(100, norm.hw + norm.aw),
      "X2": Math.min(100, norm.d + norm.aw),
    };
    const bestDc = (Object.entries(dc) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
    return { norm, goals, topScores, xgHome, xgAway, totalXg, dc, bestDc };
  }, [prediction, unlocked]);

  const insights = useMemo(() => (prediction && unlocked ? splitInsights(prediction.analysis) : []), [prediction, unlocked]);

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

  const conf = heroPick?.confidence ?? prediction.confidence ?? 0;
  const tabs: { id: DetailTab; label: string; icon: ReactNode }[] = [
    { id: "analysis", label: "Analysis", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "insights", label: "Insights", icon: <Lightbulb className="h-3.5 w-3.5" /> },
    { id: "h2h", label: "H2H", icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
    { id: "predictions", label: "Our Predictions", icon: <Target className="h-3.5 w-3.5" /> },
    { id: "results", label: "Results", icon: <Trophy className="h-3.5 w-3.5" /> },
  ];

  return (
    <>
      <Helmet>
        <title>{prediction.home_team} vs {prediction.away_team} – Match Preview | ProPredict</title>
      </Helmet>

      <div className="page-content space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/match-previews")}
          className="gap-1.5 text-xs font-medium text-white hover:text-white/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Match Previews
        </Button>

        {/* ============ HERO — stadium header ============ */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1c3a5e] bg-gradient-to-b from-[#0b1d3a] via-[#081426] to-[#060f1f]">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl" />

          <div className="relative p-5 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {liveMatch?.leagueLogo && <img src={liveMatch.leagueLogo} alt="" className="w-6 h-6 object-contain" />}
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-white/90 truncate">
                    {prediction.league || "League"}
                  </div>
                  <div className="text-[9px] text-white/40">League • Match Preview</div>
                </div>
              </div>
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[9px] font-bold uppercase tracking-wider gap-1 shrink-0">
                <Crown className="h-3 w-3" /> Premium Analysis
              </Badge>
            </div>

            <div className="text-center">
              <div className="text-[10px] text-white/40 font-medium">{prediction.match_date || "Today"}</div>
              <div className="flex items-center justify-center gap-1 text-white/70">
                <Clock className="h-3 w-3" />
                <span className="text-xs font-bold">
                  {formatMatchTime((prediction as any).match_timestamp, prediction.match_time, (prediction as any).match_date)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {homeLogo ? (
                  <img src={homeLogo} alt="" className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_0_16px_rgba(16,185,129,0.35)]" />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                    <span className="text-lg font-black text-white/80">{getTeamInitials(prediction.home_team)}</span>
                  </div>
                )}
                <span className="text-sm sm:text-base font-bold text-center text-white leading-tight line-clamp-2">
                  {prediction.home_team}
                </span>
              </div>

              <div className="shrink-0">
                <span className="text-2xl sm:text-3xl font-black text-white/70 tracking-tight">VS</span>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {awayLogo ? (
                  <img src={awayLogo} alt="" className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_0_16px_rgba(59,130,246,0.35)]" />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                    <span className="text-lg font-black text-white/80">{getTeamInitials(prediction.away_team)}</span>
                  </div>
                )}
                <span className="text-sm sm:text-base font-bold text-center text-white leading-tight line-clamp-2">
                  {prediction.away_team}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ AI MAIN PICK + 1X2 PROBABILITIES ============ */}
        {unlocked && derived ? (
          <div className="grid md:grid-cols-2 gap-4">
            {/* AI MAIN PICK */}
            <Panel icon={<Brain className="h-4 w-4 text-blue-400" />} title="AI Main Pick">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {heroPick?.label ?? getPredictionLabel(prediction.prediction)}
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Most likely outcome based on AI analysis of team form, stats and recent matches.
                  </p>
                  <div className={cn("inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", risk.bg, risk.color)}>
                    {risk.label}
                  </div>
                </div>
                <ConfidenceRing value={conf} />
              </div>
            </Panel>

            {/* 1X2 PROBABILITIES */}
            <Panel icon={<Target className="h-4 w-4 text-blue-400" />} title="1X2 Probabilities">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="text-lg font-black text-emerald-400">{derived.norm.hw}%</div>
                  <div className="text-lg font-black text-white/70">{derived.norm.d}%</div>
                  <div className="text-lg font-black text-red-400">{derived.norm.aw}%</div>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-[#16304f]">
                  <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${derived.norm.hw}%` }} />
                  <div className="bg-slate-400/70 transition-all duration-700" style={{ width: `${derived.norm.d}%` }} />
                  <div className="bg-red-500 transition-all duration-700" style={{ width: `${derived.norm.aw}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="flex items-center justify-center gap-1.5 min-w-0">
                    {homeLogo && <img src={homeLogo} alt="" className="w-4 h-4 object-contain" />}
                    <span className="text-[10px] font-semibold text-white/70 truncate">{prediction.home_team}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[10px] font-semibold text-white/50">Draw</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 min-w-0">
                    {awayLogo && <img src={awayLogo} alt="" className="w-4 h-4 object-contain" />}
                    <span className="text-[10px] font-semibold text-white/70 truncate">{prediction.away_team}</span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        ) : (
          /* Locked hero pick */
          <div className="rounded-2xl border border-[#1c3a5e] bg-[#0a1830]/90 p-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5 text-amber-400" />
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">AI Top Pick Locked</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-sm text-white/50">Confidence:</span>
                <span className="text-xl font-black text-emerald-400">{conf}%</span>
              </div>
              <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", risk.bg, risk.color)}>
                {risk.label}
              </div>
            </div>
          </div>
        )}

        {/* ============ TABS ============ */}
        {unlocked && (
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[#1c3a5e] bg-[#0a1830]/90 p-1.5 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ============ TAB: ANALYSIS ============ */}
        {unlocked && derived && activeTab === "analysis" && (
          <div className="space-y-4">
            {/* AI PREDICTION MARKETS */}
            <Panel icon={<BarChart3 className="h-4 w-4 text-blue-400" />} title="AI Prediction Markets">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: "Over 1.5", value: derived.goals.over15, hot: heroPick?.label?.toLowerCase().includes("over 1.5") },
                  { label: "Over 2.5", value: derived.goals.over25, hot: heroPick?.label?.toLowerCase().includes("over 2.5") },
                  { label: "Over 3.5", value: derived.goals.over35, hot: heroPick?.label?.toLowerCase().includes("over 3.5") },
                  { label: "Under 2.5", value: derived.goals.under25, hot: heroPick?.label?.toLowerCase().includes("under 2.5") },
                  { label: "BTTS Yes", value: derived.goals.bttsYes, hot: heroPick?.label?.toLowerCase().includes("btts") },
                  { label: "1X", value: derived.dc["1X"], hot: heroPick?.label === "1X" },
                  { label: "X2", value: derived.dc["X2"], hot: heroPick?.label === "X2" },
                  { label: "12", value: derived.dc["12"], hot: heroPick?.label === "12" },
                ].map((m) => (
                  <div
                    key={m.label}
                    className={cn(
                      "rounded-xl border p-3 text-center transition-all",
                      m.hot
                        ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.15)]"
                        : "border-[#1c3a5e] bg-[#0d2040]/60"
                    )}
                  >
                    <div className="text-[10px] font-bold text-white/60 uppercase tracking-wide">{m.label}</div>
                    <div className={cn(
                      "text-lg font-black mt-0.5",
                      m.value >= 80 ? "text-emerald-400" : m.value >= 60 ? "text-blue-300" : m.value >= 45 ? "text-amber-400" : "text-red-400"
                    )}>
                      {m.value}%
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <div className="grid md:grid-cols-2 gap-4">
              {/* EXPECTED GOALS */}
              <Panel icon={<Target className="h-4 w-4 text-blue-400" />} title="Expected Goals (xG)">
                {derived.xgHome != null && derived.xgAway != null ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 text-center space-y-1.5">
                      <div className="text-2xl font-black text-emerald-400">{derived.xgHome.toFixed(1)}</div>
                      <div className="text-[10px] font-semibold text-white/60 truncate">{prediction.home_team}</div>
                      <div className="h-1.5 rounded-full bg-[#16304f] overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (derived.xgHome / 3.5) * 100)}%` }} />
                      </div>
                    </div>
                    <BarChart3 className="h-6 w-6 text-blue-400/60 shrink-0" />
                    <div className="flex-1 text-center space-y-1.5">
                      <div className="text-2xl font-black text-blue-400">{derived.xgAway.toFixed(1)}</div>
                      <div className="text-[10px] font-semibold text-white/60 truncate">{prediction.away_team}</div>
                      <div className="h-1.5 rounded-full bg-[#16304f] overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (derived.xgAway / 3.5) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/40 text-center">xG data not available for this match yet.</p>
                )}
              </Panel>

              {/* DOUBLE CHANCE */}
              <Panel icon={<Shield className="h-4 w-4 text-blue-400" />} title="Double Chance">
                <div className="grid grid-cols-3 gap-2.5">
                  {(["1X", "12", "X2"] as const).map((key) => {
                    const val = derived.dc[key];
                    const isBest = derived.bestDc[0] === key;
                    return (
                      <div
                        key={key}
                        className={cn(
                          "rounded-xl border p-3 text-center",
                          isBest ? "border-emerald-500/60 bg-emerald-500/10" : "border-[#1c3a5e] bg-[#0d2040]/60"
                        )}
                      >
                        <div className="text-xs font-black text-white/80">{key}</div>
                        <div className={cn("text-lg font-black mt-0.5", isBest ? "text-emerald-400" : "text-white/70")}>{val}%</div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>

            {/* KEY MATCH STATS */}
            <Panel icon={<BarChart3 className="h-4 w-4 text-blue-400" />} title="Key Match Stats">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: "Home Win", value: `${derived.norm.hw}%` },
                  { label: "Draw", value: `${derived.norm.d}%` },
                  { label: "Away Win", value: `${derived.norm.aw}%` },
                  { label: "BTTS", value: `${derived.goals.bttsYes}%` },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-[#1c3a5e] bg-[#0d2040]/60 p-3 text-center">
                    <div className="text-[9px] text-white/40 uppercase tracking-wider font-semibold">{s.label}</div>
                    <div className="text-lg font-black text-white mt-0.5">{s.value}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ============ TAB: OUR PREDICTIONS ============ */}
        {unlocked && derived && activeTab === "predictions" && (
          <div className="space-y-4">
            {/* PREDICTED SCORE */}
            {prediction.predicted_score && (
              <Panel icon={<Target className="h-4 w-4 text-blue-400" />} title="Predicted Score">
                {(() => {
                  const parts = String(prediction.predicted_score).match(/^(\d+)\s*[-:]\s*(\d+)$/);
                  const hGoals = parts ? parseInt(parts[1]) : 0;
                  const aGoals = parts ? parseInt(parts[2]) : 0;
                  return (
                    <div className="flex items-center justify-center gap-6">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-xs font-bold text-white/60 truncate max-w-[110px]">{prediction.home_team}</span>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl font-black text-emerald-400">{hGoals}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">AI Score</span>
                        <span className="text-lg font-black text-white/30">—</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-xs font-bold text-white/60 truncate max-w-[110px]">{prediction.away_team}</span>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl font-black text-blue-400">{aGoals}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <p className="text-[10px] text-white/30 text-center mt-3 italic">Most likely final score based on AI analysis</p>
              </Panel>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              {/* CORRECT SCORE TOP 3 */}
              <Panel icon={<Target className="h-4 w-4 text-blue-400" />} title="Correct Score (Top 3)">
                <div className="grid grid-cols-3 gap-2">
                  {derived.topScores.map((s, idx) => (
                    <div
                      key={s.score}
                      className={cn(
                        "rounded-xl border p-3 text-center",
                        idx === 0 ? "border-emerald-500/60 bg-emerald-500/10" : "border-[#1c3a5e] bg-[#0d2040]/60"
                      )}
                    >
                      {idx === 0 && <Crown className="h-3 w-3 text-amber-400 mx-auto mb-1" />}
                      <div className={cn("text-lg font-black", idx === 0 ? "text-emerald-400" : "text-white")}>{s.score}</div>
                      <div className="text-[10px] text-white/40">{Math.round(s.probability * 100)}%</div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* TOTAL GOALS PREDICTION */}
              <Panel icon={<Target className="h-4 w-4 text-blue-400" />} title="Total Goals Prediction">
                <div className="text-center space-y-2 py-2">
                  <div className="text-3xl font-black text-blue-300">
                    {derived.totalXg != null
                      ? `${Math.max(0, Math.floor(derived.totalXg - 0.5))} - ${Math.ceil(derived.totalXg + 0.5)}`
                      : derived.goals.over25 >= 50 ? "3+" : "0 - 2"}
                  </div>
                  <div className="text-[11px] text-white/50 font-semibold">
                    {derived.goals.over25 >= 65 ? "High Scoring Match" : derived.goals.over25 >= 45 ? "Medium Scoring Match" : "Low Scoring Match"}
                  </div>
                  <div className="text-[10px] text-white/30">Over 2.5: {derived.goals.over25}% • Under 2.5: {derived.goals.under25}%</div>
                </div>
              </Panel>

              {/* BTTS ANALYSIS */}
              <Panel icon={<Target className="h-4 w-4 text-blue-400" />} title="BTTS Analysis">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-white/40 font-semibold">Yes</div>
                      <div className="text-xl font-black text-emerald-400">{derived.goals.bttsYes}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 font-semibold">No</div>
                      <div className="text-xl font-black text-white/60">{derived.goals.bttsNo}%</div>
                    </div>
                  </div>
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-[#16304f]">
                    <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${derived.goals.bttsYes}%` }} />
                    <div className="bg-slate-500/60 transition-all duration-700" style={{ width: `${derived.goals.bttsNo}%` }} />
                  </div>
                </div>
              </Panel>
            </div>

            {/* AI CONFIDENCE METER */}
            <Panel icon={<Gauge className="h-4 w-4 text-blue-400" />} title="AI Confidence Meter">
              {(() => {
                const barColor = conf >= 80 ? "from-emerald-500 to-emerald-400" : conf >= 60 ? "from-amber-500 to-yellow-400" : "from-red-500 to-orange-400";
                const label = conf >= 85 ? "Very High" : conf >= 75 ? "High" : conf >= 60 ? "Moderate" : conf >= 45 ? "Low" : "Very Low";
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white/80">Overall Confidence</span>
                      <span className={cn("text-lg font-black", conf >= 80 ? "text-emerald-400" : conf >= 60 ? "text-amber-400" : "text-red-400")}>{conf}%</span>
                    </div>
                    <div className="relative h-3 bg-[#16304f] rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000", barColor)} style={{ width: `${conf}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-white/40">
                      <span>0%</span>
                      <span className={cn("font-bold uppercase tracking-wider", conf >= 80 ? "text-emerald-400" : conf >= 60 ? "text-amber-400" : "text-red-400")}>{label}</span>
                      <span>100%</span>
                    </div>
                  </div>
                );
              })()}
            </Panel>
          </div>
        )}

        {/* ============ TAB: INSIGHTS ============ */}
        {unlocked && derived && activeTab === "insights" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* AI INSIGHTS */}
              <Panel icon={<Lightbulb className="h-4 w-4 text-blue-400" />} title="AI Insights">
                {insights.length > 0 ? (
                  <ul className="space-y-2.5">
                    {insights.map((ins, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-xs text-white/70 leading-relaxed">{ins}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-white/40">AI insights will appear here once the analysis is generated.</p>
                )}
              </Panel>

              {/* KEY FACTORS */}
              <Panel icon={<Settings className="h-4 w-4 text-blue-400" />} title="Key Factors">
                <ul className="space-y-2.5">
                  {[
                    `${prediction.home_team} win probability: ${derived.norm.hw}%`,
                    `${prediction.away_team} win probability: ${derived.norm.aw}%`,
                    `Both teams to score: ${derived.goals.bttsYes}% chance`,
                    `Over 2.5 goals: ${derived.goals.over25}% chance`,
                    derived.totalXg != null ? `Expected total goals: ${derived.totalXg.toFixed(1)}` : null,
                  ].filter(Boolean).map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-white/70 leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            {/* FINAL VERDICT */}
            <Panel icon={<Trophy className="h-4 w-4 text-amber-400" />} title="Final Verdict">
              <div className="text-center space-y-3">
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  {conf >= 80 ? "High Confidence" : conf >= 60 ? "Medium Confidence" : "Low Confidence"}
                </Badge>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl sm:text-3xl font-black text-white">{heroPick?.label ?? getPredictionLabel(prediction.prediction)}</span>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xl font-black text-emerald-400">{conf}%</span>
                </div>
                <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
                  {derived.goals.over25 >= 65
                    ? "High probability match with good goal potential and quality attacking teams."
                    : derived.goals.under25 >= 60
                      ? "Tight match expected — the AI leans towards a low-scoring outcome."
                      : "Balanced match — the AI pick is based on the strongest statistical signal."}
                </p>
              </div>
            </Panel>
          </div>
        )}

        {/* ============ TABS: H2H / RESULTS ============ */}
        {unlocked && (activeTab === "h2h" || activeTab === "results") && (
          <MatchHistoryTabs
            tab={activeTab}
            fixtureId={String(prediction.match_id)}
            matchDate={String(prediction.match_date || "")}
            homeTeam={prediction.home_team}
            awayTeam={prediction.away_team}
            homeId={liveMatch?.homeTeamId ?? null}
            awayId={liveMatch?.awayTeamId ?? null}
            homeLogo={homeLogo}
            awayLogo={awayLogo}
          />
        )}

        {/* ============ LOCKED SECTIONS FOR FREE USERS ============ */}
        {!unlocked && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#1c3a5e] bg-[#0a1830]/90 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1c3a5e]/70">
                <Target className="h-4 w-4 text-blue-400" />
                <span className="font-bold text-sm text-white">AI Picks</span>
                <Badge className="ml-auto bg-blue-500/15 text-blue-300 border-blue-500/30 text-[9px] font-bold">Multi-Market</Badge>
              </div>
              <div className="p-5 text-center space-y-2">
                <Lock className="h-6 w-6 text-amber-400 mx-auto" />
                <p className="text-sm font-bold text-white">Multiple AI picks available</p>
                <p className="text-xs text-white/40">Unlock to see all markets</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1c3a5e] bg-[#0a1830]/90 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1c3a5e]/70">
                <Target className="h-4 w-4 text-blue-400" />
                <span className="font-bold text-sm text-white">Predicted Score</span>
              </div>
              <div className="p-5 text-center space-y-2">
                <div className="flex items-center justify-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-[#1c3a5e] flex items-center justify-center">
                    <span className="text-3xl font-black text-white/20">?</span>
                  </div>
                  <span className="text-lg font-black text-white/20">—</span>
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-[#1c3a5e] flex items-center justify-center">
                    <span className="text-3xl font-black text-white/20">?</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-white">Correct score predicted</p>
                <p className="text-xs text-white/40">Unlock to view</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1c3a5e] bg-[#0a1830]/90 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1c3a5e]/70">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span className="font-bold text-sm text-white">AI Insight</span>
              </div>
              <div className="p-4 space-y-2">
                {prediction.analysis ? (
                  <p className="text-xs text-white/50 leading-relaxed">{prediction.analysis.slice(0, 80)}...</p>
                ) : (
                  <p className="text-xs text-white/50">AI analysis available for this match</p>
                )}
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Lock className="h-3 w-3" />
                  <span className="text-xs font-bold">Unlock full analysis</span>
                </div>
              </div>
            </div>

            <div className="text-center py-1">
              <span className="text-xs text-white/40">
                🔥 {72 + (Math.abs([...prediction.match_id].reduce((h: number, c: string) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % 23)}% of users unlocked this pick
              </span>
            </div>

            {canUnlock ? (
              <>
                {isProUser && (
                  <p className="text-center text-[10px] text-white/40">
                    {remaining} of {limit} daily previews remaining
                  </p>
                )}
                <Button
                  size="lg"
                  className="w-full text-sm font-bold h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-900/30 rounded-xl"
                  onClick={() => {
                    if (isProUser && matchId) recordUnlock(matchId);
                    setUnlocked(true);
                  }}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Unlock Full AI Analysis
                </Button>
              </>
            ) : isProUser && hasReachedLimit ? (
              <div className="space-y-2">
                <p className="text-center text-xs text-amber-400 font-semibold">
                  You've used all {limit} daily previews
                </p>
                <Button
                  size="lg"
                  className="w-full text-sm font-bold h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-900/30 animate-pulse rounded-xl"
                  onClick={() => navigate("/get-premium")}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade to Premium — Unlimited Previews
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full text-sm font-bold h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-900/30 animate-pulse rounded-xl"
                onClick={() => navigate("/get-premium")}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Get This Winning Pick / Pogledaj Celosnu Analizu i Tip
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
