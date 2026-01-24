import { useAIPrediction } from "@/hooks/useAIPrediction";
import { cn } from "@/lib/utils";
import { Brain, Target, AlertTriangle, Sparkles } from "lucide-react";

interface AIPredictionTabProps {
  fixtureId: string | number | null;
}

export function AIPredictionTab({ fixtureId }: AIPredictionTabProps) {
  const { data, loading } = useAIPrediction(fixtureId);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Brain className="h-4 w-4 animate-pulse" />
          Generating AI prediction…
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse bg-card/30 rounded-lg p-4">
              <div className="h-4 w-20 bg-muted rounded mb-3" />
              <div className="h-8 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show placeholder UI when no data
  if (!data) {
    return (
      <div className="p-6 max-h-[450px] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6">
          <Brain className="h-4 w-4" />
          AI-Powered Analysis
        </div>

        {/* Placeholder Winner Card */}
        <div className="bg-gradient-to-br from-primary/10 to-accent/5 rounded-xl p-5 border border-primary/20 text-center mb-5">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="text-xs text-muted-foreground mb-2">Predicted Winner</div>
          <div className="text-lg font-semibold text-muted-foreground">AI prediction coming soon</div>
        </div>

        {/* Placeholder Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-card/30 rounded-lg p-4 border border-border/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Target className="h-3.5 w-3.5" />
              Confidence
            </div>
            <div className="text-2xl font-bold text-muted-foreground/50">—%</div>
            <div className="mt-2 h-1.5 bg-muted/30 rounded-full" />
          </div>

          <div className="bg-card/30 rounded-lg p-4 border border-border/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              Risk Level
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-muted/20 text-muted-foreground/50 border border-border/30">
              —
            </div>
          </div>
        </div>

        {/* Placeholder Score */}
        <div className="bg-card/30 rounded-lg p-4 border border-border/30 text-center mb-5">
          <div className="text-xs text-muted-foreground mb-2">Predicted Score</div>
          <div className="text-3xl font-bold text-muted-foreground/50 tracking-wider">— : —</div>
        </div>

        <p className="text-[10px] text-muted-foreground/50 text-center">
          AI predictions are for informational purposes only
        </p>
      </div>
    );
  }

  // Real data display
  const riskColors: Record<string, string> = {
    Low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    High: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const confidenceColor =
    data.confidence >= 70
      ? "text-emerald-400"
      : data.confidence >= 50
        ? "text-amber-400"
        : "text-red-400";

  const confidenceBgColor =
    data.confidence >= 70
      ? "bg-emerald-500"
      : data.confidence >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="p-4 max-h-[450px] overflow-y-auto space-y-5">
      {/* AI Header */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Brain className="h-4 w-4" />
        AI-Powered Analysis
      </div>

      {/* Predicted Winner */}
      <div className="bg-gradient-to-br from-primary/10 to-accent/5 rounded-xl p-5 border border-primary/20 text-center">
        <div className="text-xs text-muted-foreground mb-2">Predicted Winner</div>
        <div className="text-2xl font-bold text-foreground">{data.prediction}</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Confidence */}
        <div className="bg-card/30 rounded-lg p-4 border border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Target className="h-3.5 w-3.5" />
            Confidence
          </div>
          <div className={cn("text-2xl font-bold", confidenceColor)}>
            {data.confidence}%
          </div>
          <div className="mt-2 h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", confidenceBgColor)}
              style={{ width: `${Math.min(data.confidence, 100)}%` }}
            />
          </div>
        </div>

        {/* Risk Level */}
        <div className="bg-card/30 rounded-lg p-4 border border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Risk Level
          </div>
          <div
            className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border",
              riskColors[data.riskLevel] || riskColors.Medium
            )}
          >
            {data.riskLevel}
          </div>
        </div>
      </div>

      {/* Predicted Score */}
      {data.predictedScore && (
        <div className="bg-card/30 rounded-lg p-4 border border-border/30 text-center">
          <div className="text-xs text-muted-foreground mb-2">Predicted Score</div>
          <div className="text-3xl font-bold text-foreground tracking-wider">
            {data.predictedScore}
          </div>
        </div>
      )}

      {/* Analysis */}
      {data.analysis && (
        <div className="bg-card/20 rounded-lg p-4 border border-border/20">
          <div className="text-xs text-muted-foreground mb-2">Analysis</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.analysis}
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/50 text-center">
        AI predictions are for informational purposes only
      </p>
    </div>
  );
}
