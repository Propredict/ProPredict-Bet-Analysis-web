import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useNavigate } from "react-router-dom";

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const { predictions, loading } = useAIPredictions(day);
  const navigate = useNavigate();

  const isAdminOrPremium = true; // privremeno TRUE da vidiš da sve radi

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">AI Predictions</h1>

      {/* TOGGLE */}
      <div className="flex gap-2 mb-6">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predictions.map((m: any) => (
            <AIPredictionCard
              key={m.match_id}
              match={m}
              isAdminOrPremium={isAdminOrPremium}
              onWatchAd={() => alert("WATCH AD")}
              onGoPremium={() => navigate("/get-premium")}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
