import { TrendingUp, RefreshCw, Check, X, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTips } from "@/hooks/useTips";
export function FeaturedPredictions() {
  const tipsQuery = useTips(false);

  // ⛑️ HARD GUARD – ako hook nije spreman
  if (!tipsQuery) return null;
  const {
    tips = [],
    isLoading,
    refetch
  } = tipsQuery;
  const aiTips = Array.isArray(tips) ? tips.filter((t: any) => t?.ai_prediction === true) : [];
  const won = aiTips.filter((t: any) => t?.result === "won").length;
  const lost = aiTips.filter((t: any) => t?.result === "lost").length;
  const pending = aiTips.length - won - lost;
  const accuracy = won + lost > 0 ? Math.round(won / (won + lost) * 100) : 0;
  return <section className="space-y-1.5 sm:space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="text-primary w-[20px] h-[20px]" />
          <div>
            <h2 className="text-xs font-semibold sm:text-xl">Featured Predictions</h2>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">AI performance overview</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch && refetch()} className="h-6 text-[10px] px-1.5">
          <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
          Refresh
        </Button>
      </div>

      <Card className="p-2 sm:p-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs font-medium">AI Accuracy</span>
          <span className="text-[10px] sm:text-xs font-bold text-primary">{isLoading ? "—" : `${accuracy}%`}</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-[9px] sm:text-[10px]">
          <div>
            <Check className="mx-auto h-3 w-3 text-success" />
            <p className="font-medium mt-0.5">{won}</p>
            <p className="text-muted-foreground">Won</p>
          </div>
          <div>
            <X className="mx-auto h-3 w-3 text-destructive" />
            <p className="font-medium mt-0.5">{lost}</p>
            <p className="text-muted-foreground">Lost</p>
          </div>
          <div>
            <Clock className="mx-auto h-3 w-3 text-muted-foreground" />
            <p className="font-medium mt-0.5">{pending}</p>
            <p className="text-muted-foreground">Pending</p>
          </div>
          <div>
            <Flame className="mx-auto h-3 w-3 text-accent" />
            <p className="font-medium mt-0.5">{won >= 3 ? "HOT" : "-"}</p>
            <p className="text-muted-foreground">Streak</p>
          </div>
        </div>
      </Card>
    </section>;
}