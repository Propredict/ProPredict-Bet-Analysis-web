import { X, Download, Crown, Smartphone, Users, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.propredict.app&source=web_unlock_free";

interface FreeInAppPopupProps {
  open: boolean;
  onClose: () => void;
  onContinueWithPro?: () => void;
}

export function FreeInAppPopup({ open, onClose, onContinueWithPro }: FreeInAppPopupProps) {
  const handleDownload = () => {
    window.open(PLAY_STORE_URL, "_blank");
    onClose();
  };

  const handleContinuePro = () => {
    onClose();
    onContinueWithPro?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[340px] p-0 gap-0 border-0 !bg-gradient-to-b !from-card !to-card overflow-hidden rounded-2xl shadow-2xl [&>button]:hidden"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <div className="px-5 pt-7 pb-5 text-center space-y-4">
          {/* Icon */}
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto">
              <span className="text-4xl">🎁</span>
            </div>
            <Sparkles className="absolute -top-1 -right-2 h-4 w-4 text-primary animate-pulse" />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <DialogTitle className="text-lg font-extrabold text-foreground leading-snug">
              Unlock for FREE in our app
            </DialogTitle>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Watch a short ad and unlock this prediction instantly.
              <br />
              <span className="font-semibold text-primary">No subscription needed.</span>
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-2 text-left bg-muted/30 rounded-xl p-3 border border-border/30">
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-4 w-4 text-primary shrink-0" />
              <span className="text-[11px] text-foreground">Watch a 15s ad → get instant access</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-[11px] text-foreground">Unlock all Pro picks daily for free</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <span className="text-[11px] text-muted-foreground">Join thousands of users unlocking picks daily</span>
            </div>
          </div>

          {/* Primary CTA */}
          <Button
            onClick={handleDownload}
            className="w-full h-11 text-sm font-bold bg-gradient-to-r from-primary to-emerald-500 hover:opacity-90 text-white border-0 shadow-lg shadow-primary/20 gap-2"
          >
            <Download className="h-4 w-4" />
            Download App & Unlock
          </Button>

          {/* Secondary CTA */}
          <Button
            variant="ghost"
            onClick={handleContinuePro}
            className="w-full h-8 text-[11px] text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Crown className="h-3 w-3" />
            Continue with Pro subscription
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
