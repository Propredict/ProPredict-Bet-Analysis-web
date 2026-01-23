import { useState } from "react";
import { Brain, RefreshCw, Sparkles, Activity, Target, BarChart3, Zap, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { AIStatsCard } from "@/components/ai-predictions/AIStatsCard";
import { mockAIPredictions, mockStats } from "@/components/ai-predictions/mockData";
import { toast } from "sonner";

export default function AIPredictions() {
  const [predictions, setPredictions] = useState(mockAIPredictions);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const livePredictions = predictions.filter((p) => p.isLive);
  const upcomingPredictions = predictions.filter((p) => !p.isLive);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.success("Predictions refreshed");
  };

  const handleUnlock = async (id: string) => {
    toast.info("Playing rewarded ad...", { duration: 2000 });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setPredictions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isLocked: false } : p))
    );
    toast.success("Prediction unlocked!");
  };

  const handleSubscribe = () => {
    toast.info("Redirecting to subscription page...");
    // Will be wired to actual subscription flow
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Predictions</h1>
              <p className="text-muted-foreground text-sm">AI-powered predictions for today's matches</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AI Powered
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AIStatsCard
            icon={Radio}
            value={mockStats.liveMatches}
            label="Live Matches"
            iconClassName="bg-destructive/20 text-destructive"
          />
          <AIStatsCard
            icon={Target}
            value={`${mockStats.aiAccuracy}%`}
            label="AI Accuracy"
            iconClassName="bg-primary/20 text-primary"
          />
          <AIStatsCard
            icon={Zap}
            value={mockStats.todaysPredictions}
            label="Today's Predictions"
            iconClassName="bg-accent/20 text-accent"
          />
          <AIStatsCard
            icon={BarChart3}
            value={mockStats.matchesAnalyzed.toLocaleString()}
            label="Matches Analyzed"
            iconClassName="bg-warning/20 text-warning"
          />
        </div>

        {/* Live AI Predictions */}
        {livePredictions.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-destructive animate-pulse" />
              <h2 className="text-lg font-semibold text-foreground">Live AI Predictions</h2>
              <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                {livePredictions.length} Live
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {livePredictions.map((prediction) => (
                <AIPredictionCard
                  key={prediction.id}
                  prediction={prediction}
                  onUnlock={handleUnlock}
                  onSubscribe={handleSubscribe}
                />
              ))}
            </div>
          </section>
        )}

        {/* Today's AI Predictions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Today's AI Predictions</h2>
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              {upcomingPredictions.length} Predictions
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingPredictions.map((prediction) => (
              <AIPredictionCard
                key={prediction.id}
                prediction={prediction}
                onUnlock={handleUnlock}
                onSubscribe={handleSubscribe}
              />
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
