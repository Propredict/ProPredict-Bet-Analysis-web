import { TrendingUp, RefreshCw, Check, X, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTips } from "@/hooks/useTips";

export function FeaturedPredictions() {
  const tipsQuery = useTips(false);

  // ⛑️ HARD GUARD – ako hook nije spreman
  if (!tipsQuery) return null;

  const { tips = [], isLoading, refetch } = tipsQuery;

  const aiTips = Array.isArray(tips) ? tips.filter((t: any) => t?.ai_prediction === true) : [];

  const won = aiTips.filter((t: any) => t?.result === "won").length;
  const lost = aiTips.filter((t: any) => t?.result === "lost").length;
  const pending = aiTips.length - won - lost;

  const accuracy = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base md:text-lg font-semibold">Featured Predictions</h2>
            <p className="text-xs text-muted-foreground">AI performance overview</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch && refetch()} className="h-8 text-xs">
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      <Card className="p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">AI Accuracy</span>
          <span className="text-sm font-bold text-primary">{isLoading ? "—" : `${accuracy}%`}</span>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center text-xs">
          <div>
            <Check className="mx-auto h-3.5 w-3.5 text-success" />
            <p className="font-medium mt-1">{won}</p>
            <p className="text-muted-foreground">Won</p>
          </div>
          <div>
            <X className="mx-auto h-3.5 w-3.5 text-destructive" />
            <p className="font-medium mt-1">{lost}</p>
            <p className="text-muted-foreground">Lost</p>
          </div>
          <div>
            <Clock className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
            <p className="font-medium mt-1">{pending}</p>
            <p className="text-muted-foreground">Pending</p>
          </div>
          <div>
            <Flame className="mx-auto h-3.5 w-3.5 text-accent" />
            <p className="font-medium mt-1">{won >= 3 ? "HOT" : "-"}</p>
            <p className="text-muted-foreground">Streak</p>
          </div>
        </div>
      </Card>
    </section>
  );
}
