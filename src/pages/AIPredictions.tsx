import { Brain, RefreshCw, Activity, Sparkles, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";

const leagues = ["all", "Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1", "Champions League"];

export default function AIPredictions() {
  const { predictions, loading, dayTab, setDayTab, selectedLeague, setSelectedLeague, unlockPrediction } =
    useAIPredictions();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold">AI Predictions</h1>
            </div>
            <p className="text-muted-foreground">AI-powered predictions for upcoming matches</p>
          </div>

          <div className="flex gap-2">
            <Badge className="bg-primary/20 text-primary">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* TODAY / TOMORROW */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant={dayTab === "today" ? "default" : "outline"}
            onClick={() => setDayTab("today")}
          >
            Today
          </Button>
          <Button
            className="flex-1"
            variant={dayTab === "tomorrow" ? "default" : "outline"}
            onClick={() => setDayTab("tomorrow")}
          >
            Tomorrow
          </Button>
        </div>

        {/* LEAGUES */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {leagues.map((league) => (
            <Button
              key={league}
              size="sm"
              variant={selectedLeague === league ? "default" : "outline"}
              onClick={() => setSelectedLeague(league)}
            >
              {league === "all" ? "All Leagues" : league}
            </Button>
          ))}
        </div>

        {/* LIST */}
        {loading ? (
          <Card className="p-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </Card>
        ) : predictions.length === 0 ? (
          <Card className="p-10 text-center">
            <Activity className="h-12 w-12 mx-auto opacity-40 mb-3" />
            <p>No AI predictions available</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((p) => (
              <AIPredictionCard key={p.id} prediction={p} onUnlock={unlockPrediction} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
