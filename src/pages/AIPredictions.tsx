import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useNavigate } from "react-router-dom";

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const { predictions, stats } = useAIPredictions(day);
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI Predictions</h1>
        <p className="text-muted-foreground">AI-powered match analysis and predictions</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="Live Now" value={predictions.length} />
        <Stat label="Overall Accuracy" value={`${stats.accuracy}%`} />
        <Stat label="Active Predictions" value={predictions.length} />
        <Stat label="Matches Analyzed" value={stats.pending + stats.won + stats.lost} />
      </div>

      {/* ACCURACY */}
      <div className="rounded-xl bg-card p-4 mb-6">
        <div className="flex justify-between mb-2">
          <span>AI Accuracy</span>
          <span>{stats.accuracy}%</span>
        </div>
        <div className="flex gap-6 text-sm">
          <span>✅ Won: {stats.won}</span>
          <span>❌ Lost: {stats.lost}</span>
          <span>⏳ Pending: {stats.pending}</span>
        </div>
      </div>

      {/* TOGGLE */}
      <div className="flex gap-2 mb-6">
        {["today", "tomorrow"].map((d) => (
          <button
            key={d}
            onClick={() => setDay(d as any)}
            className={`px-4 py-2 rounded ${day === d ? "bg-green-500 text-white" : "bg-muted"}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {predictions.map((p) => (
          <AIPredictionCard
            key={p.id}
            prediction={p}
            onWatchAd={() => console.log("SHOW AD")}
            onGoPremium={() => navigate("/get-premium")}
          />
        ))}
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-card p-4 rounded-xl">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
