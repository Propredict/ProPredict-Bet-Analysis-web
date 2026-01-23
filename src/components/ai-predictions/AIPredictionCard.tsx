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
  const locked = prediction.is_locked && !isPremiumUser;

  const formatTime = (time: string | null) => {
    if (!time || time === "LIVE") return time;
    return time;
  };

  return (
    <Card className="relative bg-card border-border overflow-hidden">
      {/* HEADER */}
      <div className="p-3 flex justify-between text-xs text-muted-foreground">
        <span>{prediction.league}</span>
        <span>
          {prediction.match_day === "today" ? "Today" : "Tomorrow"} · {formatTime(prediction.match_time)}
        </span>
      </div>

      {/* TEAMS */}
      <div className="px-4 pb-2 text-center font-semibold">
        {prediction.home_team}
        <div className="text-xs text-muted-foreground my-1">VS</div>
        {prediction.away_team}
      </div>

      {/* PROBABILITIES */}
      <div className="px-4 pb-4 space-y-2">
        {[
          { label: prediction.home_team, value: prediction.home_win },
          { label: "Draw", value: prediction.draw },
          { label: prediction.away_team, value: prediction.away_win },
        ].map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-24 truncate">{p.label}</span>
            <div className="flex-1 h-2 bg-muted rounded">
              <div className="h-full bg-primary rounded" style={{ width: `${p.value}%` }} />
            </div>
            <span className="w-10 text-right">{p.value}%</span>
          </div>
        ))}
      </div>

      {/* AI DETAILS - BLURRED WHEN LOCKED */}
      <div className={cn("px-4 pb-4", locked && "blur-sm")}>
        <div className="grid grid-cols-4 text-center text-xs bg-muted/50 p-2 rounded">
          <div>
            <div className="text-muted-foreground">Pick</div>
            <strong>{prediction.prediction}</strong>
          </div>
          <div>
            <div className="text-muted-foreground">Score</div>
            <strong>{prediction.predicted_score}</strong>
          </div>
          <div>
            <div className="text-muted-foreground">Conf</div>
            <strong>{prediction.confidence}%</strong>
          </div>
          <div>
            <div className="text-muted-foreground">Risk</div>
            <Badge variant="outline" className="text-xs">
              {prediction.risk_level}
            </Badge>
          </div>
        </div>
      </div>

      {/* LOCK OVERLAY */}
      {locked && (
        <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-3">
          <Lock className="h-6 w-6" />
          {prediction.is_premium ? (
            <Button onClick={onBuyPremium} size="sm">
              <Crown className="h-4 w-4 mr-2" />
              Premium Only
            </Button>
          ) : (
            <Button onClick={onWatchAd} size="sm">
              <Play className="h-4 w-4 mr-2" />
              Watch Ad to Unlock
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
