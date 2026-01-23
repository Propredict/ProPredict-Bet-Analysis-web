import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions, MatchDay } from "@/hooks/useAIPredictions";

export default function AIPredictionsPage() {
  const [day, setDay] = useState<MatchDay>("today");
  const [unlocked, setUnlocked] = useState<string[]>([]);

  // USER STATE (kasnije iz auth-a)
  const isAdmin = false;
  const isPro = false;

  const { predictions, loading, stats, accuracy } = useAIPredictions(day);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold">AI Predictions</h1>
          <p className="text-muted-foreground">AI-powered match analysis and predictions</p>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-4 gap-4">
          <Stat label="Live Now" value={predictions.length} />
          <Stat label="Overall Accuracy" value={`${accuracy}%`} />
          <Stat label="Active Predictions" value={predictions.length} />
          <Stat label="Matches Analyzed" value={stats.pending + stats.won + stats.lost} />
        </div>

        {/* ACCURACY BAR */}
        <div className="p-4 bg-card rounded border">
          <div className="flex justify-between mb-2">
            <span>AI Accuracy</span>
            <span>{accuracy}%</span>
          </div>
          <div className="h-2 bg-muted rounded mb-3">
            <div className="h-full bg-green-500 rounded" style={{ width: `${accuracy}%` }} />
          </div>
          <div className="flex justify-between text-xs">
            <span>✔ Won: {stats.won}</span>
            <span>✖ Lost: {stats.lost}</span>
            <span>⏳ Pending: {stats.pending}</span>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          {["today", "tomorrow"].map((d) => (
            <button
              key={d}
              onClick={() => setDay(d as MatchDay)}
              className={`px-4 py-2 rounded ${day === d ? "bg-green-600 text-white" : "bg-muted"}`}
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
            {predictions.map((p) => (
              <AIPredictionCard
                key={p.id}
                prediction={p}
                isAdmin={isAdmin}
                isPro={isPro}
                isUnlocked={unlocked.includes(p.id)}
                onWatchAd={() => setUnlocked((u) => [...u, p.id])}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-card p-4 rounded border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
