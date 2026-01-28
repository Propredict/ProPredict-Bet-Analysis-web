import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Unlock, CheckCircle, Loader2 } from "lucide-react";

interface AdModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

const LOADING_DURATION = 3; // seconds

export function AdModal({ isOpen, onComplete, onClose }: AdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(LOADING_DURATION);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSecondsLeft(LOADING_DURATION);
      setIsCompleted(false);
      return;
    }

    if (secondsLeft <= 0) {
      setIsCompleted(true);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, secondsLeft]);

  const handleContinue = () => {
    onComplete();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md bg-card border-border p-0 overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col p-6">
          {/* Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-primary/20">
              <Unlock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Unlock Premium Prediction
            </h2>
          </div>

          {/* Body */}
          <p className="text-sm text-muted-foreground mb-6">
            Watch a short promotional message to unlock this prediction.
            This helps us keep ProPredict free and improve our AI analysis.
          </p>

          {/* State Content */}
          <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-lg mb-6">
            {isCompleted ? (
              <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                <div className="p-3 rounded-full bg-primary/20">
                  <CheckCircle className="h-10 w-10 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Prediction unlocked!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You now have access to this match analysis.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading content…</p>
              </div>
            )}
          </div>

          {/* Continue Button - Only shown after completion */}
          {isCompleted && (
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleContinue}
            >
              Continue
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
