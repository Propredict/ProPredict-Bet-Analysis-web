import { Brain, RefreshCw, Target, BarChart3, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { AIPredictionCard } from "@/components/ai/AIPredictionCard";

export default function AIPredictions() {
  const { predictions, isLoading, refetch } = useAIPredictions();

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
            <p className="text-muted-foreground mt-1">AI-generated predictions for today’s matches</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Target className="text-primary" />
              <div>
                <p className="text-2xl font-bold">82%</p>
                <p className="text-xs text-muted-foreground">AI Accuracy</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-accent" />
              <div>
                <p className="text-2xl font-bold">{predictions.length}</p>
                <p className="text-xs text-muted-foreground">Today’s Predictions</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-primary" />
              <div>
                <p className="text-2xl font-bold">Live</p>
                <p className="text-xs text-muted-foreground">Real match data</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Content */}
        {isLoading ? (
          <Card className="p-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </Card>
        ) : predictions.length === 0 ? (
          <Card className="p-10 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No AI predictions yet</p>
            <p className="text-sm text-muted-foreground">AI will generate predictions when matches are available</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((match) => (
              <AIPredictionCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
