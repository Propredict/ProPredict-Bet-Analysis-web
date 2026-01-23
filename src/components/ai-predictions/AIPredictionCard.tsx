import { Lock, Crown, Play, CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AIPrediction } from "./types";

interface Props {
  prediction: AIPrediction;
  isAdmin: boolean;
  isPro: boolean;
  isUnlocked: boolean;
  onWatchAd: () => void;
}

export function AIPredictionCard({ prediction, isAdmin, isPro, isUnlocked, onWatchAd }: Props) {
  const locked = !isAdmin && !isPro && !isUnlocked;

  const startTime = new Date(prediction.matchTime).getTime();
  const diffHrs = Math.max(0, Math.floor((startTime - Date.now()) / 1000 / 60 / 60));

  return (
    <Card className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 p-4">
      {/* HEADER */}
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>
          {prediction.league} · {prediction.matchDay === "today" ? "Today" : "Tomorrow"},{" "}
          {new Date(prediction.matchTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        {prediction.resultStatus === "won" && (
          <span className="text-green-400 flex gap-1">
            <CheckCircle size={14} /> Won
          </span>
        )}
        {prediction.resultStatus === "lost" && (
          <span className="text-red-400 flex gap-1">
            <XCircle size={14} /> Lost
          </span>
        )}
      </div>

      {/* TEAMS */}
      <h3 className="font-semibold mb-3">
        {prediction.homeTeam} vs {prediction.awayTeam}
      </h3>

      {/* PROBABILITIES */}
      <div className={`space-y-2 ${locked ? "blur-sm" : ""}`}>
        {[
          { label: prediction.homeTeam, value: prediction.homeWin },
          { label: "Draw", value: prediction.draw },
          { label: prediction.awayTeam, value: prediction.awayWin },
        ].map((p) => (
          <div key={p.label}>
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

        <div className="text-xs text-muted-foreground mt-2">Starts in {diffHrs}h</div>
      </div>

      {/* LOCK */}
      {locked && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur flex flex-col items-center justify-center gap-3">
          <Lock />
          {prediction.isPremium ? (
            <Button onClick={() => (window.location.href = "/get-premium")}>
              <Crown className="mr-2 h-4 w-4" /> Get AI Pro Access
            </Button>
          ) : (
            <Button onClick={onWatchAd}>
              <Play className="mr-2 h-4 w-4" /> Watch Ad to Unlock
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
