import { Lock, Crown, Play, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUserPlan } from "@/hooks/useUserPlan";
import type { AIPrediction } from "./types";

interface Props {
  prediction: AIPrediction;
  onWatchAd: () => void;
  onGoPremium: () => void;
}

export function AIPredictionCard({ prediction, onWatchAd, onGoPremium }: Props) {
  const { isAdmin, plan } = useUserPlan();

  const isProTip = prediction.market === "OVER_2_5" || prediction.market === "BTTS" || prediction.odds >= 2.5;

  const locked = !isAdmin && (isProTip ? plan !== "premium" : plan === "free");

  const startsInMs = new Date(prediction.match_time).getTime() - Date.now();
  const startsInMin = Math.max(0, Math.floor(startsInMs / 60000));

  return (
    <div className="relative rounded-xl bg-[#0b1b2b] border border-white/5 p-4">
      {/* HEADER */}
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>{prediction.league}</span>
        <span>
          {prediction.match_day === "today" ? "Today" : "Tomorrow"},{" "}
          {new Date(prediction.match_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* TITLE */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">
          {prediction.home_team} vs {prediction.away_team}
        </h3>

        {isProTip && <Badge className="bg-orange-500 text-white">AI PRO</Badge>}
      </div>

      {/* BARS */}
      <div className="space-y-2">
        {[
          { label: prediction.home_team, value: prediction.home_win, color: "bg-green-500" },
          { label: "Draw", value: prediction.draw, color: "bg-gray-400" },
          { label: prediction.away_team, value: prediction.away_win, color: "bg-orange-500" },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex justify-between text-xs mb-1">
              <span>{row.label}</span>
              <span>{locked ? "??" : `${row.value}%`}</span>
            </div>
            <div className="h-2 bg-white/10 rounded">
              <div className={cn("h-2 rounded", row.color)} style={{ width: locked ? "0%" : `${row.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* AI SECTION */}
      <div className={cn("mt-4", locked && "blur-sm select-none")}>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Predicted Score</span>
          <span>AI Confidence</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>{prediction.predicted_score}</span>
          <span>{prediction.confidence}%</span>
        </div>
      </div>

      {/* COUNTDOWN */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
        <Clock className="w-3 h-3" />
        Starts in {Math.floor(startsInMin / 60)}h {startsInMin % 60}m
      </div>

      {/* LOCK CTA */}
      {!isAdmin && locked && (
        <div className="mt-4">
          {isProTip ? (
            <Button className="w-full bg-orange-500" onClick={onGoPremium}>
              <Crown className="w-4 h-4 mr-2" /> Get AI Pro Access
            </Button>
          ) : (
            <Button className="w-full bg-green-500" onClick={onWatchAd}>
              <Play className="w-4 h-4 mr-2" /> Watch Ad to Unlock
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
