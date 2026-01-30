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
    <section className="space-y-3">
      {/* Luxury Header */}
      <div className="luxury-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-gold/20 to-gold-dark/10 border border-gold/30 glow-gold-subtle">
              <TrendingUp className="text-gold w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gold-gradient">AI Performance</h2>
              <p className="text-[10px] text-muted-foreground">
                Global accuracy across all predictions
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-8 text-[10px] text-gold/70 hover:text-gold hover:bg-gold/10 border border-gold/20"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Luxury Stats Card */}
      <div className="luxury-card p-4">
        {/* Accuracy Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gold/10">
          <span className="text-xs font-medium text-muted-foreground">Global Win Rate</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-gold-gradient">
              {isLoading ? "—" : `${accuracy}%`}
            </span>
            {!isLoading && accuracy >= 70 && (
              <span className="luxury-badge flex items-center gap-1">
                <Flame className="h-3 w-3" />
                HOT
              </span>
            )}
          </div>
        </div>

        {/* Luxury Stats Grid */}
        <div className="grid grid-cols-4 gap-2.5">
          <div className="luxury-stat">
            <div className="p-1.5 rounded-md bg-success/20 mb-1.5">
              <Check className="h-4 w-4 text-success" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {isLoading ? "—" : won}
            </p>
            <p className="text-[9px] text-muted-foreground">Won</p>
          </div>

          <div className="luxury-stat">
            <div className="p-1.5 rounded-md bg-destructive/20 mb-1.5">
              <X className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {isLoading ? "—" : lost}
            </p>
            <p className="text-[9px] text-muted-foreground">Lost</p>
          </div>

          <div className="luxury-stat">
            <div className="p-1.5 rounded-md bg-gold/20 mb-1.5">
              <Clock className="h-4 w-4 text-gold" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {isLoading ? "—" : pending}
            </p>
            <p className="text-[9px] text-muted-foreground">Pending</p>
          </div>

          <div className="luxury-stat glow-gold-animated">
            <div className="p-1.5 rounded-md bg-gold/20 mb-1.5">
              <Flame className="h-4 w-4 text-gold" />
            </div>
            <p className="text-sm font-bold text-gold">
              {!isLoading && accuracy >= 70 ? "🔥" : "—"}
            </p>
            <p className="text-[9px] text-muted-foreground">Trend</p>
          </div>
        </div>
      </div>
    </section>
  );
}
