import { Crown, Play, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";
import type { AIPrediction } from "@/hooks/useAIPredictions";

interface Props {
  prediction: AIPrediction;
}

export function AIPredictionCard({ prediction }: Props) {
  const { isAdmin, plan, getUnlockMethod, unlockContent } = useUserPlan();
  const navigate = useNavigate();

  const unlock = getUnlockMethod("daily", "prediction", prediction.id);
  const isUnlocked = isAdmin || unlock?.type === "unlocked";

  const matchDate = new Date(prediction.match_time);
  const now = new Date();

  const diffMs = matchDate.getTime() - now.getTime();
  const diffH = Math.max(0, Math.floor(diffMs / 1000 / 60 / 60));
  const diffM = Math.max(0, Math.floor((diffMs / 1000 / 60) % 60));

  async function handleWatchAd() {
    // OVDE IDE PRAVI AdSense Rewarded
    await unlockContent("prediction", prediction.id);
  }

  return (
    <Card className="bg-[#0b1d33] border-[#1e2f4d] p-4 space-y-3">
      {/* HEADER */}
      <div className="text-xs text-muted-foreground flex justify-between">
        <span>{prediction.league}</span>
        <span>
          {prediction.match_day === "today" ? "Today" : "Tomorrow"} ·{" "}
          {matchDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* MATCH NAME */}
      <h3 className="font-semibold text-sm">
        {prediction.home_team} vs {prediction.away_team}
      </h3>

      {/* COUNTDOWN */}
      {diffMs > 0 && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock size={12} /> Starts in {diffH}h {diffM}m
        </div>
      )}

      {/* BARS */}
      {[
        { label: prediction.home_team, value: prediction.home_win, color: "bg-green-500" },
        { label: "Draw", value: prediction.draw, color: "bg-gray-400" },
        { label: prediction.away_team, value: prediction.away_win, color: "bg-orange-500" },
      ].map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{row.label}</span>
            <span>{row.value}%</span>
          </div>
          <div className="h-2 bg-muted rounded">
            <div className={`h-2 rounded ${row.color}`} style={{ width: `${row.value}%` }} />
          </div>
        </div>
      ))}

      {/* AI LOCKED PART */}
      <div className={`space-y-2 ${!isUnlocked && "blur-sm select-none"}`}>
        <div className="flex justify-between text-xs">
          <span>Predicted Score</span>
          <span>{prediction.predicted_score}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>AI Confidence</span>
          <span>{prediction.confidence}%</span>
        </div>

        <Badge>
          {prediction.result_status === "pending"
            ? "⏳ Pending"
            : prediction.result_status === "won"
              ? "✅ Won"
              : "❌ Lost"}
        </Badge>
      </div>

      {/* ACTION */}
      {!isUnlocked && (
        <div className="pt-2">
          {unlock?.type === "watch_ad" && (
            <Button className="w-full" onClick={handleWatchAd}>
              <Play size={16} className="mr-2" /> Watch Ad to Unlock
            </Button>
          )}

          {unlock?.type === "upgrade_premium" && (
            <Button className="w-full bg-orange-500" onClick={() => navigate("/get-premium")}>
              <Crown size={16} className="mr-2" /> Get AI Pro Access
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
