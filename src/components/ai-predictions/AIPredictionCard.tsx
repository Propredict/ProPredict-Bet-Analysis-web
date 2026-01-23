import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  match: any;
  isAdminOrPremium: boolean;
  onWatchAd: () => void;
  onGoPremium: () => void;
}

export function AIPredictionCard({ match, isAdminOrPremium, onWatchAd, onGoPremium }: Props) {
  const isPro = match.is_premium;
  const canView = isAdminOrPremium || !isPro;

  const date = new Date(`${match.match_date}T${match.match_time || "12:00"}`);
  const dateLabel = date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-3">
        {/* HEADER */}
        <div className="flex justify-between">
          <div>
            <h3 className="font-semibold text-sm">
              {match.home_team} vs {match.away_team}
            </h3>
            <p className="text-xs text-muted-foreground">
              {match.league} · {dateLabel} · {match.match_time}
            </p>
          </div>

          {isPro && (
            <Badge className="bg-amber-500/20 text-amber-400">
              <Crown className="w-3 h-3 mr-1" /> PRO
            </Badge>
          )}
        </div>

        {/* PREDICTION */}
        <div className={cn("text-lg font-bold", !canView && "blur-sm select-none")}>{match.prediction}</div>

        <div className="text-sm text-muted-foreground">Confidence: {match.confidence}%</div>

        {/* ACTIONS */}
        {!canView && isPro && (
          <Button className="w-full bg-amber-500" onClick={onGoPremium}>
            <Crown className="w-4 h-4 mr-2" />
            Get Premium
          </Button>
        )}

        {!canView && !isPro && (
          <Button variant="outline" className="w-full" onClick={onWatchAd}>
            <Eye className="w-4 h-4 mr-2" />
            Watch Ad
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
