import { useNavigate } from "react-router-dom";
import { Brain, Loader2, ChevronRight, TrendingUp, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIPredictions } from "@/hooks/useAIPredictions";

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 85 ? "bg-fuchsia-500" : value >= 70 ? "bg-violet-500" : "bg-primary";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold text-foreground tabular-nums">{value}%</span>
    </div>
  );
}

function PredictionCard({ prediction, onClick }: { prediction: any; onClick: () => void }) {
  const maxProb = Math.max(prediction.home_win, prediction.draw, prediction.away_win);
  const favored = prediction.home_win === maxProb ? "1" : prediction.draw === maxProb ? "X" : "2";
  const confidence = prediction.confidence ?? 0;
  const tierColor = confidence >= 85 ? "border-fuchsia-500/40" : confidence >= 65 ? "border-violet-500/40" : "border-border";
  const tierGlow = confidence >= 85 ? "shadow-fuchsia-500/10" : confidence >= 65 ? "shadow-violet-500/10" : "";

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl border ${tierColor} bg-card hover:bg-accent/5 transition-all cursor-pointer overflow-hidden shadow-md ${tierGlow}`}
    >
      {/* Top accent line */}
      <div className={`h-0.5 w-full ${confidence >= 85 ? "bg-gradient-to-r from-fuchsia-500 to-violet-500" : confidence >= 65 ? "bg-gradient-to-r from-violet-500 to-primary" : "bg-primary/50"}`} />

      <div className="p-4 space-y-3">
        {/* Header: League + Time */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate max-w-[60%]">
            {prediction.league || "League"}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{prediction.match_time}</span>
        </div>

        {/* Teams */}
        <p className="font-semibold text-sm text-foreground leading-tight line-clamp-1">
          {prediction.home_team} vs {prediction.away_team}
        </p>

        {/* Probabilities row */}
        <div className="flex items-center gap-1">
          {[
            { label: "1", value: prediction.home_win, active: favored === "1" },
            { label: "X", value: prediction.draw, active: favored === "X" },
            { label: "2", value: prediction.away_win, active: favored === "2" },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-colors ${
                item.active
                  ? "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30"
                  : "bg-muted/20 text-muted-foreground"
              }`}
            >
              <span className="block text-[9px] font-normal opacity-70">{item.label}</span>
              {item.value}%
            </div>
          ))}
        </div>

        {/* Prediction + Confidence */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 hover:bg-violet-500/20 text-[10px] px-2">
              {prediction.prediction}
            </Badge>
            {confidence >= 85 && (
              <div className="flex items-center gap-0.5 text-fuchsia-400">
                <Zap className="h-3 w-3" />
                <span className="text-[9px] font-semibold">PREMIUM</span>
              </div>
            )}
          </div>
          <ConfidenceBar value={confidence} />
        </div>
      </div>
    </div>
  );
}

export function DashboardAIPredictions() {
  const navigate = useNavigate();
  const { predictions, loading } = useAIPredictions("today");

  const displayedPredictions = [...predictions]
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 3);

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-transparent border border-violet-500/25">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-violet-500/15">
            <Brain className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">AI Predictions</h2>
            <p className="text-[10px] text-muted-foreground">AI-powered match analysis</p>
          </div>
        </div>
        {predictions.length > 0 && (
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/30 text-xs font-semibold">
            {predictions.length} matches
          </Badge>
        )}
      </div>

      {/* Predictions Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
        </div>
      ) : displayedPredictions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedPredictions.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              onClick={() => navigate("/ai-predictions")}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 rounded-xl border border-border/50 bg-card/50">
          <Brain className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">No AI predictions available today</p>
        </div>
      )}

      {/* CTA */}
      {predictions.length > 0 && (
        <div className="flex justify-center">
          <Button
            className="px-8 group bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white border-0 shadow-lg shadow-violet-500/20"
            onClick={() => navigate("/ai-predictions")}
          >
            <span>See all AI Predictions</span>
            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      )}
    </section>
  );
}
