import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Play, Crown } from "lucide-react";

type Props = {
  prediction: any;
};

function getCountdown(matchTime: string) {
  const now = new Date();
  const start = new Date(matchTime);
  const diff = start.getTime() - now.getTime();

  if (diff <= 0) return "Live";

  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `Starts in ${h}h ${m}m`;
}

function getRiskLabel(conf: number) {
  if (conf < 50) return "High Risk";
  if (conf >= 65) return "Value Bet";
  return null;
}

export default function AIPredictionCard({ prediction }: Props) {
  const navigate = useNavigate();
  const { plan, isAdmin, unlockContent, isContentUnlocked } = useUserPlan();

  const unlocked = isAdmin || plan === "premium" || isContentUnlocked("tip", prediction.id);

  const riskLabel = getRiskLabel(prediction.confidence);
  const isProTip = prediction.pick?.includes("Over 2.5") || prediction.pick?.includes("BTTS");

  async function handleWatchAd() {
    await unlockContent("tip", prediction.id);
  }

  return (
    <div className="rounded-xl bg-gradient-to-b from-[#0b1c33] to-[#071426] border border-white/5 p-5 shadow-lg">
      {/* HEADER */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {prediction.league} • Today, {prediction.time}
          </p>
          <h3 className="text-lg font-semibold text-white">
            {prediction.home} vs {prediction.away}
          </h3>
        </div>

        <div className="flex gap-2 items-center">
          {riskLabel && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium
              ${riskLabel === "High Risk" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}
            >
              {riskLabel}
            </span>
          )}

          {isProTip && (
            <span className="flex items-center gap-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded">
              <Crown size={12} /> AI PRO
            </span>
          )}
        </div>
      </div>

      {/* COUNTDOWN */}
      <div className="mb-4 text-xs text-cyan-400">⏱ {getCountdown(prediction.match_time)}</div>

      {/* BARS */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-white/80">
            <span>{prediction.home}</span>
            <span>??</span>
          </div>
          <div className="h-2 bg-white/10 rounded">
            <div className="h-2 rounded bg-green-500" style={{ width: `${prediction.home_pct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-white/60">
            <span>Draw</span>
            <span>??</span>
          </div>
          <div className="h-2 bg-white/10 rounded">
            <div className="h-2 rounded bg-gray-400" style={{ width: `${prediction.draw_pct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-white/80">
            <span>{prediction.away}</span>
            <span>??</span>
          </div>
          <div className="h-2 bg-white/10 rounded">
            <div className="h-2 rounded bg-orange-500" style={{ width: `${prediction.away_pct}%` }} />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-5 text-xs flex justify-between text-white/60">
        <span>Predicted Score</span>
        <span>AI Confidence {prediction.confidence}%</span>
      </div>

      {/* LOCK / ACTION */}
      {!unlocked && (
        <div className="mt-4">
          {isProTip ? (
            <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/get-premium")}>
              <Crown className="mr-2 h-4 w-4" />
              Get AI Pro Access
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full border-yellow-400 text-yellow-400 hover:bg-yellow-400/10"
              onClick={handleWatchAd}
            >
              <Play className="mr-2 h-4 w-4" />
              Watch Ad to Unlock Prediction
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
