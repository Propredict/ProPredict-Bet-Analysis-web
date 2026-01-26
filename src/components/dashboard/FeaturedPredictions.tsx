import {
  TrendingUp,
  RefreshCw,
  Check,
  X,
  Clock,
  Flame,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGlobalWinRate } from "@/hooks/useGlobalWinRate";

export function FeaturedPredictions() {
  const { data, isLoading, refetch } = useGlobalWinRate();

  const accuracy = data?.accuracy ?? 0;

  return (
    <section className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-primary w-5 h-5" />
          <div>
            <h2 className="text-sm font-semibold">Featured Predictions</h2>
            <p className="text-[10px] text-muted-foreground">
              AI performance overview (all tips & tickets)
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="h-7 text-[10px]"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Card */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium">Global Accuracy</span>
          <span className="text-xs font-bold text-primary">
            {isLoading ? "—" : `${accuracy}%`}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
          <div>
            <Check className="mx-auto h-3 w-3 text-success" />
            <p className="font-medium">—</p>
            <p className="text-muted-foreground">Won</p>
          </div>

          <div>
            <X className="mx-auto h-3 w-3 text-destructive" />
            <p className="font-medium">—</p>
            <p className="text-muted-foreground">Lost</p>
          </div>

          <div>
            <Clock className="mx-auto h-3 w-3 text-muted-foreground" />
            <p className="font-medium">—</p>
            <p className="text-muted-foreground">Pending</p>
          </div>

          <div>
            <Flame className="mx-auto h-3 w-3 text-accent" />
            <p className="font-medium">
              {!isLoading && accuracy >= 70 ? "HOT" : "—"}
            </p>
            <p className="text-muted-foreground">Trend</p>
          </div>
        </div>
      </Card>
    </section>
  );
}
