import { TrendingUp, Trophy, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export function BottomCTA() {
  const navigate = useNavigate();

  return (
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
          onClick={() => navigate("/winning-history")}
        >
          <Trophy className="h-3.5 w-3.5" />
          Prediction History
        </Button>
        <Button 
          className="gap-1.5 h-8 text-[10px] sm:text-xs px-4 gradient-premium text-white font-medium glow-primary hover:opacity-90 transition-opacity" 
          onClick={() => navigate("/get-premium")}
        >
          <Crown className="h-3.5 w-3.5" />
          Go Premium
        </Button>
      </div>
    </Card>
  );
}
