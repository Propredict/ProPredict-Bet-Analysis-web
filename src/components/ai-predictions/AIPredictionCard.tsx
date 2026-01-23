import { Crown, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
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

  // ⏱️ LIVE COUNTDOWN
  let countdown = "--";
  if (prediction.matchTime) {
    const diff = new Date(prediction.matchTime).getTime() - Date.now();
    if (diff > 0) {
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      countdown = `Starts in ${h}h ${m}m`;
    }
  }

  // 🏆 RESULT BADGE
  const resultBadge =
    prediction.resultStatus === "won" ? (
      <span className="flex items-center gap-1 text-green-400 text-xs">
        <CheckCircle className="h-4 w-4" /> Won
      </span>
    ) : prediction.resultStatus === "lost" ? (
      <span className="flex items-center gap-1 text-red-400 text-xs">
        <XCircle className="h-4 w-4" /> Lost
      </span>
    ) : (
      <span className="flex items-center gap-1 text-yellow-400 text-xs">
        <Clock className="h-4 w-4" /> Pending
      </span>
    );

  return (
    <Card className="bg-gradient-to-b from-[#0b1a2e] to-[#081425] border border-white/5 rounded-xl p-4">
      {/* META */}
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>{prediction.league}</span>
        <span>{countdown}</span>
      </div>

      {/* TITLE */}
      <h3 className="font-semibold text-sm mb-2">
        {prediction.homeTeam} vs {prediction.awayTeam}
      </h3>

      {/* RESULT STATUS */}
      <div className="mb-3">{resultBadge}</div>

      {/* PROBABILITIES */}
      <div className="space-y-2">
        {[
          { label: prediction.homeTeam, v: prediction.homeWinProbability, c: "bg-green-500" },
          { label: "Draw", v: prediction.drawProbability, c: "bg-gray-400" },
          { label: prediction.awayTeam, v: prediction.awayWinProbability, c: "bg-orange-500" },
        ].map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-xs mb-1">
              <span>{r.label}</span>
              <span>{locked ? "??" : `${r.v}%`}</span>
            </div>
            <div className="h-2 bg-white/10 rounded">
              <div className={cn("h-full rounded", r.c)} style={{ width: `${r.v}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* SCORE / CONF */}
      <div className="flex justify-between mt-4 text-xs">
        <div>
          <div className="text-muted-foreground">Predicted Score</div>
          <div className={cn(locked && "blur-sm")}>{prediction.predictedScore}</div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground">AI Confidence</div>
          <div className={cn(locked && "blur-sm")}>{prediction.confidence}%</div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-5">
        {!isPremiumPick ? (
          <Button onClick={onWatchAd} className="w-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
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
