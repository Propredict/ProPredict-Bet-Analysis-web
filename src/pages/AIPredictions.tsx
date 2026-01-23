import { Brain, RefreshCw, Sparkles, Loader2, Calendar, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";

export default function AIPredictions() {
  const { predictions, loading, dayTab, setDayTab, unlockPrediction } = useAIPredictions();

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

        {/* LIST */}
        {loading ? (
          <Card className="p-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </Card>
        ) : predictions.length === 0 ? (
          <Card className="p-10 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No matches available</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((p) => (
              <div key={p.id} className="space-y-2">
                {/* MATCH INFO (UVEK VIDLJIVO) */}
                <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {p.matchDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {p.matchTime}
                  </span>
                </div>

                <AIPredictionCard prediction={p} onUnlock={unlockPrediction} />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
