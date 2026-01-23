import { useEffect, useState } from "react";
import { Search, Activity, BarChart3, Target, Layers } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { supabase } from "@/lib/supabase";

export default function AIPredictionsPage() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const { predictions, loading } = useAIPredictions(day);

  // TEMP – kasnije vežeš na auth / subscription
  const isPremiumUser = false;

  // WATCH AD UNLOCK
  const [unlockedMatches, setUnlockedMatches] = useState<string[]>([]);

  // SEARCH
  const [search, setSearch] = useState("");

  const handleWatchAd = (id: string) => {
    setUnlockedMatches((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

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

  // ✅ SAFE SEARCH FILTER (NO RUNTIME ERRORS)
  const filtered = predictions.filter((p) => {
    const q = search.toLowerCase();

    return (
      (p.homeTeam ?? "").toLowerCase().includes(q) ||
      (p.awayTeam ?? "").toLowerCase().includes(q) ||
      (p.league ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="text-primary" />
              AI Predictions
            </h1>
            <p className="text-muted-foreground">AI-powered match analysis and predictions</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team or league..."
                className="pl-9 pr-3 py-2 rounded-md bg-muted text-sm outline-none"
              />
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-400">Powered by ML</span>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Activity />} label="Live Now" value={filtered.length} />
          <StatCard icon={<Target />} label="Overall Accuracy" value={`${accuracy}%`} />
          <StatCard icon={<BarChart3 />} label="Active Predictions" value={filtered.length} />
          <StatCard
            icon={<Layers />}
            label="Matches Analyzed"
            value={stats ? stats.pending + stats.won + stats.lost : 0}
          />
        </div>

        {/* AI ACCURACY */}
        {stats && (
          <div className="rounded-xl border p-6 bg-gradient-to-r from-background to-muted/40">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">AI Accuracy</span>
              <span className="px-3 py-1 rounded-full bg-primary text-white text-xs">{accuracy}%</span>
            </div>

            <div className="h-2 w-full bg-muted rounded mb-4">
              <div className="h-full bg-primary rounded" style={{ width: `${accuracy}%` }} />
            </div>

            <div className="grid grid-cols-3 text-sm text-muted-foreground">
              <span>✔ Won: {stats.won}</span>
              <span>❌ Lost: {stats.lost}</span>
              <span>⏳ Pending: {stats.pending}</span>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-2">
          {(["today", "tomorrow"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                day === d ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {d === "today" ? "Today" : "Tomorrow"}
            </button>
          ))}
        </div>

        {/* GRID */}
        {loading ? (
          <p className="text-muted-foreground">Loading predictions…</p>
        ) : filtered.length === 0 ? (
          <div className="border rounded-lg p-6 text-center text-muted-foreground">No predictions available.</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <AIPredictionCard
                key={p.id}
                prediction={{
                  ...p,
                  isLocked: p.isLocked && !unlockedMatches.includes(p.id) && !isPremiumUser,
                }}
                isPremiumUser={isPremiumUser}
                onWatchAd={() => handleWatchAd(p.id)}
                onBuyPremium={() => console.log("BUY PREMIUM")}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ------------------ STAT CARD ------------------ */
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border p-4 flex items-center gap-4 bg-card">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
