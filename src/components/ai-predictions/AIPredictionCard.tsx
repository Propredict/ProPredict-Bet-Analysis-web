import { Crown, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  const locked = !isPremiumUser;

  const hide = locked;

  return (
    <Card className="relative bg-gradient-to-b from-[#0b1a2e] to-[#081425] border border-white/5 rounded-xl p-4 overflow-hidden">
      {/* TOP META */}
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-2">
          ● {prediction.league}
          {isPremiumPick && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500 text-xs text-white">AI PRO</span>
          )}
        </span>
        <span>
          {prediction.matchDay === "today" ? "Today" : "Tomorrow"},{" "}
          {new Date(prediction.matchTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* MATCH TITLE */}
      <h3 className="font-semibold text-sm mb-4">
        {prediction.homeTeam} vs {prediction.awayTeam}
      </h3>

      {/* PROBABILITIES */}
      <div className="space-y-3">
        {[
          { label: prediction.homeTeam, value: prediction.homeWinProbability, color: "bg-green-500" },
          { label: "Draw", value: prediction.drawProbability, color: "bg-gray-400" },
          { label: prediction.awayTeam, value: prediction.awayWinProbability, color: "bg-orange-500" },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex justify-between text-xs mb-1">
              <span>{row.label}</span>
              <span>{hide ? "??" : `${row.value}%`}</span>
            </div>
            <div className="h-2 bg-white/10 rounded">
              <div className={cn("h-full rounded", row.color)} style={{ width: `${row.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* PREDICTED SCORE + CONF */}
      <div className="flex justify-between items-center text-xs mt-4">
        <div>
          <div className="text-muted-foreground">Predicted Score</div>
          <div className={cn(hide && "blur-sm")}>{prediction.predictedScore}</div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground">AI Confidence</div>
          <div className={cn(hide && "blur-sm")}>{prediction.confidence}%</div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-5">
        {!isPremiumPick ? (
          <Button
            onClick={onWatchAd}
            className="w-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20"
          >
            <Eye className="h-4 w-4 mr-2" />
            Watch Ad to Unlock Prediction
          </Button>
        ) : (
          <Button onClick={onBuyPremium} className="w-full bg-orange-500 hover:bg-orange-600">
            <Crown className="h-4 w-4 mr-2" />
            Get AI Pro Access
          </Button>
        )}
      </div>
    </Card>
  );
}
