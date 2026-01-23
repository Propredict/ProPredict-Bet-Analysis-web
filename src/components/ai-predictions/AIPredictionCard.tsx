import { Lock, Play, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIPrediction } from "@/hooks/useAIPredictions";

interface Props {
  prediction: AIPrediction;
  isAdmin: boolean;
  isPro: boolean;
  isUnlocked: boolean;
  onWatchAd: () => void;
}

export function AIPredictionCard({ prediction, isAdmin, isPro, isUnlocked, onWatchAd }: Props) {
  const locked = !isAdmin && !isPro && !isUnlocked;

  return (
    <Card className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 p-4 relative">
      {/* HEADER */}
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>
          {prediction.league} • {prediction.matchDay === "today" ? "Today" : "Tomorrow"},{" "}
          {new Date(prediction.matchTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="flex items-center gap-1">🕒 {prediction.resultStatus}</span>
      </div>

      {/* MATCH NAME */}
      <h3 className="font-semibold mb-3">
        {prediction.homeTeam} vs {prediction.awayTeam}
      </h3>

      {/* PROBABILITIES */}
      <div className={locked ? "blur-sm" : ""}>
        {[
          { label: prediction.homeTeam, value: prediction.homeWin },
          { label: "Draw", value: prediction.draw },
          { label: prediction.awayTeam, value: prediction.awayWin },
        ].map((p) => (
          <div key={p.label} className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span>{p.label}</span>
              <span>{locked ? "??" : `${p.value}%`}</span>
            </div>
            <div className="h-2 bg-muted rounded">
              <div className="h-full bg-green-500 rounded" style={{ width: `${p.value}%` }} />
            </div>
          </div>
        ))}

        <div className="flex justify-between text-xs mt-3">
          <span>Predicted Score: {locked ? "•••" : prediction.predictedScore}</span>
          <span>AI Confidence: {locked ? "••" : `${prediction.confidence}%`}</span>
        </div>
      </div>

      {/* CTA */}
      {!isAdmin && !isPro && locked && (
        <div className="mt-4">
          {prediction.isPremium ? (
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={() => (window.location.href = "/get-premium")}
            >
              <Crown className="mr-2 h-4 w-4" />
              Get AI Pro Access
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={onWatchAd}>
              <Play className="mr-2 h-4 w-4" />
              Watch Ad to Unlock Prediction
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
