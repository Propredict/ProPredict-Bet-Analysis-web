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

    </div>
  );
}
