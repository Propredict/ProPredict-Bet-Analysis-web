import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { supabase } from "@/lib/supabase";

export default function AIPredictionsPage() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");

  const { predictions, loading } = useAIPredictions(day);

  // TEMP – kasnije vežeš na user subscription
  const isPremiumUser = false;

  // AI ACCURACY STATS
  const [stats, setStats] = useState<{
    won: number;
    lost: number;
    pending: number;
  } | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      const { data } = await supabase.from("ai_prediction_stats").select("*").single();

      if (data) setStats(data);
    };

    loadStats();
  }, []);

  const accuracy = stats && stats.won + stats.lost > 0 ? Math.round((stats.won / (stats.won + stats.lost)) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold">AI Predictions</h1>
          <p className="text-muted-foreground">AI predictions for today & tomorrow matches</p>
        </div>

        {/* AI ACCURACY */}
        {stats && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">AI Accuracy</span>
              <span className="font-bold">{accuracy}%</span>
            </div>

            <div className="w-full bg-muted h-2 rounded">
              <div className="bg-primary h-2 rounded" style={{ width: `${accuracy}%` }} />
            </div>

            <div className="text-sm text-muted-foreground flex gap-6">
              <span>✔ Won: {stats.won}</span>
              <span>❌ Lost: {stats.lost}</span>
              <span>⏳ Pending: {stats.pending}</span>
            </div>
          </div>
        )}

        {/* TOTAL MATCHES */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Total matches ({day === "today" ? "Today" : "Tomorrow"}): <strong>{predictions.length}</strong>
          </span>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          {["today", "tomorrow"].map((d) => (
            <button
              key={d}
              onClick={() => setDay(d as "today" | "tomorrow")}
              className={`px-4 py-2 rounded text-sm font-medium ${
                day === d ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {d === "today" ? "Today" : "Tomorrow"}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="text-muted-foreground">Loading AI predictions…</div>
        ) : predictions.length === 0 ? (
          <div className="rounded-lg border p-6 text-center text-muted-foreground">
            No AI predictions available yet.
            <br />
            Matches are currently being analyzed.
          </div>
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
