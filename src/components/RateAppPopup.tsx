import { useState } from "react";
import { Star, X, Send, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
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

type Step = "prefilter" | "stars" | "redirect" | "feedback" | "thanks";

export function RateAppPopup({ open, onClose, onSubmit, submitting }: RateAppPopupProps) {
  const [step, setStep] = useState<Step>("prefilter");
  const [selectedStars, setSelectedStars] = useState(0);
  const [hoveredStars, setHoveredStars] = useState(0);
  const [feedback, setFeedback] = useState("");

  const handleStarSelect = async (stars: number) => {
    setSelectedStars(stars);
    if (stars >= 3) {
      setStep("redirect");
    } else {
      setStep("feedback");
    }
  };

  const handleGoToPlayStore = async () => {
    try {
      if (window.Android?.openExternal) {
        window.Android.openExternal(PLAY_STORE_URL);
      } else {
        window.open(PLAY_STORE_URL, "_blank");
      }
    } catch {}
    const result = await onSubmit(selectedStars);
    if (result?.success && result?.rewarded) {
      setStep("thanks");
    } else {
      onClose();
    }
  };

  const handleFeedbackSubmit = async () => {
    await onSubmit(selectedStars, feedback || undefined);
    toast({ title: "Thank you! 🙏", description: "Your feedback helps us improve." });
    onClose();
  };

  const handleClose = () => {
    setStep("prefilter");
    setSelectedStars(0);
    setHoveredStars(0);
    setFeedback("");
    onClose();
  };

  const displayStars = hoveredStars || selectedStars;
  const starLabels = ["", "Poor 😕", "Could be better 😐", "Okay 🙂", "Great! 😊", "Perfect! 🤩"];

  const popupStyle = {
    border: '1px solid rgba(20,184,166,0.3)',
    boxShadow: '0 0 30px rgba(20,184,166,0.12), 0 25px 50px -12px rgba(0,0,0,0.5)',
    background: 'linear-gradient(180deg, #0f172a, #020617)',
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-[340px] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:hidden"
        style={popupStyle}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Top glow */}
        <div className="h-[1px] w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)' }} />

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-secondary/60 hover:bg-secondary transition-colors"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* Step 1: Pre-filter */}
        {step === "prefilter" && (
          <div className="px-5 pt-7 pb-5 text-center space-y-4">
            <span className="text-4xl inline-block">⭐</span>
            <DialogTitle className="text-base font-extrabold text-foreground">
              Enjoying the predictions? ⭐
            </DialogTitle>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Help us improve — it takes 5 seconds
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <span className="text-xs font-extrabold text-amber-400">Get +50 points after rating</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep("stars")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary to-teal-600 text-white text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
              >
                <ThumbsUp className="h-4 w-4" />
                Yes 😍
              </button>
              <button
                onClick={() => { setSelectedStars(2); setStep("feedback"); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary/50 hover:bg-secondary/70 text-muted-foreground text-sm font-medium transition-all active:scale-95"
              >
                <ThumbsDown className="h-4 w-4" />
                Not really 😐
              </button>
            </div>

            <button
              className="w-full py-1.5 text-xs font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              onClick={handleClose}
            >
              Maybe later
            </button>
          </div>
        )}

        {/* Step 2: Star rating (shown after "Yes") */}
        {step === "stars" && (
          <div className="px-5 pt-6 pb-5 text-center space-y-4">
            <div className="space-y-2">
              <span className="text-4xl inline-block">🚀</span>
              <DialogTitle className="text-base font-extrabold text-foreground">
                Awesome! Rate us ⭐
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Earn <span className="font-extrabold text-amber-400">+50 points</span> for rating!
              </p>
            </div>

            <div className="flex justify-center gap-2.5 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredStars(star)}
                  onMouseLeave={() => setHoveredStars(0)}
                  onClick={() => handleStarSelect(star)}
                  disabled={submitting}
                  className="transition-all duration-200 hover:scale-125 active:scale-95 disabled:opacity-50"
                >
                  <Star
                    className={`h-11 w-11 transition-all duration-200 ${
                      star <= displayStars
                        ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]"
                        : "text-muted-foreground/30 hover:text-muted-foreground/50"
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-xs font-medium text-muted-foreground h-4 transition-all">
              {displayStars > 0 ? starLabels[displayStars] : "Tap a star ⭐"}
            </p>

            <button
              className="w-full py-1.5 text-xs font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              onClick={handleClose}
            >
              Maybe later
            </button>
          </div>
        )}

        {/* Step 3: Redirect prompt (shown after 4-5 stars) */}
        {step === "redirect" && (
          <div className="px-5 pt-7 pb-5 text-center space-y-4">
            <span className="text-4xl inline-block">🙌</span>
            <DialogTitle className="text-base font-extrabold text-foreground">
              One last step 🙌
            </DialogTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ⭐ Leave a 5-star rating on Google Play and add a short comment to get your reward 🎁
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <span className="text-xs font-extrabold text-amber-400">🎁 +50 points waiting for you!</span>
            </div>
            <button
              onClick={handleGoToPlayStore}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95 disabled:opacity-50"
            >
              <Star className="h-4 w-4 fill-white" />
              {submitting ? "Opening..." : "Go to Google Play ⭐"}
            </button>
            <button
              className="w-full py-1.5 text-xs font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              onClick={handleClose}
            >
              Maybe later
            </button>
          </div>
        )}

        {/* Step 4: Feedback (shown after "Not really" or low stars) */}
        {step === "feedback" && (
          <div className="px-5 pt-6 pb-5 space-y-4">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 mb-3">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                Thanks for your honesty! 🙏
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Help us improve — your feedback matters
              </p>
            </div>

            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What can we improve? (optional)"
              className="min-h-[80px] text-sm border-border/50 bg-secondary/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-primary/20"
              maxLength={500}
            />

            <Button
              onClick={handleFeedbackSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-teal-600 hover:from-primary/90 hover:to-teal-500 text-white font-semibold shadow-lg shadow-primary/20"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Sending..." : "Submit Feedback"}
            </Button>

            <button
              className="w-full py-1 text-xs font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              onClick={handleClose}
            >
              Skip
            </button>
          </div>
        )}

        {/* Step 4: Thanks */}
        {step === "thanks" && (
          <div className="px-5 pt-8 pb-6 text-center space-y-3">
            <span className="text-5xl inline-block animate-bounce">🎉</span>
            <DialogTitle className="text-lg font-extrabold text-foreground">
              Thank you so much! 🚀
            </DialogTitle>
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <span className="text-sm font-extrabold text-amber-400">🎁 +50 points added!</span>
            </div>
            <div className="flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-6 w-6 text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                />
              ))}
            </div>
            <Button
              onClick={handleClose}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold shadow-lg shadow-amber-500/20"
            >
              Awesome! 🚀
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
