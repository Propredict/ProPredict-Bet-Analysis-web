import { Lock, Play, Crown, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useNavigate } from "react-router-dom";
import type { AIPrediction } from "./types";

interface Props {
  prediction: AIPrediction;
  isAdmin: boolean;
  userPlan: "free" | "basic" | "premium";
}

export function AIPredictionCard({ prediction, isAdmin, userPlan }: Props) {
  const navigate = useNavigate();
  const { getUnlockMethod, unlockContent } = useUserPlan();
  const { requireAuth } = useRequireAuth();

  const unlock = getUnlockMethod(prediction.is_premium ? "premium" : "daily", "tip", prediction.match_id);

  const isUnlocked = isAdmin || unlock?.type === "unlocked";

  const onWatchAd = requireAuth(async () => {
    // ovde ide AdSense rewarded ad
    await unlockContent("tip", prediction.match_id);
  });

  const startTime = new Date(prediction.match_time);
  const diffMin = Math.max(0, Math.floor((startTime.getTime() - Date.now()) / 60000));

  return (
    <Card className="relative bg-card border-border p-4 space-y-3">
      {/* LEAGUE / TIME */}
      <div className="text-xs text-muted-foreground flex justify-between">
        <span>{prediction.league}</span>
        <span>
          {prediction.match_day === "today" ? "Today" : "Tomorrow"} ·{" "}
          {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* TEAMS */}
      <div className="font-semibold text-center">
        {prediction.home_team} vs {prediction.away_team}
      </div>

      {/* STATUS */}
      <div className="flex justify-between text-xs">
        <Badge variant="secondary">{prediction.result_status}</Badge>
        {diffMin > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            starts in {diffMin}m
          </span>
        )}
      </div>

      {/* BARS */}
      <div className={isUnlocked ? "" : "blur-sm pointer-events-none"}>
        {[
          { label: prediction.home_team, value: prediction.home_win },
          { label: "Draw", value: prediction.draw },
          { label: prediction.away_team, value: prediction.away_win },
        ].map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{r.label}</span>
              <span>{isUnlocked ? `${r.value}%` : "??"}</span>
            </div>
            <div className="h-2 bg-muted rounded">
              <div className="h-full bg-primary" style={{ width: `${r.value}%` }} />
            </div>
          </div>
        ))}

        <div className="grid grid-cols-4 text-xs mt-3 bg-muted/40 p-2 rounded">
          <div>
            <div>Pick</div>
            <strong>{isUnlocked ? prediction.prediction : "?"}</strong>
          </div>
          <div>
            <div>Score</div>
            <strong>{isUnlocked ? prediction.predicted_score : "?"}</strong>
          </div>
          <div>
            <div>Conf</div>
            <strong>{prediction.confidence}%</strong>
          </div>
          <div>
            <div>Risk</div>
            <strong>{prediction.risk_level}</strong>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      {!isUnlocked && (
        <div className="pt-3">
          {unlock?.type === "watch_ad" && (
            <Button className="w-full" onClick={onWatchAd}>
              <Play className="h-4 w-4 mr-2" /> Watch Ad to Unlock
            </Button>
          )}

          {unlock?.type === "upgrade_premium" && (
            <Button className="w-full" onClick={() => navigate("/get-premium")}>
              <Crown className="h-4 w-4 mr-2" /> Get AI Pro Access
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
