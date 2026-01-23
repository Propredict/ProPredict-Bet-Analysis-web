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
  const locked = prediction.isLocked && !isPremiumUser;

  return (
    <Card className="relative bg-card border-border overflow-hidden">
      {/* HEADER – UVEK VIDLJIVO */}
      <div className="p-3 flex justify-between text-xs text-muted-foreground">
        <span>{prediction.league}</span>
        <span>
          {prediction.matchDay === "today" ? "Today" : "Tomorrow"} ·{" "}
          {new Date(prediction.matchTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* TEAMS – UVEK VIDLJIVO */}
      <div className="px-4 pb-2 text-center font-semibold">
        {prediction.homeTeam}
        <div className="text-xs text-muted-foreground my-1">VS</div>
        {prediction.awayTeam}
      </div>

      {/* PROBABILITIES – UVEK VIDLJIVO */}
      <div className="px-4 pb-4 space-y-2">
        {[
          { label: prediction.homeTeam, value: prediction.homeWinProbability },
          { label: "Draw", value: prediction.drawProbability },
          { label: prediction.awayTeam, value: prediction.awayWinProbability },
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

      {/* AI DETAILS – BLUR */}
      <div className={cn("px-4 pb-4", locked && "blur-sm")}>
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
        <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-3">
          <Lock />
          {prediction.isPremium ? (
            <Button onClick={onBuyPremium}>
              <Crown className="h-4 w-4 mr-2" />
              Premium Only
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
