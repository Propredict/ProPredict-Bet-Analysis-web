import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";

export default function AIPredictionsPage() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");

  const { predictions, loading } = useAIPredictions(day);

  // TEMP – kasnije vežeš na user subscription
  const isPremiumUser = false;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold">AI Predictions</h1>
          <p className="text-muted-foreground">AI predictions for today & tomorrow matches</p>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          {["today", "tomorrow"].map((d) => (
            <button
              key={d}
              onClick={() => setDay(d as any)}
              className={`px-4 py-2 rounded ${day === d ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
            >
              {d === "today" ? "Today" : "Tomorrow"}
            </button>
          ))}
        </div>

        {/* GRID */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((p) => (
              <AIPredictionCard
                key={p.id}
                prediction={p}
                isPremiumUser={isPremiumUser}
                onWatchAd={() => console.log("WATCH AD")}
                onBuyPremium={() => console.log("BUY PREMIUM")}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
