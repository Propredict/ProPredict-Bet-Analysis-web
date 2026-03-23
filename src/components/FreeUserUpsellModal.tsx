import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, X, Ticket, Brain, Flame, Trophy, Zap, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserPlan } from "@/hooks/useUserPlan";

export function FreeUserUpsellModal() {
  const { plan, isLoading } = useUserPlan();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (plan !== "free") return;

    const timer = setTimeout(() => setIsOpen(true), 800);
    return () => clearTimeout(timer);
  }, [plan, isLoading]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleUpgrade = () => {
    setIsOpen(false);
    navigate("/get-premium");
  };

  if (isLoading || plan !== "free") return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl p-0 max-w-[340px] sm:max-w-[380px]">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 pt-7 flex flex-col items-center text-center gap-4">
          {/* Icon */}
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-500/20 to-primary/20 flex items-center justify-center">
            <Crown className="h-7 w-7 text-amber-500" />
          </div>

          <DialogTitle className="text-lg font-bold leading-snug">
            Don't miss today's winning tickets
          </DialogTitle>

          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground">Premium</span> users already have access
          </p>

          {/* Feature list */}
          <div className="w-full text-left space-y-1.5 px-2">
            <p className="text-xs text-muted-foreground mb-1">Unlock now and get:</p>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Ticket className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Top winning picks</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Brain className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Early access</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Full analysis</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Get today's tickets</p>

          {/* CTA */}
          <Button
            onClick={handleUpgrade}
            className="w-full h-11 bg-gradient-to-r from-amber-500 to-primary hover:opacity-90 text-white font-semibold rounded-xl"
          >
            Unlock Premium
          </Button>

          <button
            onClick={handleClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors pb-1"
          >
            Continue as Free
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
