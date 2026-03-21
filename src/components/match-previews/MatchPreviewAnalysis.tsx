import { Brain, TrendingUp, BarChart3, Lightbulb, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Match } from "@/hooks/useFixtures";

interface MatchPreviewAnalysisProps {
  match: Match;
  analysis: MatchAnalysis | null;
  isLoading: boolean;
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

export function MatchPreviewAnalysis({
  match,
  analysis,
  isLoading,
}: MatchPreviewAnalysisProps) {
  if (isLoading) {
    return <AnalysisSkeleton />;
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-4">

      {/* AI Overview */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">AI Overview</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {analysis.overview}
        </p>
      </Card>

      {/* Key Stats */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-amber-500/20">
            <BarChart3 className="h-4 w-4 text-amber-400" />
          </div>
          <h3 className="font-semibold text-sm">Key Stats</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {analysis.keyStats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-muted/30 rounded-lg p-3 text-center"
            >
              <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
              <div
                className={cn(
                  "text-sm font-bold",
                  stat.trend === "positive" && "text-emerald-400",
                  stat.trend === "negative" && "text-red-400",
                  stat.trend === "neutral" && "text-foreground"
                )}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Match Insights */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/20">
            <Lightbulb className="h-4 w-4 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-sm">Match Insights</h3>
        </div>
        <ul className="space-y-2">
          {analysis.insights.map((insight, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-1">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* AI Prediction */}
      <Card className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-primary/20">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">AI Prediction</h3>
          <Badge className="ml-auto bg-primary/20 text-primary border-primary/30 text-[10px]">
            AI Generated
          </Badge>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Expected Outcome</div>
            <div className="font-bold text-lg text-primary">{analysis.prediction.outcome}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">Confidence</div>
            <div
              className={cn(
                "font-bold text-lg",
                analysis.prediction.confidence >= 75 ? "text-emerald-400" :
                analysis.prediction.confidence >= 60 ? "text-amber-400" : "text-muted-foreground"
              )}
            >
              {analysis.prediction.confidence}%
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground leading-relaxed">
          {analysis.prediction.reasoning}
        </p>
        
        <p className="text-[10px] text-muted-foreground/60 mt-3 text-center italic">
          AI-generated prediction. No guarantee of accuracy. For informational purposes only.
        </p>
      </Card>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="flex items-center justify-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </Card>
      
      <Card className="p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-16 w-full" />
      </Card>
      
      <Card className="p-4">
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
      
      <Card className="p-4">
        <Skeleton className="h-4 w-28 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </Card>
    </div>
  );
}
