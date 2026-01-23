import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const { predictions, loading } = useAIPredictions(day);

  const won = predictions.filter((p) => p.result_status === "won").length;
  const lost = predictions.filter((p) => p.result_status === "lost").length;
  const pending = predictions.filter((p) => p.result_status === "pending").length;
  const accuracy = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Predictions</h1>
          <p className="text-muted-foreground">AI-powered match analysis and predictions</p>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-4 gap-4">
          <Stat title="Live Now" value={predictions.length} />
          <Stat title="Overall Accuracy" value={`${accuracy}%`} />
          <Stat title="Active Predictions" value={predictions.length} />
          <Stat title="Matches Analyzed" value="1246" />
        </div>

        {/* ACCURACY BAR */}
        <div className="bg-card p-4 rounded border">
          <div className="flex justify-between text-sm">
            <span>AI Accuracy</span>
            <span>{accuracy}%</span>
          </div>
          <div className="flex gap-6 mt-2 text-xs">
            <span>✅ Won: {won}</span>
            <span>❌ Lost: {lost}</span>
            <span>⏳ Pending: {pending}</span>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          <button onClick={() => setDay("today")} className={day === "today" ? "btn-primary" : "btn-muted"}>
            Today
          </button>
          <button onClick={() => setDay("tomorrow")} className={day === "tomorrow" ? "btn-primary" : "btn-muted"}>
            Tomorrow
          </button>
        </div>

        {/* GRID */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((p) => (
              <AIPredictionCard key={p.id} prediction={p} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-card p-4 rounded border">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
