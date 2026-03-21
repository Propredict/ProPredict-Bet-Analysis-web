import { useState } from "react";
import { Brain, Lightbulb, BarChart3, CheckCircle2, ChevronDown, ChevronUp, Swords, Shield, Flame, TrendingUp, TrendingDown, Minus, Target, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useH2H } from "@/hooks/useH2H";
import type { Match } from "@/hooks/useFixtures";

interface MatchPreviewAnalysisProps {
  match: Match;
  analysis: MatchAnalysis | null;
  isLoading: boolean;
  prediction?: any;
}

export interface MatchAnalysis {
  overview: string;
  keyStats: {
    label: string;
    value: string;
    trend?: "positive" | "negative" | "neutral";
  }[];
  insights: string[];
  prediction: {
    outcome: string;
    confidence: number;
    reasoning: string;
  };
  matchAnalysis?: string[];
  aiInsight?: string;
  gameType?: { label: string; tags: string[] };
}

/* ─── Derived helpers ─── */

function deriveAttackAnalysis(pred: any): { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] {
  if (!pred) return [];
  const hg = pred.last_home_goals ?? 0;
  const ag = pred.last_away_goals ?? 0;
  const items: { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] = [];

  items.push({
    label: `${pred.home_team} Attack`,
    detail: hg >= 2 ? `Averaging ${hg.toFixed(1)} goals — elite offensive output` : hg >= 1.2 ? `${hg.toFixed(1)} goals/game — solid attack` : `Only ${hg.toFixed(1)} goals/game — limited firepower`,
    trend: hg >= 1.5 ? "positive" : hg >= 1 ? "neutral" : "negative",
  });

  items.push({
    label: `${pred.away_team} Attack`,
    detail: ag >= 2 ? `${ag.toFixed(1)} goals away — dangerous on the road` : ag >= 1.2 ? `${ag.toFixed(1)} goals away — decent output` : `${ag.toFixed(1)} goals away — struggles to score`,
    trend: ag >= 1.5 ? "positive" : ag >= 1 ? "neutral" : "negative",
  });

  return items;
}

function deriveDefenseAnalysis(pred: any): { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] {
  if (!pred) return [];
  const hg = pred.last_home_goals ?? 0;
  const ag = pred.last_away_goals ?? 0;
  const items: { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] = [];

  // Defense = opponent's goals against them
  items.push({
    label: `${pred.home_team} Defense`,
    detail: ag <= 0.8 ? `Conceding only ${ag.toFixed(1)} — rock-solid at home` : ag <= 1.5 ? `${ag.toFixed(1)} conceded — average defense` : `${ag.toFixed(1)} conceded — vulnerable at back`,
    trend: ag <= 0.8 ? "positive" : ag <= 1.5 ? "neutral" : "negative",
  });

  items.push({
    label: `${pred.away_team} Defense`,
    detail: hg <= 0.8 ? `Conceding ${hg.toFixed(1)} away — well organized` : hg <= 1.5 ? `${hg.toFixed(1)} conceded away — can be exposed` : `${hg.toFixed(1)} conceded away — leaky defense`,
    trend: hg <= 0.8 ? "positive" : hg <= 1.5 ? "neutral" : "negative",
  });

  return items;
}

function deriveFormAnalysis(pred: any): { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] {
  if (!pred) return [];
  const hw = pred.home_win ?? 0;
  const aw = pred.away_win ?? 0;
  const items: { label: string; detail: string; trend: "positive" | "negative" | "neutral" }[] = [];

  items.push({
    label: `${pred.home_team} Form`,
    detail: hw >= 60 ? `${hw}% home win rate — dominant at home` : hw >= 40 ? `${hw}% win rate — competitive form` : `${hw}% win rate — inconsistent`,
    trend: hw >= 55 ? "positive" : hw >= 35 ? "neutral" : "negative",
  });

  items.push({
    label: `${pred.away_team} Form`,
    detail: aw >= 50 ? `${aw}% away win rate — strong travellers` : aw >= 30 ? `${aw}% away win rate — average on road` : `${aw}% away win rate — struggles away`,
    trend: aw >= 45 ? "positive" : aw >= 25 ? "neutral" : "negative",
  });

  return items;
}

