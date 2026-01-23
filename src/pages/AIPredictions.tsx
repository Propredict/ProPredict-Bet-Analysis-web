import { useState } from "react";
import { Brain, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAIPredictions } from "@/hooks/useAIPredictions";

const LEAGUES = ["Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1"];

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [league, setLeague] = useState<string | null>(null);

  const { predictions, loading } = useAIPredictions(day);

  const filtered = league ? predictions.filter((p) => p.league === league) : predictions;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">AI Predictions</h1>
            </div>
            <p className="text-muted-foreground">AI-powered predictions for upcoming matches</p>
          </div>

          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* DAY TABS */}
        <div className="flex gap-2">
          <Button
            className={cn(day === "today" && "bg-primary text-white")}
            variant="outline"
            onClick={() => setDay("today")}
          >
            Today
          </Button>
          <Button
            className={cn(day === "tomorrow" && "bg-primary text-white")}
            variant="outline"
            onClick={() => setDay("tomorrow")}
          >
            Tomorrow
          </Button>
        </div>

        {/* LEAGUES FILTER */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button size="sm" variant={league === null ? "default" : "outline"} onClick={() => setLeague(null)}>
            All
          </Button>

          {LEAGUES.map((l) => (
            <Button key={l} size="sm" variant={league === l ? "default" : "outline"} onClick={() => setLeague(l)}>
              {l}
            </Button>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <p className="text-muted-foreground">Loading predictions…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No predictions available</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <AIPredictionCard
                key={p.id}
                prediction={p}
                onUnlock={() => {
                  // kasnije: rewarded ad
                  console.log("Watch ad to unlock", p.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
