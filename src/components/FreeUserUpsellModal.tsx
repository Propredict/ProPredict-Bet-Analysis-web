import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, X, Ticket, Brain } from "lucide-react";
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
    sessionStorage.setItem(STORAGE_KEY, "true");
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
            Unlock All Tickets &amp; Predictions
          </DialogTitle>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Get full access to every Daily, Pro &amp; Premium ticket and AI prediction with a single subscription.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary rounded-full px-2.5 py-1">
              <Ticket className="h-3 w-3" /> All Tickets
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary rounded-full px-2.5 py-1">
              <Brain className="h-3 w-3" /> AI Predictions
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/10 text-amber-500 rounded-full px-2.5 py-1">
              <Crown className="h-3 w-3" /> Premium Analysis
            </span>
          </div>

          {/* CTA */}
          <Button
            onClick={handleUpgrade}
            className="w-full h-11 bg-gradient-to-r from-amber-500 to-primary hover:opacity-90 text-white font-semibold rounded-xl"
          >
            View Plans
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
