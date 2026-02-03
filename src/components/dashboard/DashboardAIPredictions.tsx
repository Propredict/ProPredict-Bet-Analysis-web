import { useNavigate } from "react-router-dom";
import { Brain, Loader2, ChevronRight, Sparkles, TrendingUp, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIPredictions } from "@/hooks/useAIPredictions";

export function DashboardAIPredictions() {
  const navigate = useNavigate();
  const { predictions, loading } = useAIPredictions("today");

  // Show top 3 predictions sorted by confidence
  const displayedPredictions = [...predictions]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(15,155,142,0.15)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-primary">AI Predictions</h2>
            <p className="text-[9px] text-muted-foreground">AI-powered match analysis</p>
          </div>
        </div>
        {predictions.length > 0 && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {predictions.length} matches
          </Badge>
        )}
      </div>

      {/* Predictions Content */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : displayedPredictions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedPredictions.map((prediction) => (
            <Card 
              key={prediction.id} 
              className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer p-4"
              onClick={() => navigate("/ai-predictions")}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-xs">
                  {prediction.league || "Unknown League"}
                </Badge>
                <span className="text-xs text-muted-foreground">{prediction.match_time}</span>
              </div>

              {/* Teams */}
              <h3 className="font-semibold text-sm text-foreground mb-3 line-clamp-1">
                {prediction.home_team} vs {prediction.away_team}
              </h3>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-muted/20 rounded-lg">
                  <TrendingUp className="h-3 w-3 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Home</p>
                  <p className="text-sm font-bold text-primary">{prediction.home_win}%</p>
                </div>
                <div className="text-center p-2 bg-muted/20 rounded-lg">
                  <Sparkles className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Draw</p>
                  <p className="text-sm font-bold text-muted-foreground">{prediction.draw}%</p>
                </div>
                <div className="text-center p-2 bg-muted/20 rounded-lg">
                  <Target className="h-3 w-3 mx-auto mb-1 text-accent" />
                  <p className="text-xs text-muted-foreground">Away</p>
                  <p className="text-sm font-bold text-accent">{prediction.away_win}%</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs">
                  {prediction.prediction}
                </Badge>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Confidence:</span>
                  <span className="text-sm font-bold text-success">{prediction.confidence}%</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="empty-state-compact bg-card/50 border-border/50">
          <div className="flex flex-col items-center gap-1">
            <Brain className="h-5 w-5 text-primary/50" />
            <p className="text-[10px] text-muted-foreground">No AI predictions available today</p>
          </div>
        </Card>
      )}

      {/* Centered See All CTA */}
      {predictions.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="default"
            className="px-8 group"
            onClick={() => navigate("/ai-predictions")}
          >
            <span>See all AI Predictions</span>
            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      )}
    </section>
  );
}
