import { TrendingUp, RefreshCw, Check, X, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTips } from "@/hooks/useTips";

export function FeaturedPredictions() {
  const { tips, isLoading, refetch } = useTips(false);

  const aiTips = tips.filter((t) => t.ai_prediction);

  const won = aiTips.filter((t) => t.result === "won").length;
  const lost = aiTips.filter((t) => t.result === "lost").length;
  const pending = aiTips.filter((t) => t.result === "pending").length;

  const total = aiTips.length;
  const accuracy = total > 0 ? Math.round((won / (won + lost || 1)) * 100) : 0;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Featured AI Predictions</h2>
            <p className="text-sm text-muted-foreground">AI-powered performance overview</p>
          </div>
        </div>

        <Button variant="outline" size="sm" className="gap-2" onClick={refetch}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-medium">AI Accuracy</span>
          </div>

          <div className="flex items-center justify-center h-10 w-20 rounded-full bg-primary text-primary-foreground font-bold">
            {isLoading ? "—" : `${accuracy}%`}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-success">
              <Check className="h-4 w-4" />
              <span className="font-semibold">{won}</span>
            </div>
            <p className="text-xs text-muted-foreground">Won</p>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 text-destructive">
              <X className="h-4 w-4" />
              <span className="font-semibold">{lost}</span>
            </div>
            <p className="text-xs text-muted-foreground">Lost</p>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-semibold">{pending}</span>
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 text-accent">
              <Flame className="h-4 w-4" />
              <span className="font-semibold">{won >= 3 ? "HOT" : "—"}</span>
            </div>
            <p className="text-xs text-muted-foreground">Streak</p>
          </div>
        </div>
      </Card>
    </section>
  );
}
