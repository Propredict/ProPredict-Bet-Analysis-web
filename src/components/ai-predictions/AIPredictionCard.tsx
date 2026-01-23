import { Lock, Crown, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AIPrediction } from "./types";

function getCountdown(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return "Live";
  const h = Math.floor(diff / 1000 / 60 / 60);
  const m = Math.floor((diff / 1000 / 60) % 60);
  return `Starts in ${h}h ${m}m`;
}

function getGoalBadge(score: string) {
  const [h, a] = score.split("-").map(Number);
  if (!h && !a) return null;
  if (h + a >= 3) return "Over 2.5";
  if (h > 0 && a > 0) return "BTTS";
  return null;
}

function getRiskLabel(conf: number) {
  if (conf >= 70) return "Value Bet";
  if (conf <= 45) return "High Risk";
  return null;
}

interface Props {
  prediction: AIPrediction;
  isAdmin: boolean;
  canAccess: boolean;
  unlockType: "watch_ad" | "upgrade" | "unlocked";
  onWatchAd: () => void;
  onUpgrade: () => void;
}

export function AIPredictionCard({ prediction, isAdmin, canAccess, unlockType, onWatchAd, onUpgrade }: Props) {
  const locked = !isAdmin && !canAccess;

  const goalBadge = getGoalBadge(prediction.predicted_score);
  const riskLabel = getRiskLabel(prediction.confidence);
  const countdown = getCountdown(prediction.match_time);

  return (
    <Card className="relative p-4 bg-card border-border">
      {/* HEADER */}
      <div className="text-xs text-muted-foreground flex justify-between">
        <span>{prediction.league}</span>
        <span>{countdown}</span>
      </div>

      {/* MATCH */}
      <h3 className="mt-2 font-semibold">
        {prediction.home_team} vs {prediction.away_team}
      </h3>

      {/* LABELS */}
      <div className="flex gap-2 mt-2">
        {goalBadge && <Badge variant="secondary">{goalBadge}</Badge>}
        {riskLabel && <Badge variant={riskLabel === "High Risk" ? "destructive" : "default"}>{riskLabel}</Badge>}
      </div>

      {/* AI CONTENT */}
      <div className={`mt-4 space-y-2 ${locked ? "blur-sm" : ""}`}>
        {[
          { label: prediction.home_team, value: prediction.home_win },
          { label: "Draw", value: prediction.draw },
          { label: prediction.away_team, value: prediction.away_win },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex justify-between text-xs">
              <span>{row.label}</span>
              <span>{row.value}%</span>
            </div>
            <div className="h-2 bg-muted rounded">
              <div className="h-full bg-primary rounded" style={{ width: `${row.value}%` }} />
            </div>
          </div>
        ))}

        <div className="grid grid-cols-3 text-xs text-center mt-3 bg-muted/30 p-2 rounded">
          <div>
            <div>Pick</div>
            <strong>{prediction.prediction}</strong>
          </div>
          <div>
            <div>Score</div>
            <strong>{prediction.predicted_score}</strong>
          </div>
          <div>
            <div>Conf</div>
            <strong>{prediction.confidence}%</strong>
          </div>
        </div>
      </div>

      {/* LOCK */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          {unlockType === "watch_ad" && (
            <Button onClick={onWatchAd}>
              <Play className="h-4 w-4 mr-2" /> Watch Ad
            </Button>
          )}
          {unlockType === "upgrade" && (
            <Button onClick={onUpgrade}>
              <Crown className="h-4 w-4 mr-2" /> Get Premium
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