function deriveGoalTrends(pred: any): { label: string; value: string; detail: string }[] {
  if (!pred) return [];
  const hg = pred.last_home_goals ?? 0;
  const ag = pred.last_away_goals ?? 0;
  const total = hg + ag;
  const btts = Math.min(95, 30 + Math.min(hg, ag) * 20 + (hg >= 1 && ag >= 1 ? 15 : 0));

  return [
    { label: "Expected Goals", value: total.toFixed(1), detail: total >= 3 ? "High-scoring match expected" : total >= 2 ? "Moderate scoring anticipated" : "Low-scoring match likely" },
    { label: "BTTS Probability", value: `${Math.round(btts)}%`, detail: btts >= 60 ? "Both teams likely to score" : "Clean sheet possible" },
    { label: "Over 2.5", value: `${Math.min(90, Math.round(20 + total * 12))}%`, detail: total >= 3 ? "Strong over signal" : "Under may be safer" },
  ];
}

function deriveWhyThisPrediction(pred: any): string[] {
  if (!pred) return [];
  const reasons: string[] = [];
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const homeGoals = pred.last_home_goals ?? 0;
  const awayGoals = pred.last_away_goals ?? 0;
  const confidence = pred.confidence ?? 60;
  const prediction = (pred.prediction || "").toLowerCase();
  const totalAvg = homeGoals + awayGoals;

  if (prediction === "1" || prediction === "home") {
    reasons.push(`Home probability ${homeWin}% vs away ${awayWin}%`);
    if (homeGoals >= 1.5) reasons.push(`${pred.home_team} avg ${homeGoals.toFixed(1)} goals at home`);
    if (awayGoals < 1.2) reasons.push(`${pred.away_team} only ${awayGoals.toFixed(1)} goals away`);
  } else if (prediction === "2" || prediction === "away") {
    reasons.push(`Away probability ${awayWin}% outperforms home ${homeWin}%`);
    if (awayGoals >= 1.5) reasons.push(`${pred.away_team} avg ${awayGoals.toFixed(1)} goals away`);
  } else if (prediction.includes("over")) {
    reasons.push(`Combined avg ${totalAvg.toFixed(1)} goals supports over`);
    reasons.push(`${pred.home_team}: ${homeGoals.toFixed(1)}, ${pred.away_team}: ${awayGoals.toFixed(1)}`);
  } else if (prediction.includes("under")) {
    reasons.push(`Low combined avg ${totalAvg.toFixed(1)} goals`);
    reasons.push(`Limited firepower from both sides`);
  } else {
    reasons.push(`Win probabilities: Home ${homeWin}% | Draw ${pred.draw}% | Away ${awayWin}%`);
  }

  if (pred.key_factors?.length > 0) {
    pred.key_factors.slice(0, 2).forEach((f: string) => reasons.push(f));
  }

  reasons.push(`AI confidence: ${confidence}%`);
  return reasons.slice(0, 5);
}

function deriveAIInsight(pred: any): string {
  if (!pred) return "";
  const homeWin = pred.home_win ?? 0;
  const awayWin = pred.away_win ?? 0;
  const confidence = pred.confidence ?? 60;
  const totalGoals = (pred.last_home_goals ?? 0) + (pred.last_away_goals ?? 0);
  const diff = Math.abs(homeWin - awayWin);
  const prediction = (pred.prediction || "").toLowerCase();

  if (prediction.includes("over") && totalGoals >= 3)
    return `High goal expectancy detected (avg ${totalGoals.toFixed(1)}) — over market strongest`;
  if (prediction.includes("under") && totalGoals <= 2)
    return `Defensive pattern flagged — under market favored`;
  if (diff >= 30 && confidence >= 80)
    return `Strong ${homeWin > awayWin ? "home" : "away"} edge — ${confidence}% confidence, low volatility`;
  if (diff >= 20)
    return `Clear statistical edge detected for ${homeWin > awayWin ? "home" : "away"} side`;
  if (totalGoals >= 3.5)
    return `Both defenses vulnerable — high goal probability flagged`;
  if (totalGoals <= 1.5)
    return `Tight defensive matchup — low scoring outcome likely`;
  return `Model confidence at ${confidence}% — moderate signal detected`;
}

