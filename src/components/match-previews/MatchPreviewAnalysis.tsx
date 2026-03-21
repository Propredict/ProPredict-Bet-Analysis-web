import { Brain, TrendingUp, BarChart3, Lightbulb, Sparkles, Shield, Target, Activity, CheckCircle2, AlertTriangle, Flame, Swords, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Match } from "@/hooks/useFixtures";

interface MatchPreviewAnalysisProps {
  match: Match;
  analysis: MatchAnalysis | null;
  isLoading: boolean;
  prediction?: any; // raw prediction row from DB
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
}

interface ParsedSection {
  icon: string;
  title: string;
  content: string;
}

function parseAnalysisIntoSections(analysisText: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  
  // Common section markers in the AI analysis
  const sectionPatterns = [
    { pattern: /🏆\s*VERDICT:?\s*/i, icon: "🏆", title: "Verdict" },
    { pattern: /👆\s*FORM\s*\(Last\s*\d+\s*matches?\):?\s*/i, icon: "📊", title: "Recent Form" },
    { pattern: /⚔️?\s*HEAD-TO-HEAD\s*\(Last\s*\d+\):?\s*/i, icon: "⚔️", title: "Head-to-Head" },
    { pattern: /🏠\s*HOME\/AWAY\s*SPLITS:?\s*/i, icon: "🏠", title: "Home/Away Splits" },
    { pattern: /📊\s*SEASON\s*STATS:?\s*/i, icon: "📈", title: "Season Stats" },
    { pattern: /🔍\s*DEFENSIVE\s*&\s*ATTACK\s*INSIGHTS:?\s*/i, icon: "🛡️", title: "Defensive & Attack" },
    { pattern: /🔥\s*BIGGEST\s*STREAKS:?\s*/i, icon: "🔥", title: "Streaks" },
    { pattern: /🚑\s*INJURIES\s*&\s*SUSPENSIONS:?\s*/i, icon: "🚑", title: "Injuries & Suspensions" },
    { pattern: /🎯\s*WIN\s*PROBABILITIES:?\s*/i, icon: "🎯", title: "Win Probabilities" },
    { pattern: /⭐\s*KEY\s*PLAYERS:?\s*/i, icon: "⭐", title: "Key Players" },
  ];

  // Check if analysis has structured sections
  const hasStructuredSections = sectionPatterns.some(sp => sp.pattern.test(analysisText));

  if (!hasStructuredSections) {
    // If not structured, return as single overview
    return [{ icon: "📋", title: "AI Analysis", content: analysisText }];
  }

  // Split by known section headers
  let remaining = analysisText;
  const foundSections: { index: number; icon: string; title: string; pattern: RegExp }[] = [];

  for (const sp of sectionPatterns) {
    const match = remaining.match(sp.pattern);
    if (match && match.index !== undefined) {
      foundSections.push({ index: remaining.indexOf(match[0]), icon: sp.icon, title: sp.title, pattern: sp.pattern });
    }
  }

  // Sort by position
  foundSections.sort((a, b) => a.index - b.index);

  for (let i = 0; i < foundSections.length; i++) {
    const current = foundSections[i];
    const next = foundSections[i + 1];
    const startIdx = remaining.indexOf(remaining.match(current.pattern)![0]);
    const cleanedStart = remaining.substring(startIdx).replace(current.pattern, "");
    
    let content: string;
    if (next) {
      const nextMatch = cleanedStart.match(next.pattern);
      if (nextMatch && nextMatch.index !== undefined) {
        content = cleanedStart.substring(0, nextMatch.index).trim();
      } else {
        content = cleanedStart.trim();
      }
    } else {
      content = cleanedStart.trim();
    }

    // Clean up bullets and formatting
    content = content.replace(/^[•\-]\s*/gm, "").replace(/\s+/g, " ").trim();
    
    if (content) {
      sections.push({ icon: current.icon, title: current.title, content });
    }
  }

  return sections.length > 0 ? sections : [{ icon: "📋", title: "AI Analysis", content: analysisText }];
}

function getSectionIcon(title: string) {
  const map: Record<string, any> = {
    "Verdict": Trophy,
    "Recent Form": Activity,
    "Head-to-Head": Swords,
    "Home/Away Splits": Shield,
    "Season Stats": BarChart3,
    "Defensive & Attack": Shield,
    "Streaks": Flame,
    "Injuries & Suspensions": AlertTriangle,
    "Win Probabilities": Target,
    "Key Players": Sparkles,
    "AI Analysis": Brain,
  };
  return map[title] || Lightbulb;
}

function getSectionColor(title: string) {
  const map: Record<string, string> = {
    "Verdict": "from-emerald-500 to-teal-500",
    "Recent Form": "from-blue-500 to-indigo-500",
    "Head-to-Head": "from-purple-500 to-violet-500",
    "Home/Away Splits": "from-amber-500 to-orange-500",
    "Season Stats": "from-cyan-500 to-blue-500",
    "Defensive & Attack": "from-red-500 to-rose-500",
    "Streaks": "from-orange-500 to-red-500",
    "Injuries & Suspensions": "from-yellow-500 to-amber-500",
    "Win Probabilities": "from-emerald-500 to-green-500",
    "Key Players": "from-violet-500 to-purple-500",
  };
  return map[title] || "from-gray-500 to-gray-600";
}

