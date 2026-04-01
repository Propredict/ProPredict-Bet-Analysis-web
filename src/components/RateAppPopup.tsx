import { useState } from "react";
import { Star, X, Send, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.propredict.app";

interface RateAppPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (stars: number, feedback?: string) => Promise<any>;
  submitting: boolean;
}

type Step = "stars" | "feedback" | "thanks";

export function RateAppPopup({ open, onClose, onSubmit, submitting }: RateAppPopupProps) {
  const [step, setStep] = useState<Step>("stars");
  const [selectedStars, setSelectedStars] = useState(0);
  const [hoveredStars, setHoveredStars] = useState(0);
  const [feedback, setFeedback] = useState("");

  const handleStarSelect = async (stars: number) => {
    setSelectedStars(stars);

    if (stars === 5) {
      // Open Play Store first, then reward
      try {
        if (window.Android?.openExternal) {
          window.Android.openExternal(PLAY_STORE_URL);
        } else {
          window.open(PLAY_STORE_URL, "_blank");
        }
      } catch {}

      const result = await onSubmit(5);
      if (result?.success && result?.rewarded) {
        setStep("thanks");
      } else {
        onClose();
      }
    } else {
      // Show feedback form for 1-4 stars
      setStep("feedback");
    }
  };

  const handleFeedbackSubmit = async () => {
    await onSubmit(selectedStars, feedback || undefined);
    toast({
      title: "Thank you! 🙏",
      description: "Your feedback helps us improve.",
    });
    onClose();
  };

  const handleClose = () => {
    setStep("stars");
    setSelectedStars(0);
    setHoveredStars(0);
    setFeedback("");
    onClose();
  };

  const displayStars = hoveredStars || selectedStars;

  return (
    <Dialog open={open} onOpenChange={() => { /* prevent backdrop close */ }}>
      <DialogContent
        className="max-w-[340px] p-0 gap-0 border-0 !bg-white overflow-hidden rounded-2xl shadow-2xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {step === "stars" && (
          <div className="px-5 pt-6 pb-5 text-center space-y-4">
            {/* Title */}
            <div>
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 mb-3">
                <Star className="h-7 w-7 text-amber-500 fill-amber-500" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Enjoying ProPredict? ⭐
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-1">
                Rate the app and earn <span className="font-bold text-amber-600">+20 points</span> 🎁
              </p>
            </div>

            {/* Star selector */}
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredStars(star)}
                  onMouseLeave={() => setHoveredStars(0)}
                  onClick={() => handleStarSelect(star)}
                  disabled={submitting}
                  className="transition-transform hover:scale-125 active:scale-95 disabled:opacity-50"
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      star <= displayStars
                        ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                        : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-400">Tap a star to rate</p>

            {/* Maybe Later */}
            <button
              className="w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
              onClick={handleClose}
            >
              Maybe Later
            </button>
          </div>
        )}

        {step === "feedback" && (
          <div className="px-5 pt-6 pb-5 space-y-4">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-blue-400/20 to-blue-500/10 mb-3">
                <MessageSquare className="h-6 w-6 text-blue-500" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                We appreciate your feedback 🙏
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-1">
                Tell us what we can improve:
              </p>
            </div>

            {/* Stars display */}
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= selectedStars
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>

            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What could we do better? (optional)"
              className="min-h-[80px] text-sm border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"
              maxLength={500}
            />

            <Button
              onClick={handleFeedbackSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>

            <button
              className="w-full py-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
              onClick={handleClose}
            >
              Skip
            </button>
          </div>
        )}

        {step === "thanks" && (
          <div className="px-5 pt-8 pb-6 text-center space-y-3">
            <div className="text-4xl animate-bounce">🎉</div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Thanks for your support!
            </DialogTitle>
            <p className="text-sm text-amber-600 font-bold">
              +20 points added 🎁
            </p>
            <div className="flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-6 w-6 text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]"
                />
              ))}
            </div>
            <Button
              onClick={handleClose}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold"
            >
              Awesome! 🚀
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
