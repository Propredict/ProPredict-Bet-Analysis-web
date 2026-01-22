import { TrendingUp, Ticket, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export function BottomCTA() {
  const navigate = useNavigate();

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" className="gap-2" onClick={() => navigate("/ai-predictions")}>
          <TrendingUp className="h-4 w-4" />
          All Predictions
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => navigate("/betting-tips")}>
          <Ticket className="h-4 w-4" />
          Betting Tickets
        </Button>
        <Button className="gap-2 gradient-primary glow-primary" onClick={() => navigate("/get-premium")}>
          <Crown className="h-4 w-4" />
          Go Premium
        </Button>
      </div>
    </Card>
  );
}