export function MatchPreviewAnalysis({
  match,
  analysis,
  isLoading,
  prediction,
}: MatchPreviewAnalysisProps) {
  if (isLoading) {
    return <AnalysisSkeleton />;
  }

  if (!analysis) {
    return null;
  }

  // Parse the raw AI analysis into structured sections
  const parsedSections = parseAnalysisIntoSections(analysis.overview);
  const isVerdictOnly = parsedSections.length === 1 && parsedSections[0].title === "AI Analysis";

  return (
    <div className="space-y-4">

      {/* Structured AI Overview Sections */}
      {parsedSections.map((section, idx) => {
        const Icon = getSectionIcon(section.title);
        const gradient = getSectionColor(section.title);
        const isVerdict = section.title === "Verdict";

        return (
          <div
            key={idx}
            className={cn(
              "bg-white dark:bg-card rounded-xl border shadow-sm overflow-hidden",
              isVerdict 
                ? "border-emerald-200 dark:border-emerald-500/30 shadow-emerald-100/50 dark:shadow-none" 
                : "border-gray-100 dark:border-border/40"
            )}
          >
            {/* Section header */}
            <div className={cn(
              "flex items-center gap-2.5 px-4 py-3 border-b",
              isVerdict 
                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20" 
                : "bg-gray-50 dark:bg-muted/20 border-gray-100 dark:border-border/30"
            )}>
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br text-white",
                gradient
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <h3 className={cn(
                "font-bold text-sm",
                isVerdict ? "text-emerald-800 dark:text-emerald-300" : "text-gray-800 dark:text-foreground"
              )}>
                {section.icon} {section.title}
              </h3>
              {isVerdict && (
                <Badge className="ml-auto bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 text-[9px]">
                  AI Generated
                </Badge>
              )}
            </div>

            {/* Section content */}
            <div className="p-4">
              <p className={cn(
                "text-sm leading-relaxed",
                isVerdict 
                  ? "text-gray-800 dark:text-foreground font-medium" 
                  : "text-gray-600 dark:text-muted-foreground"
              )}>
                {section.content}
              </p>
            </div>
          </div>
        );
      })}

      {/* Key Stats Grid */}
      {analysis.keyStats.length > 0 && (
        <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gray-50 dark:bg-muted/20 border-gray-100 dark:border-border/30">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <BarChart3 className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-bold text-sm text-gray-800 dark:text-foreground">📊 Key Stats</h3>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {analysis.keyStats.map((stat, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-xl p-3 text-center border transition-colors",
                  stat.trend === "positive" && "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
                  stat.trend === "negative" && "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20",
                  stat.trend === "neutral" && "bg-gray-50 dark:bg-muted/20 border-gray-100 dark:border-border/30"
                )}
              >
                <div className="text-[10px] text-gray-500 dark:text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
                  {stat.label}
                </div>
                <div
                  className={cn(
                    "text-lg font-black",
                    stat.trend === "positive" && "text-emerald-600 dark:text-emerald-400",
                    stat.trend === "negative" && "text-red-600 dark:text-red-400",
                    stat.trend === "neutral" && "text-gray-700 dark:text-foreground"
                  )}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match Insights */}
      {analysis.insights.length > 0 && (
        <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gray-50 dark:bg-muted/20 border-gray-100 dark:border-border/30">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
              <Lightbulb className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-bold text-sm text-gray-800 dark:text-foreground">💡 Key Insights</h3>
          </div>

          <div className="p-4 space-y-2.5">
            {analysis.insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-muted/10 border border-gray-100 dark:border-border/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700 dark:text-muted-foreground leading-relaxed">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Prediction Summary Card */}
      <div className="bg-white dark:bg-card rounded-xl border border-emerald-100 dark:border-primary/30 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-emerald-50 dark:bg-primary/10 border-emerald-100 dark:border-primary/20">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <h3 className="font-bold text-sm text-emerald-800 dark:text-primary">🎯 AI Prediction Summary</h3>
          <Badge className="ml-auto bg-emerald-100 dark:bg-primary/20 text-emerald-700 dark:text-primary border-emerald-200 dark:border-primary/30 text-[9px]">
            AI Generated
          </Badge>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] text-gray-400 dark:text-muted-foreground uppercase tracking-wider mb-1">Expected Outcome</div>
              <div className="font-black text-xl text-emerald-700 dark:text-primary">{analysis.prediction.outcome}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-400 dark:text-muted-foreground uppercase tracking-wider mb-1">Confidence</div>
              <div
                className={cn(
                  "font-black text-2xl",
                  analysis.prediction.confidence >= 75 ? "text-emerald-600 dark:text-emerald-400" :
                  analysis.prediction.confidence >= 60 ? "text-amber-600 dark:text-amber-400" : "text-gray-500"
                )}
              >
                {analysis.prediction.confidence}%
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-50 dark:bg-muted/10 border border-gray-100 dark:border-border/20">
            <p className="text-xs text-gray-600 dark:text-muted-foreground leading-relaxed">
              {analysis.prediction.reasoning}
            </p>
          </div>

          <p className="text-[10px] text-gray-400 dark:text-muted-foreground/60 mt-3 text-center italic">
            AI-generated prediction based on statistical analysis. For informational purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border/40 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 dark:bg-muted/20 border-gray-100">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}

      <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border/40 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 dark:bg-muted/20 border-gray-100">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
