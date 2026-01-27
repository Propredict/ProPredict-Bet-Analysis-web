import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tv, CheckCircle, Clock } from "lucide-react";

interface AdModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

const AD_DURATION = 6; // seconds

export function AdModal({ isOpen, onComplete, onClose }: AdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSecondsLeft(AD_DURATION);
      setIsCompleted(false);
      return;
    }

    if (secondsLeft <= 0) {
      setIsCompleted(true);
      // Auto-close after showing completion
      const timeout = setTimeout(() => {
        onComplete();
        onClose();
      }, 1000);
      return () => clearTimeout(timeout);
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, secondsLeft, onComplete, onClose]);

  const progress = ((AD_DURATION - secondsLeft) / AD_DURATION) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md bg-card border-border p-0 overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Ad Container */}
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Sponsored Content
            </span>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-xs font-medium">
                {isCompleted ? "Done" : `${secondsLeft}s`}
              </span>
            </div>
          </div>

          {/* Ad Placeholder Area */}
          <div className="relative aspect-video bg-gradient-to-br from-muted via-muted/80 to-muted flex items-center justify-center">
            {isCompleted ? (
              <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                <div className="p-3 rounded-full bg-primary/20">
                  <CheckCircle className="h-10 w-10 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Ad Completed!</p>
                <p className="text-xs text-muted-foreground">Unlocking content...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10 animate-pulse">
                  <Tv className="h-12 w-12 text-primary/60" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Watching ad...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please wait to unlock content
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="px-4 py-3 bg-muted/30 border-t border-border">
            <Progress 
              value={progress} 
              className="h-2 bg-muted"
            />
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              {isCompleted 
                ? "Thank you for watching" 
                : "Ad cannot be skipped"
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
