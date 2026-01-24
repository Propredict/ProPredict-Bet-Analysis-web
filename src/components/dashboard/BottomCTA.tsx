import { TrendingUp, Ticket, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export function BottomCTA() {
  const navigate = useNavigate();

  return (
    <Card className="p-2 sm:p-3 bg-card border-border">
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <Button variant="outline" className="gap-1 h-6 sm:h-7 text-[10px] sm:text-xs px-2" onClick={() => navigate("/ai-predictions")}>
          <TrendingUp className="h-3 w-3" />
          All Predictions
        </Button>
        <Button variant="outline" className="gap-1 h-6 sm:h-7 text-[10px] sm:text-xs px-2" onClick={() => navigate("/betting-tips")}>
          <Ticket className="h-3 w-3" />
          Betting Tickets
        </Button>
        <Button className="gap-1 h-6 sm:h-7 text-[10px] sm:text-xs px-2 gradient-primary glow-primary" onClick={() => navigate("/get-premium")}>
          <Crown className="h-3 w-3" />
          Go Premium
        </Button>
      </div>
    </Card>
  );
}
