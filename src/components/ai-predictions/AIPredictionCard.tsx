import { Lock, Crown, Play, Clock } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUserPlan } from "@/hooks/useUserPlan";

export interface AIPrediction {
  id: string;
  league: string;
  match_day: "today" | "tomorrow";
  match_time: string; // ISO
  home_team: string;
  away_team: string;

  home_win: number;
  draw: number;
  away_win: number;

  prediction: string;
  predicted_score: string;
  confidence: number;
  risk_level: "low" | "medium" | "high";

  market?: "over_2_5" | "btts" | null;
  odds?: number;

  result_status: "pending" | "won" | "lost";
}

interface Props {
  prediction: AIPrediction;
}

export function AIPredictionCard({ prediction }: Props) {
  const { plan, isAdmin, getUnlockMethod, unlockContent } = useUserPlan();
  const navigate = useNavigate();

  /* =========================
     ACCESS LOGIC
  ========================= */

  const isPremiumPrediction = prediction.odds !== undefined && prediction.odds >= 2.5;

  const unlock = getUnlockMethod(isPremiumPrediction ? "premium" : "daily", "tip", prediction.id);

  const locked = unlock?.type !== "unlocked";

  /* =========================
     COUNTDOWN
  ========================= */

  const countdown = useMemo(() => {
    const start = new Date(prediction.match_time).getTime();
    const now = Date.now();
    const diff = start - now;

    if (diff <= 0) return "Live";

    const h = Math.floor(diff / 1000 / 60 / 60);
    const m = Math.floor((diff / 1000 / 60) % 60);
    return `Starts in ${h}h ${m}m`;
  }, [prediction.match_time]);

  /* =========================
     ACTION HANDLERS
  ========================= */

  const handleWatchAd = async () => {
    // OVDE IDE PRAVI REWARDED AD (AdSense / AdMob)
    // nakon success:
    await unlockContent("tip", prediction.id);
  };

  const handleUpgrade = () => {
    navigate("/get-premium");
  };

  /* =========================
     UI
  ========================= */

  return (
    <Card className="relative bg-[#0B1A2D] border border-white/5 rounded-xl overflow-hidden">
      {/* HEADER */}
      <div className="px-4 pt-4 text-xs text-muted-foreground flex justify-between">
        <span>{prediction.league}</span>
        <span>
          {prediction.match_day === "today" ? "Today" : "Tomorrow"},{" "}
          {new Date(prediction.match_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* MATCH TITLE */}
      <div className="px-4 pt-2 font-semibold text-white">
        {prediction.home_team} vs {prediction.away_team}
      </div>

      {/* STATUS ROW */}
      <div className="px-4 py-2 flex items-center gap-2 text-xs">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground">{countdown}</span>

        {prediction.market && (
          <Badge variant="secondary">{prediction.market === "over_2_5" ? "Over 2.5" : "BTTS"}</Badge>
        )}

        {prediction.risk_level === "high" && <Badge className="bg-red-500/20 text-red-400">High Risk</Badge>}

        {prediction.result_status !== "pending" && (
          <Badge
            className={cn(
              prediction.result_status === "won" && "bg-green-500/20 text-green-400",
              prediction.result_status === "lost" && "bg-red-500/20 text-red-400",
            )}
          >
            {prediction.result_status.toUpperCase()}
          </Badge>
        )}
      </div>

      {/* AI SECTION */}
      <div className={cn("px-4 pb-4 space-y-3", locked && "blur-sm")}>
        {[
          { label: prediction.home_team, value: prediction.home_win, color: "bg-green-500" },
          { label: "Draw", value: prediction.draw, color: "bg-gray-400" },
          { label: prediction.away_team, value: prediction.away_win, color: "bg-orange-500" },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex justify-between text-xs mb-1">
              <span>{row.label}</span>
              <span>{row.value}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded">
              <div className={cn("h-full rounded", row.color)} style={{ width: `${row.value}%` }} />
            </div>
          </div>
        ))}

        <div className="flex justify-between text-xs pt-2">
          <span>Predicted Score</span>
          <span className="blur-sm">{prediction.predicted_score}</span>
        </div>
      </div>

      {/* LOCK OVERLAY */}
      {locked && !isAdmin && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
          <Lock className="w-5 h-5 text-white" />

          {unlock?.type === "watch_ad" && (
            <Button onClick={handleWatchAd}>
              <Play className="w-4 h-4 mr-2" /> Watch Ad to Unlock
            </Button>
          )}

          {unlock?.type === "upgrade_premium" && (
            <Button onClick={handleUpgrade} variant="secondary">
              <Crown className="w-4 h-4 mr-2" /> Get AI Pro Access
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
