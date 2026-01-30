import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";

export function FeaturedPredictions() {
  const { data, isLoading, refetch } = useGlobalWinRate();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const accuracy = data?.accuracy ?? 0;
  const won = data?.won ?? 0;
  const lost = data?.lost ?? 0;
  const pending = data?.pending ?? 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Data refreshed",
        description: "Dashboard stats have been updated.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20">
            <TrendingUp className="text-primary w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">AI Performance</h2>
            <p className="text-[9px] text-muted-foreground">
              Global accuracy across all predictions
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Stats Card */}
      <Card className="p-3 bg-gradient-to-b from-card to-card/80 border-border/50 shadow-card">
        {/* Accuracy Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
          <span className="text-xs font-medium text-muted-foreground">Global Win Rate</span>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-primary">
              {isLoading ? "—" : `${accuracy}%`}
            </span>
            {!isLoading && accuracy >= 70 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                HOT
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center p-2 rounded-md bg-success/5 border border-success/10">
            <Check className="h-3.5 w-3.5 text-success mb-1" />
            <p className="text-xs font-semibold text-foreground">
              {isLoading ? "—" : won}
            </p>
            <p className="text-[9px] text-muted-foreground">Won</p>
          </div>

          <div className="flex flex-col items-center p-2 rounded-md bg-destructive/5 border border-destructive/10">
            <X className="h-3.5 w-3.5 text-destructive mb-1" />
            <p className="text-xs font-semibold text-foreground">
              {isLoading ? "—" : lost}
            </p>
            <p className="text-[9px] text-muted-foreground">Lost</p>
          </div>

          <div className="flex flex-col items-center p-2 rounded-md bg-muted/30 border border-border/50">
            <Clock className="h-3.5 w-3.5 text-muted-foreground mb-1" />
            <p className="text-xs font-semibold text-foreground">
              {isLoading ? "—" : pending}
            </p>
            <p className="text-[9px] text-muted-foreground">Pending</p>
          </div>

          <div className="flex flex-col items-center p-2 rounded-md bg-accent/5 border border-accent/10">
            <Flame className="h-3.5 w-3.5 text-accent mb-1" />
            <p className="text-xs font-semibold text-foreground">
              {!isLoading && accuracy >= 70 ? "🔥" : "—"}
            </p>
            <p className="text-[9px] text-muted-foreground">Trend</p>
          </div>
        </div>
      </Card>
    </section>
  );
}
