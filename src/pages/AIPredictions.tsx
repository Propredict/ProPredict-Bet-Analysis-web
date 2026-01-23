import { useState } from "react";
import { Brain, RefreshCw, Target, BarChart3, TrendingUp, Sparkles, Loader2, Activity, LineChart, GitBranch, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { AIStatsCard } from "@/components/ai-predictions/AIStatsCard";
import { mockAIPredictions, mockStats } from "@/components/ai-predictions/mockData";
import type { AIPrediction } from "@/components/ai-predictions/types";

const howItWorksData = [
  {
    icon: LineChart,
    title: "Data Analysis",
    description: "Analyzes 50+ data points per match",
    iconColor: "text-primary",
    bgColor: "bg-primary/20",
  },
  {
    icon: GitBranch,
    title: "Pattern Recognition",
    description: "Identifies winning patterns from history",
    iconColor: "text-accent",
    bgColor: "bg-accent/20",
  },
  {
    icon: Calculator,
    title: "Probability Engine",
    description: "Calculates accurate win probabilities",
    iconColor: "text-primary",
    bgColor: "bg-primary/20",
  },
];

export default function AIPredictions() {
  const [predictions, setPredictions] = useState<AIPrediction[]>(mockAIPredictions);
  const [isLoading] = useState(false);

  const handleRefresh = () => {
    // UI only - will be wired later
  };

  const handleUnlock = (id: string) => {
    setPredictions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isLocked: false } : p))
    );
  };

  const livePredictions = predictions.filter((p) => p.isLive);
  const todayPredictions = predictions.filter((p) => !p.isLive);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Brain className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold">AI Predictions</h1>
            </div>
            <p className="text-muted-foreground mt-1">AI-powered predictions for today's matches</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AIStatsCard icon={Activity} label="Live Matches" value={mockStats.liveMatches} iconClassName="bg-destructive/20 text-destructive" />
          <AIStatsCard icon={Target} label="AI Accuracy" value={`${mockStats.aiAccuracy}%`} iconClassName="bg-primary/20 text-primary" />
          <AIStatsCard icon={BarChart3} label="Today's Predictions" value={predictions.length} iconClassName="bg-accent/20 text-accent" />
          <AIStatsCard icon={TrendingUp} label="Matches Analyzed" value={mockStats.matchesAnalyzed} iconClassName="bg-muted text-muted-foreground" />
        </div>

        {/* Live Predictions */}
        {livePredictions.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-destructive" />
              <h2 className="text-lg font-semibold">Live AI Predictions</h2>
              <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {livePredictions.map((match) => (
                <AIPredictionCard
                  key={match.id}
                  prediction={match}
                  onUnlock={handleUnlock}
                />
              ))}
            </div>
          </section>
        )}

        {/* Today's Predictions */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Today's AI Predictions</h2>
          </div>

          {isLoading ? (
            <Card className="p-10 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
          ) : todayPredictions.length === 0 ? (
            <Card className="p-10 text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No AI predictions yet</p>
              <p className="text-sm text-muted-foreground">AI will generate predictions when matches are available</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayPredictions.map((match) => (
                <AIPredictionCard
                  key={match.id}
                  prediction={match}
                  onUnlock={handleUnlock}
                />
              ))}
            </div>
          )}
        </section>

        {/* How Our AI Works */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">How Our AI Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {howItWorksData.map((item, index) => (
              <Card 
                key={index} 
                className="p-6 bg-card border-border hover:border-primary/30 transition-all duration-300 text-center"
              >
                <div className={`w-14 h-14 rounded-2xl ${item.bgColor} flex items-center justify-center mx-auto mb-4`}>
                  <item.icon className={`h-7 w-7 ${item.iconColor}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
