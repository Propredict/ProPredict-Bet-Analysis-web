import { TrendingUp, RefreshCw, Check, X, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTips } from "@/hooks/useTips";

export function FeaturedPredictions() {
  const { tips = [], isLoading, refetch } = useTips(false);

  const aiTips = tips.filter((t) => t.ai_prediction);

  const won = aiTips.filter((t) => t.result === "won").length;
  const lost = aiTips.filter((t) => t.result === "lost").length;
  const pending = aiTips.length - won - lost;

  const accuracy = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Featured AI Predictions</h2>
            <p className="text-sm text-muted-foreground">AI performance overview</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium">AI Accuracy</span>
          <span className="font-bold text-primary">{isLoading ? "—" : `${accuracy}%`}</span>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center text-sm">
          <div>
            <Check className="mx-auto h-4 w-4 text-green-500" />
            <p>{won}</p>
            <p className="text-muted-foreground">Won</p>
          </div>
          <div>
            <X className="mx-auto h-4 w-4 text-red-500" />
            <p>{lost}</p>
            <p className="text-muted-foreground">Lost</p>
          </div>
          <div>
            <Clock className="mx-auto h-4 w-4 text-gray-400" />
            <p>{pending}</p>
            <p className="text-muted-foreground">Pending</p>
          </div>
          <div>
            <Flame className="mx-auto h-4 w-4 text-orange-500" />
            <p>{won >= 3 ? "HOT" : "-"}</p>
            <p className="text-muted-foreground">Streak</p>
          </div>
        </div>
      </Card>
    </section>
  );
}