const TrendIcon = ({ trend }: { trend: "positive" | "negative" | "neutral" }) => {
  if (trend === "positive") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (trend === "negative") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-amber-400" />;
};

const trendColor = (t: "positive" | "negative" | "neutral") =>
  t === "positive" ? "border-emerald-500/20 bg-emerald-500/5" : t === "negative" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5";

/* ─── Component ─── */

export function MatchPreviewAnalysis({ match, analysis, isLoading, prediction }: MatchPreviewAnalysisProps) {
  const [showMore, setShowMore] = useState(false);

  const homeTeamId = match?.homeTeamId ?? 0;
  const awayTeamId = match?.awayTeamId ?? 0;
  const { data: h2hData, isLoading: h2hLoading } = useH2H(
    showMore && homeTeamId ? homeTeamId : null,
    showMore && awayTeamId ? awayTeamId : null
  );

  if (isLoading) return <AnalysisSkeleton />;
  if (!analysis) return null;

  const whyReasons = deriveWhyThisPrediction(prediction);
  const attackAnalysis = deriveAttackAnalysis(prediction);
  const defenseAnalysis = deriveDefenseAnalysis(prediction);
  const formAnalysis = deriveFormAnalysis(prediction);
  const goalTrends = deriveGoalTrends(prediction);
  const aiInsight = deriveAIInsight(prediction);

  return (
    <div className="space-y-3">

      {/* 🧠 Why This Prediction */}
      {whyReasons.length > 0 && (
        <SectionCard
          icon={<Brain className="h-3.5 w-3.5" />}
          iconGradient="from-violet-600 to-purple-600"
          title="🧠 Why This Prediction"
        >
          <div className="space-y-2.5">
            {whyReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div className={cn(
                  "w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold",
                  idx === 0 ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"
                )}>
                  {idx + 1}
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 📊 Full Match Analysis */}
      <SectionCard
        icon={<BarChart3 className="h-3.5 w-3.5" />}
        iconGradient="from-blue-600 to-indigo-600"
        title="📊 Match Analysis"
      >
        <div className="space-y-4">
          {/* Attack Strength */}
          <AnalysisSubSection icon={<Flame className="h-3.5 w-3.5 text-orange-400" />} title="Attack Strength">
            {attackAnalysis.map((item, idx) => (
              <AnalysisRow key={idx} label={item.label} detail={item.detail} trend={item.trend} />
            ))}
          </AnalysisSubSection>

          {/* Defensive Solidity */}
          <AnalysisSubSection icon={<Shield className="h-3.5 w-3.5 text-blue-400" />} title="Defensive Solidity">
            {defenseAnalysis.map((item, idx) => (
              <AnalysisRow key={idx} label={item.label} detail={item.detail} trend={item.trend} />
            ))}
          </AnalysisSubSection>

          {/* Current Form */}
          <AnalysisSubSection icon={<Activity className="h-3.5 w-3.5 text-emerald-400" />} title="Current Form">
            {formAnalysis.map((item, idx) => (
              <AnalysisRow key={idx} label={item.label} detail={item.detail} trend={item.trend} />
            ))}
          </AnalysisSubSection>

          {/* Goal Trends - mini grid */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Goal Trends</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {goalTrends.map((gt, idx) => (
                <div key={idx} className="bg-muted/30 rounded-xl p-2.5 text-center border border-border/30">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">{gt.label}</div>
                  <div className="text-base font-black text-foreground mt-0.5">{gt.value}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{gt.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 💡 AI Insight */}
      {aiInsight && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 p-4 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white shrink-0">
            <Lightbulb className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">AI Insight</span>
            <p className="text-xs font-semibold text-amber-200 mt-1 leading-relaxed">💡 "{aiInsight}"</p>
          </div>
        </div>
      )}

      {/* ─── Show More / H2H ─── */}
      <div className="pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMore(!showMore)}
          className="w-full gap-2 text-xs font-bold rounded-xl border-border/50 bg-card hover:bg-muted/40"
        >
          {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showMore ? "Show Less" : "Show More — Head to Head & Details"}
        </Button>
      </div>

      {showMore && (
        <SectionCard
          icon={<Swords className="h-3.5 w-3.5" />}
          iconGradient="from-teal-600 to-cyan-600"
          title="⚔️ Head to Head"
        >
          {h2hLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : h2hData && h2hData.seasons?.length > 0 ? (
            <div className="space-y-3">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-500/10 rounded-xl p-2.5 text-center border border-emerald-500/20">
                  <div className="text-[9px] text-emerald-400 font-bold uppercase">{h2hData.team1?.name?.split(" ")[0] || "Home"}</div>
                  <div className="text-xl font-black text-emerald-400">{h2hData.summary?.team1Wins ?? 0}</div>
                  <div className="text-[9px] text-muted-foreground">Wins</div>
                </div>
                <div className="bg-muted/30 rounded-xl p-2.5 text-center border border-border/30">
                  <div className="text-[9px] text-muted-foreground font-bold uppercase">Draws</div>
                  <div className="text-xl font-black text-foreground">{h2hData.summary?.draws ?? 0}</div>
                  <div className="text-[9px] text-muted-foreground">Total</div>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-2.5 text-center border border-blue-500/20">
                  <div className="text-[9px] text-blue-400 font-bold uppercase">{h2hData.team2?.name?.split(" ")[0] || "Away"}</div>
                  <div className="text-xl font-black text-blue-400">{h2hData.summary?.team2Wins ?? 0}</div>
                  <div className="text-[9px] text-muted-foreground">Wins</div>
                </div>
              </div>

              {/* Recent matches */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recent Matches</div>
                {h2hData.seasons.flatMap(s => s.matches).slice(0, 6).map((m, idx) => {
                  const homeWon = m.teams.home.winner === true;
                  const awayWon = m.teams.away.winner === true;
                  const draw = !homeWon && !awayWon;
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-muted/20 rounded-lg p-2 border border-border/20">
                      <div className="text-[9px] text-muted-foreground w-16 shrink-0">
                        {new Date(m.fixture.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                      </div>
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className={cn("text-[11px] font-semibold truncate", homeWon ? "text-emerald-400" : "text-foreground/70")}>
                          {m.teams.home.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 mx-2">
                          <span className={cn(
                            "text-xs font-black px-1.5 py-0.5 rounded",
                            homeWon ? "bg-emerald-500/20 text-emerald-400" : draw ? "bg-muted/40 text-foreground/60" : "text-foreground/40"
                          )}>
                            {m.goals.home ?? 0}
                          </span>
                          <span className="text-[9px] text-muted-foreground">-</span>
                          <span className={cn(
                            "text-xs font-black px-1.5 py-0.5 rounded",
                            awayWon ? "bg-blue-500/20 text-blue-400" : draw ? "bg-muted/40 text-foreground/60" : "text-foreground/40"
                          )}>
                            {m.goals.away ?? 0}
                          </span>
                        </div>
                        <span className={cn("text-[11px] font-semibold truncate text-right", awayWon ? "text-blue-400" : "text-foreground/70")}>
                          {m.teams.away.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Swords className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No head-to-head data available for this matchup</p>
            </div>
          )}
        </SectionCard>
      )}

      <p className="text-[9px] text-muted-foreground/50 text-center italic pt-1">
        AI-generated prediction based on statistical analysis. For informational purposes only.
      </p>
    </div>
  );
}

/* ─── Reusable sub-components ─── */

function SectionCard({ icon, iconGradient, title, children }: { icon: React.ReactNode; iconGradient: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/20">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white bg-gradient-to-br", iconGradient)}>
          {icon}
        </div>
        <span className="font-bold text-sm text-foreground">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function AnalysisSubSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function AnalysisRow({ label, detail, trend }: { label: string; detail: string; trend: "positive" | "negative" | "neutral" }) {
  return (
    <div className={cn("flex items-start gap-2.5 p-2.5 rounded-xl border", trendColor(trend))}>
      <TrendIcon trend={trend} />
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-bold text-foreground">{label}</span>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-card rounded-2xl border border-border/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="p-4 space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
