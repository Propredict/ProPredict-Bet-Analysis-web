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
            <Lock className="h-7 w-7 text-amber-500" />
          </div>

          <DialogTitle className="text-lg font-bold leading-snug flex items-center gap-1.5 justify-center">
            <Flame className="h-5 w-5 text-orange-500" />
            Premium Winning Tickets are Locked
          </DialogTitle>

          <p className="text-sm text-muted-foreground leading-relaxed flex items-center gap-1.5 justify-center">
            <Trophy className="h-4 w-4 text-amber-500" />
            Others are already winning
          </p>

          {/* Feature list */}
          <div className="w-full text-left space-y-2 px-2">
            <p className="text-xs text-muted-foreground mb-1.5">Unlock now and get:</p>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>🎯 Top picks</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>⚡ Early access</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>📊 Full analysis</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
            <Clock className="h-3 w-3" />
            Updated just minutes ago
          </p>

          {/* CTA */}
          <Button
            onClick={handleUpgrade}
            className="w-full h-12 text-base bg-gradient-to-r from-amber-500 to-primary hover:opacity-90 text-white font-semibold rounded-xl animate-pulse"
          >
            👉 Unlock Winning Tickets
          </Button>

          <button
            onClick={handleClose}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors pb-1"
          >
            Continue as Free
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
