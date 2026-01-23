import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const { predictions, loading, stats } = useAIPredictions(day);
  const { isAdmin, canAccess, getUnlockMethod, unlockContent } = useUserPlan();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      {/* HEADER */}
      <h1 className="text-2xl font-bold">AI Predictions</h1>

      {/* ACCURACY */}
      <div className="card mt-4">
        <div>Accuracy: {stats.accuracy}%</div>
        <div className="text-xs">
          Won: {stats.won} | Lost: {stats.lost} | Pending: {stats.pending}
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mt-4">
        {["today", "tomorrow"].map((d) => (
          <button
            key={d}
            onClick={() => setDay(d as any)}
            className={`px-4 py-2 rounded ${day === d ? "bg-primary text-white" : "bg-muted"}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* GRID */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {predictions.map((p) => {
            const unlock = getUnlockMethod("daily", "tip", p.id);

            return (
              <AIPredictionCard
                key={p.id}
                prediction={p}
                isAdmin={isAdmin}
                canAccess={canAccess("daily", "tip", p.id)}
                unlockType={
                  unlock?.type === "watch_ad" ? "watch_ad" : unlock?.type === "upgrade_premium" ? "upgrade" : "unlocked"
                }
                onWatchAd={async () => {
                  await unlockContent("tip", p.id);
                }}
                onUpgrade={() => navigate("/get-premium")}
              />
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
