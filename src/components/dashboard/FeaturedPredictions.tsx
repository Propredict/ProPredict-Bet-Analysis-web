import { TrendingUp, RefreshCw, Check, X, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function FeaturedPredictions() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Featured Predictions</h2>
            <p className="text-sm text-muted-foreground">AI-powered match analysis • Pull down to refresh</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Updated 11:55 AM</span>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* AI Accuracy Card */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-medium text-foreground">AI Accuracy</span>
          </div>
          <div className="flex items-center justify-center h-10 w-16 rounded-full bg-destructive text-destructive-foreground font-bold">
            0%
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Check className="h-4 w-4" />
              <span className="font-semibold">0</span>
            </div>
            <p className="text-xs text-muted-foreground">Won</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="font-semibold">0</span>
            </div>
            <p className="text-xs text-muted-foreground">Lost</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-semibold">500</span>
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-accent">
              <Flame className="h-4 w-4" />
              <span className="font-semibold">0</span>
            </div>
            <p className="text-xs text-muted-foreground">Streak</p>
          </div>
        </div>
      </Card>
    </section>
  );
}
