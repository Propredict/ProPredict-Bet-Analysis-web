import { useNavigate } from "react-router-dom";
import { Brain, Loader2, ChevronRight, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold text-foreground tabular-nums">{value}%</span>
    </div>
  );
}

function PredictionCard({ prediction, onClick, locked = false }: { prediction: any; onClick: () => void; locked?: boolean }) {
  const maxProb = Math.max(prediction.home_win, prediction.draw, prediction.away_win);
  const favored = prediction.home_win === maxProb ? "1" : prediction.draw === maxProb ? "X" : "2";
  const confidence = prediction.confidence ?? 0;

  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-md"
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-primary to-primary/50" />

      <div className={`p-4 space-y-3 ${locked ? "blur-sm select-none pointer-events-none" : ""}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate max-w-[60%]">
            {prediction.league || "League"}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{prediction.match_time}</span>
        </div>

        <p className={`font-semibold text-sm text-foreground leading-tight line-clamp-1 ${locked ? "!blur-none" : ""}`}>
          {prediction.home_team} vs {prediction.away_team}
        </p>

        <div className={`flex items-center gap-1 ${locked ? "blur-md" : ""}`}>
          {[
            { label: "1", value: prediction.home_win, active: favored === "1" },
            { label: "X", value: prediction.draw, active: favored === "X" },
            { label: "2", value: prediction.away_win, active: favored === "2" },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-colors ${
                item.active
                  ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                  : "bg-muted/20 text-muted-foreground"
              }`}
            >
              <span className="block text-[9px] font-normal opacity-70">{item.label}</span>
              {item.value}%
            </div>
          ))}
        </div>

        <div className={`space-y-2 ${locked ? "blur-md" : ""}`}>
          <div className="flex items-center justify-between">
            <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/20 text-[10px] px-2">
              {prediction.prediction}
            </Badge>
            {confidence >= 75 && (
              <div className="flex items-center gap-0.5 text-accent">
                <Zap className="h-3 w-3" />
                <span className="text-[9px] font-semibold">PREMIUM</span>
              </div>
            )}
          </div>
          <ConfidenceBar value={confidence} />
        </div>
      </div>

      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/40 backdrop-blur-[2px]">
          <div className="p-2 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Premium Pick</span>
          <span className="text-[9px] text-muted-foreground">Tap to unlock</span>
        </div>
      )}
    </div>
  );
}

export function DashboardAIPredictions() {
  const navigate = useNavigate();
  const { predictions, loading } = useAIPredictions("today");
  const { plan } = useUserPlan();
  const isFree = plan === "free";

  const displayedPredictions = [...predictions]
    .filter((p) => (p.confidence ?? 0) >= 50)
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 3);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/20">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">AI Predictions</h2>
            <p className="text-[10px] text-muted-foreground">AI-powered match analysis</p>
          </div>
        </div>
        {predictions.length > 0 && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-semibold">
            {predictions.length} matches
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : displayedPredictions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedPredictions.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              onClick={() => navigate("/ai-predictions")}
              locked={isFree && (prediction.confidence ?? 0) >= 75}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 rounded-xl border border-border/50 bg-card/50">
          <Brain className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">No AI predictions available today</p>
        </div>
      )}

      {predictions.length > 0 && (
        <div className="flex justify-center">
          <Button
            className="px-6 group bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white text-xs border-0 rounded-full"
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
