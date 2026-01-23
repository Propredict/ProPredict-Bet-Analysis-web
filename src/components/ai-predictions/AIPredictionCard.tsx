import { Lock, Crown, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "./types";

interface Props {
  prediction: AIPrediction;
  isPremiumUser: boolean;
  onWatchAd: () => void;
  onBuyPremium: () => void;
}

export function AIPredictionCard({ prediction, isPremiumUser, onWatchAd, onBuyPremium }: Props) {
  const isPremiumPick = prediction.confidence >= 60;

  const locked = !isPremiumUser && (isPremiumPick || prediction.isLocked);

  return (
    <Card className="relative bg-card border-border overflow-hidden">
      {/* HEADER */}
      <div className="p-3 flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          {prediction.league}
          {isPremiumPick && (
            <Badge className="bg-yellow-500/20 text-yellow-400">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          )}
        </span>

        <span>
          {prediction.matchDay === "today" ? "Today" : "Tomorrow"} ·{" "}
          {new Date(prediction.matchTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* TEAMS */}
      <div className="p-4 text-center font-semibold">
        {prediction.homeTeam}
        <div className="text-xs text-muted-foreground my-1">VS</div>
        {prediction.awayTeam}
      </div>

      {/* PROBABILITIES – ALWAYS VISIBLE */}
      <div className="px-4 space-y-2">
        {[
          { label: "1", value: prediction.homeWinProbability },
          { label: "X", value: prediction.drawProbability },
          { label: "2", value: prediction.awayWinProbability },
        ].map((p) => (
          <div key={p.label} className="flex items-center gap-2">
            <span className="w-4 text-xs">{p.label}</span>
            <div className="flex-1 h-2 bg-muted rounded">
              <div className="h-full bg-primary" style={{ width: `${p.value}%` }} />
            </div>
            <span className="w-8 text-xs text-right">{locked ? "?" : `${p.value}%`}</span>
          </div>
        ))}
      </div>

      {/* AI DETAILS (BLURRED IF LOCKED) */}
      <div className={cn("p-4 mt-3", locked && "blur-sm")}>
        <div className="grid grid-cols-4 text-center text-xs bg-muted/50 p-2 rounded">
          <div>
            <div>Pick</div>
            <strong>{prediction.predictedOutcome}</strong>
          </div>
          <div>
            <div>Score</div>
            <strong>{prediction.predictedScore}</strong>
          </div>
          <div>
            <div>Conf</div>
            <strong>{prediction.confidence}%</strong>
          </div>
          <div>
            <div>Risk</div>
            <Badge>{prediction.riskLevel}</Badge>
          </div>
        </div>
      </div>

      {/* LOCK OVERLAY */}
      {locked && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur flex flex-col items-center justify-center gap-3">
          <Lock />

          {isPremiumPick ? (
            <Button onClick={onBuyPremium}>
              <Crown className="h-4 w-4 mr-2" />
              Get Premium
            </Button>
          ) : (
            <Button onClick={onWatchAd}>
              <Play className="h-4 w-4 mr-2" />
              Watch Ad to Unlock
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
