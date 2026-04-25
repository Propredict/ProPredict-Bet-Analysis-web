import { TrendingUp, BarChart3, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export function BottomCTA() {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      {/* Urgency + Premium CTA */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-[9px] sm:text-[10px] text-warning/80 font-medium">
          🔥 Limited daily premium picks available
        </p>
        <Button
          size="sm"
          className="h-8 text-xs sm:text-sm px-5 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 font-bold"
          onClick={() => navigate("/get-premium")}
        >
          <Crown className="h-3.5 w-3.5 mr-1" />
          Upgrade to Premium 🔥
        </Button>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground">
          Unlock highest confidence picks & VIP insights
        </p>
      </div>

      {/* Navigation links */}
      <Card className="p-3 bg-gradient-to-b from-card to-muted/20 border-border/50">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button 
            variant="ghost" 
            className="gap-1.5 h-8 text-[10px] sm:text-xs px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50" 
            onClick={() => navigate("/ai-predictions")}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            All Predictions
          </Button>
          <Button 
            variant="ghost" 
            className="gap-1.5 h-8 text-[10px] sm:text-xs px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50" 
            onClick={() => navigate("/league-statistics")}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            League Standings
          </Button>
        </div>
      </Card>
    </div>
  );
}
