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
  const locked = (!isPremiumUser && prediction.is_premium) || (!isPremiumUser && !prediction.is_premium);

  return (
    <Card className="relative bg-card border-border overflow-hidden">
      {/* HEADER */}
      <div className="p-3 flex justify-between text-xs text-muted-foreground">
        <span>{prediction.league}</span>
        <span>
          {prediction.match_day === "today" ? "Today" : "Tomorrow"} ·{" "}
          {new Date(prediction.match_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* TEAMS */}
      <div className="p-4 text-center font-semibold">
        {prediction.home_team}
        <div className="text-xs text-muted-foreground my-1">VS</div>
        {prediction.away_team}
      </div>

      {/* AI SECTION */}
      <div className={cn("p-4 space-y-3", locked && "blur-sm")}>
        {[
          { label: "1", value: prediction.home_win },
          { label: "X", value: prediction.draw },
          { label: "2", value: prediction.away_win },
        ].map((p) => (
          <div key={p.label} className="flex items-center gap-2">
            <span className="w-4 text-xs">{p.label}</span>
            <div className="flex-1 h-2 bg-muted rounded">
              <div className="h-full bg-primary" style={{ width: `${p.value}%` }} />
            </div>
            <span className="w-8 text-xs text-right">{p.value}%</span>
          </div>
        ))}

        <div className="grid grid-cols-4 text-center text-xs bg-muted/50 p-2 rounded">
          <div>
            <div>Outcome</div>
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
          <div>
            <div>Risk</div>
            <Badge>{prediction.risk_level}</Badge>
          </div>
        </div>
      </div>

      {/* LOCK OVERLAY */}
      {locked && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur flex flex-col items-center justify-center gap-3">
          <Lock />
          {prediction.is_premium ? (
            <Button onClick={onBuyPremium}>
              <Crown className="h-4 w-4 mr-2" /> Premium Only
            </Button>
          ) : (
            <Button onClick={onWatchAd}>
              <Play className="h-4 w-4 mr-2" /> Watch Ad to Unlock
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
