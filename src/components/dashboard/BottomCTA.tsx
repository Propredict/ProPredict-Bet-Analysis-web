import { TrendingUp, Ticket, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function BottomCTA() {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          All Predictions
        </Button>
        <Button variant="outline" className="gap-2">
          <Ticket className="h-4 w-4" />
          Betting Tickets
        </Button>
        <Button className="gap-2 gradient-primary glow-primary">
          <Crown className="h-4 w-4" />
          Go Premium
        </Button>
      </div>
    </Card>
  );
}
