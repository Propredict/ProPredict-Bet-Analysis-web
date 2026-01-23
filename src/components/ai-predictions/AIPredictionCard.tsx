import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserPlan } from "@/hooks/useUserPlan";
import type { AIPrediction } from "./types";

interface Props {
  prediction: AIPrediction;
}

export default function AIPredictionCard({ prediction }: Props) {
  const navigate = useNavigate();
  const { isAdmin, plan } = useUserPlan();

  const isPremiumPrediction = prediction.is_premium;
  const isLocked =
    !isAdmin && ((isPremiumPrediction && plan !== "premium") || (!isPremiumPrediction && plan === "free"));

  /* ===== DATE LABEL ===== */
  const dateLabel = useMemo(() => {
    const time = new Date(prediction.match_time);
    return `${prediction.match_day === "today" ? "Today" : "Tomorrow"}, ${time.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [prediction]);

  return (
    <div className="relative rounded-xl border border-border bg-card p-4">
      {/* ================= HEADER ================= */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {prediction.league} • {dateLabel}
        </span>

        <span>
          {prediction.result_status === "pending" && "⏳ Pending"}
          {prediction.result_status === "won" && "✅ Won"}
          {prediction.result_status === "lost" && "❌ Lost"}
        </span>
      </div>

      {/* ================= MATCH NAME ================= */}
      <h3 className="mt-2 font-semibold text-base">
        {prediction.home_team} vs {prediction.away_team}
      </h3>

      {/* ================= BADGES ================= */}
      <div className="flex gap-2 mt-1">
        {prediction.is_premium && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded">AI PRO</span>}

        {prediction.over_25 && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded">Over 2.5</span>}

        {prediction.btts && <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded">BTTS</span>}

        {prediction.confidence < 50 && (
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">High Risk</span>
        )}
      </div>

      {/* ================= AI SECTION ================= */}
      <div className={`mt-4 space-y-2 ${isLocked ? "blur-sm pointer-events-none" : ""}`}>
        <div>
          <div className="flex justify-between text-sm">
            <span>{prediction.home_team}</span>
            <span>{prediction.home_win}%</span>
          </div>
          <div className="h-2 bg-muted rounded">
            <div className="h-2 bg-green-500 rounded" style={{ width: `${prediction.home_win}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm">
            <span>Draw</span>
            <span>{prediction.draw}%</span>
          </div>
          <div className="h-2 bg-muted rounded">
            <div className="h-2 bg-gray-400 rounded" style={{ width: `${prediction.draw}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm">
            <span>{prediction.away_team}</span>
            <span>{prediction.away_win}%</span>
          </div>
          <div className="h-2 bg-muted rounded">
            <div className="h-2 bg-orange-500 rounded" style={{ width: `${prediction.away_win}%` }} />
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Predicted score: {prediction.predicted_score ?? "—"}</span>
          <span>AI confidence: {prediction.confidence}%</span>
        </div>
      </div>

      {/* ================= LOCK OVERLAY ================= */}
      {isLocked && !isAdmin && (
        <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
          {isPremiumPrediction ? (
            <button onClick={() => navigate("/get-premium")} className="bg-orange-500 text-white px-4 py-2 rounded">
              👑 Get Premium
            </button>
          ) : (
            <button onClick={() => alert("SHOW REWARDED AD")} className="bg-green-600 text-white px-4 py-2 rounded">
              ▶ Watch Ad
            </button>
          )}
        </div>
      )}
    </div>
  );
}
