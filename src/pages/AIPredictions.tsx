import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { supabase } from "@/lib/supabase";

export default function AIPredictionsPage() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const { predictions, loading } = useAIPredictions(day);

  const isPremiumUser = false;
  const [unlocked, setUnlocked] = useState<string[]>([]);

  const handleWatchAd = (id: string) => {
    setUnlocked((p) => [...p, id]);
  };

  const handleBuyPremium = () => {
    window.location.href = "/get-premium";
  };

  // 📈 ACCURACY PER DAY
  const won = predictions.filter((p) => p.resultStatus === "won").length;
  const lost = predictions.filter((p) => p.resultStatus === "lost").length;
  const accuracy = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">AI Predictions</h1>

        {/* ACCURACY */}
        <div className="border rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span>AI Accuracy</span>
            <strong>{accuracy}%</strong>
          </div>
          <div className="h-2 bg-muted rounded">
            <div className="h-full bg-primary rounded" style={{ width: `${accuracy}%` }} />
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <span>Won: {won}</span>
            <span>Lost: {lost}</span>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
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
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {predictions.map((p) => (
              <AIPredictionCard
                key={p.id}
                prediction={{
                  ...p,
                  isLocked: !unlocked.includes(p.id),
                }}
                isPremiumUser={isPremiumUser}
                onWatchAd={() => handleWatchAd(p.id)}
                onBuyPremium={handleBuyPremium}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
