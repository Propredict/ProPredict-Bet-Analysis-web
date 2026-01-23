import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useUserPlan } from "@/hooks/useUserPlan";

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");

  const { predictions, loading } = useAIPredictions(day);
  const { isAdmin, plan, isLoading } = useUserPlan();

  if (isLoading) {
    return <DashboardLayout>Loading...</DashboardLayout>;
  }

  const stats = useMemo(() => {
    const won = predictions.filter((p) => p.result_status === "won").length;
    const lost = predictions.filter((p) => p.result_status === "lost").length;
    const pending = predictions.filter((p) => p.result_status === "pending").length;
    const accuracy = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    return { won, lost, pending, accuracy };
  }, [predictions]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold">AI Predictions</h1>
          <p className="text-muted-foreground">AI-powered match analysis and predictions</p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Stat label="Live Now" value={predictions.length} />
          <Stat label="Overall Accuracy" value={`${stats.accuracy}%`} />
          <Stat label="Active Predictions" value={stats.pending} />
          <Stat label="Matches Analyzed" value={stats.won + stats.lost + stats.pending} />
        </div>

        {/* ACCURACY BAR */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <span className="font-semibold">AI Accuracy</span>
            <span className="text-green-500">{stats.accuracy}%</span>
          </div>
          <div className="h-2 bg-muted rounded">
            <div className="h-full bg-green-500" style={{ width: `${stats.accuracy}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-2">
            <span>Won: {stats.won}</span>
            <span>Lost: {stats.lost}</span>
            <span>Pending: {stats.pending}</span>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          {(["today", "tomorrow"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDay(d)}
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
              <AIPredictionCard key={p.match_id} prediction={p} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
