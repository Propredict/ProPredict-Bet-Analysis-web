import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { Input } from "@/components/ui/input";
import { Search, Activity, Target, TrendingUp, BarChart3, CheckCircle2, XCircle, Clock, Flame, Cpu } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [query, setQuery] = useState("");
  const { predictions, loading } = useAIPredictions();
  const navigate = useNavigate();

  /* COMPUTE STATS FROM PREDICTIONS */
  const stats = useMemo(() => {
    const won = predictions.filter((p) => p.result_status === "won").length;
    const lost = predictions.filter((p) => p.result_status === "lost").length;
    const pending = predictions.filter((p) => p.result_status === "pending" || !p.result_status).length;
    const total = won + lost;
    const accuracy = total > 0 ? Math.round((won / total) * 100) : 0;
    const streak = 0;
    return { won, lost, pending, accuracy, streak };
  }, [predictions]);

  /* FILTER BY DAY */
  const dayFiltered = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return predictions.filter((p) => {
      if (!p.match_date) return day === "today";
      const matchDate = new Date(p.match_date);
      if (day === "today") {
        return matchDate.toDateString() === today.toDateString();
      } else {
        return matchDate.toDateString() === tomorrow.toDateString();
      }
    });
  }, [predictions, day]);

  /* SEARCH FILTER */
  const filteredPredictions = useMemo(() => {
    if (!query) return dayFiltered;
    const q = query.toLowerCase();
    return dayFiltered.filter(
      (p) =>
        p.home_team?.toLowerCase().includes(q) ||
        p.away_team?.toLowerCase().includes(q) ||
        p.league?.toLowerCase().includes(q)
    );
  }, [query, dayFiltered]);

  /* NORMALIZE PREDICTIONS FOR CARD */
  const normalizedPredictions = useMemo(() => {
    return filteredPredictions.map((p) => ({
      ...p,
      home: p.home_team,
      away: p.away_team,
      time: p.match_time || "TBD",
      home_pct: p.home_win || 33,
      draw_pct: p.draw || 33,
      away_pct: p.away_win || 33,
      pick: p.prediction,
    }));
  }, [filteredPredictions]);

  const featured = normalizedPredictions.slice(0, 4);
  const rest = normalizedPredictions.slice(4);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading predictions...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Predictions</h1>
              <p className="text-muted-foreground text-sm">AI-powered match analysis and predictions</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* SEARCH */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team or league..."
                className="pl-9 bg-card border-white/10 text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            
            {/* ML BADGE */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Powered by ML</span>
            </div>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Live Now"
          value={predictions.filter((p) => p.is_live).length || predictions.length}
          variant="red"
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Overall Accuracy"
          value={`${stats.accuracy}%`}
          variant="green"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Active Predictions"
          value={normalizedPredictions.length}
          variant="blue"
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Matches Analyzed"
          value={stats.won + stats.lost + stats.pending}
          variant="purple"
        />
      </div>

      {/* AI ACCURACY BAR */}
      <div className="rounded-xl bg-card p-4 mb-6 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">AI Accuracy</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">
            {stats.accuracy}%
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-green-400">Won: {stats.won}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-400">Lost: {stats.lost}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span className="text-yellow-400">Pending: {stats.pending}</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-orange-400">Streak: {stats.streak}</span>
          </div>
        </div>
      </div>

      {/* DAY TOGGLE */}
      <div className="flex gap-2 mb-6">
        {(["today", "tomorrow"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all
              ${
                day === d
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-card hover:bg-card/80 text-muted-foreground border border-white/5"
              }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* FEATURED PREDICTIONS */}
      {featured.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full" />
              Featured Predictions
            </h2>
            <span className="text-xs text-muted-foreground">Updated 20s ago</span>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {featured.map((p) => (
              <AIPredictionCard key={p.id} prediction={p} />
            ))}
          </div>
        </div>
      )}

      {/* ALL DAILY PREDICTIONS */}
      {rest.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-muted-foreground rounded-full" />
            All Daily Predictions ({rest.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map((p) => (
              <AIPredictionCard key={p.id} prediction={p} />
            ))}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {normalizedPredictions.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No predictions available</p>
          <p className="text-sm">Check back later for new AI predictions</p>
        </div>
      )}
    </DashboardLayout>
  );
}

/* STAT CARD COMPONENT */
function StatCard({
  icon,
  label,
  value,
  variant = "blue",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant?: "red" | "green" | "blue" | "purple";
}) {
  const variantStyles = {
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };

  const iconStyles = {
    red: "text-red-400",
    green: "text-green-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
  };

  return (
    <div className={`rounded-xl p-4 border ${variantStyles[variant]} backdrop-blur-sm`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-white/5 ${iconStyles[variant]}`}>{icon}</div>
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}
