import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import AIPredictionCard from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [query, setQuery] = useState("");
  const { predictions, loading } = useAIPredictions();

  // Compute stats from predictions
  const stats = useMemo(() => {
    const won = predictions.filter((p) => p.status === "won").length;
    const lost = predictions.filter((p) => p.status === "lost").length;
    const pending = predictions.filter((p) => p.status === "pending").length;
    const total = won + lost;
    const accuracy = total > 0 ? Math.round((won / total) * 100) : 0;
    return { won, lost, pending, accuracy, streak: 0 };
  }, [predictions]);

  /* SEARCH FILTER */
  const filteredPredictions = useMemo(() => {
    if (!query) return predictions;
    const q = query.toLowerCase();
    return predictions.filter(
      (p) =>
        p.home?.toLowerCase().includes(q) ||
        p.away?.toLowerCase().includes(q) ||
        p.league?.toLowerCase().includes(q)
    );
  }, [query, predictions]);

  const featured = filteredPredictions.slice(0, 2);
  const rest = filteredPredictions.slice(2);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading predictions...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Predictions</h1>
            <p className="text-muted-foreground">AI-powered match analysis and predictions</p>
          </div>

          {/* SEARCH */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team or league..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Live Now" value={predictions.length} />
        <Stat label="Overall Accuracy" value={`${stats.accuracy}%`} highlight />
        <Stat label="Active Predictions" value={predictions.length} />
        <Stat label="Matches Analyzed" value={stats.won + stats.lost + stats.pending} />
      </div>

      {/* AI ACCURACY */}
      <div className="rounded-xl bg-card p-4 mb-6 border border-white/5">
        <div className="flex justify-between items-center mb-3">
          <span className="font-medium">AI Accuracy</span>
          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">{stats.accuracy}%</span>
        </div>

        <div className="grid grid-cols-4 text-sm text-muted-foreground">
          <span>✅ Won: {stats.won}</span>
          <span>❌ Lost: {stats.lost}</span>
          <span>⏳ Pending: {stats.pending}</span>
          <span>🔥 Streak: {stats.streak ?? 0}</span>
        </div>
      </div>

      {/* DAY TOGGLE */}
      <div className="flex gap-2 mb-8">
        {["today", "tomorrow"].map((d) => (
          <button
            key={d}
            onClick={() => setDay(d as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition
              ${day === d ? "bg-green-500 text-white" : "bg-muted hover:bg-muted/70"}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* FEATURED */}
      {featured.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 font-semibold">Featured Predictions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {featured.map((p) => (
              <AIPredictionCard key={p.id} prediction={p} />
            ))}
          </div>
        </div>
      )}

      {/* ALL */}
      <div>
        <h2 className="mb-4 font-semibold">All Daily Predictions ({rest.length})</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((p) => (
            <AIPredictionCard key={p.id} prediction={p} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

/* STAT CARD */
function Stat({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className="bg-card p-4 rounded-xl border border-white/5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${highlight ? "text-green-400" : ""}`}>{value}</div>
    </div>
  );
}
