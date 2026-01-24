import { useAIPrediction } from "@/hooks/useAIPrediction";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Brain, Target, TrendingUp, AlertTriangle } from "lucide-react";

interface AIPredictionTabProps {
  fixtureId: string | number | null;
}

export function AIPredictionTab({ fixtureId }: AIPredictionTabProps) {
  const { data, loading, error } = useAIPrediction(fixtureId);

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <Brain className="h-4 w-4 animate-pulse" />
          Generating AI prediction…
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        AI prediction not available
      </div>
    );
  }

  const riskColors = {
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Brain className="h-4 w-4" />
        <span>AI-Powered Analysis</span>
      </div>

      {/* Main Prediction */}
      <div className="text-center space-y-2">
        <div className="text-2xl font-bold text-foreground">{data.prediction}</div>
        <div className="text-lg text-muted-foreground">
          Predicted Score: <span className="text-foreground font-semibold">{data.predictedScore}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Confidence */}
        <div className="bg-card/50 rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Target className="h-3.5 w-3.5" />
            Confidence
          </div>
          <div className={cn("text-2xl font-bold", confidenceColor)}>
            {data.confidence}%
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                data.confidence >= 70
                  ? "bg-emerald-500"
                  : data.confidence >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
              )}
              style={{ width: `${Math.min(data.confidence, 100)}%` }}
            />
          </div>
        </div>

        {/* Risk Level */}
        <div className="bg-card/50 rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Risk Level
          </div>
          <Badge
            variant="outline"
            className={cn("text-sm font-semibold", riskColors[data.riskLevel])}
          >
            {data.riskLevel}
          </Badge>
        </div>
      </div>

      {/* Analysis */}
      {data.analysis && (
        <div className="bg-card/30 rounded-lg p-4 border border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Analysis
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.analysis}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground/60 text-center">
        AI predictions are for informational purposes only
      </p>
    </div>
  );
}
