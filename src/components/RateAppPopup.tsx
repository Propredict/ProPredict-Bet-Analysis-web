import { useState } from "react";
import { Star, X, Send, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import heroStadium from "@/assets/hero-stadium-player.jpg";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.propredict.app";

interface RateAppPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (stars: number, feedback?: string) => Promise<any>;
  submitting: boolean;
}

type Step = "prefilter" | "stars" | "redirect" | "feedback" | "thanks";

/** Navy stadium header band shared by every step, matching the site's PageHero look. */
function PopupHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="relative overflow-hidden bg-sidebar px-5 pb-5 pt-7 text-center">
      <img
        src={heroStadium}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sidebar/70 via-sidebar/85 to-sidebar" />
      <div className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full border-[20px] border-primary-foreground/10" />

      <div className="relative">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/40 ring-4 ring-primary/25">
          {icon}
        </div>
        <DialogTitle className="mt-3 text-lg font-black tracking-tight text-primary-foreground">
          {title}
        </DialogTitle>
        {subtitle && (
          <p className="mt-1 text-xs font-medium text-sidebar-foreground/80">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function RateAppPopup({ open, onClose, onSubmit, submitting }: RateAppPopupProps) {
  const [step, setStep] = useState<Step>("prefilter");
  const [selectedStars, setSelectedStars] = useState(0);
  const [hoveredStars, setHoveredStars] = useState(0);
  const [feedback, setFeedback] = useState("");

  const handleStarSelect = async (stars: number) => {
    setSelectedStars(stars);
    if (stars >= 4) {
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
    if (result?.success) {
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

  const StarRow = ({ size }: { size: string }) => (
    <div className="flex justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHoveredStars(star)}
          onMouseLeave={() => setHoveredStars(0)}
          onClick={() => handleStarSelect(star)}
          disabled={submitting}
          className="rounded-md outline-none transition-transform duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:opacity-50"
          aria-label={`Rate ${star} stars`}
        >
          <Star
            className={`${size} transition-colors duration-200 ${
              star <= displayStars
                ? "fill-warning text-warning drop-shadow-sm"
                : "fill-card text-warning/60"
            }`}
          />
        </button>
      ))}
    </div>
  );

  const MaybeLater = ({ label = "Maybe later" }: { label?: string }) => (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <button
        className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        onClick={handleClose}
      >
        {label}
      </button>
      <span className="h-px flex-1 bg-border" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        data-rating-popup-open={open ? "true" : "false"}
        className="w-[92vw] max-w-[360px] max-h-[95vh] gap-0 overflow-y-auto rounded-2xl border-2 border-primary/40 bg-card p-0 shadow-2xl shadow-primary/20 outline-none focus:outline-none focus-visible:ring-0 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-primary-foreground/15 p-1.5 transition-colors hover:bg-primary-foreground/25"
        >
          <X className="h-3.5 w-3.5 text-primary-foreground" />
        </button>

        {/* Step 1: Pre-filter + inline stars */}
        {step === "prefilter" && (
          <>
            <PopupHeader
              icon={<Star className="h-7 w-7 fill-warning text-warning" />}
              title="Enjoying the predictions?"
              subtitle="Your feedback helps us improve and grow! 💙"
            />
            <div className="space-y-4 px-5 pb-5 pt-4 text-center">
              <div className="rounded-xl border border-border bg-secondary/50 px-3 py-3">
                <p className="mb-2 text-xs font-semibold text-foreground">How would you rate your experience?</p>
                <StarRow size="h-9 w-9" />
                <div className="mt-1.5 flex justify-between px-1 text-[11px] font-medium">
                  <span className="text-muted-foreground">Not great</span>
                  <span className="font-bold text-primary">Amazing</span>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => handleStarSelect(5)}
                  className="flex flex-1 items-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-primary-foreground shadow-md shadow-primary/30 transition-all hover:bg-primary/90 active:scale-95"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
                    <ThumbsUp className="h-4 w-4" />
                  </span>
                  <span className="text-left leading-tight">
                    <span className="block text-sm font-bold">Yes 😍</span>
                    <span className="block text-[11px] text-primary-foreground/85">Love it!</span>
                  </span>
                </button>
                <button
                  onClick={() => { setSelectedStars(2); setStep("feedback"); }}
                  className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-foreground transition-all hover:bg-secondary active:scale-95"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                    <ThumbsDown className="h-4 w-4" />
                  </span>
                  <span className="text-left leading-tight">
                    <span className="block text-sm font-bold">Not really 😐</span>
                    <span className="block text-[11px] text-muted-foreground">Needs work</span>
                  </span>
                </button>
              </div>

              <MaybeLater />
            </div>
          </>
        )}

        {/* Step 2: Star rating */}
        {step === "stars" && (
          <>
            <PopupHeader
              icon={<span className="text-2xl">🚀</span>}
              title="Awesome! Rate us ⭐"
              subtitle="Tap the stars to rate your experience"
            />
            <div className="space-y-4 px-5 pb-5 pt-5 text-center">
              <StarRow size="h-11 w-11" />
              <p className="h-4 text-xs font-semibold text-muted-foreground">
                {displayStars > 0 ? starLabels[displayStars] : "Tap a star ⭐"}
              </p>
              <MaybeLater />
            </div>
          </>
        )}

        {/* Step 3: Redirect prompt (4-5 stars) */}
        {step === "redirect" && (
          <>
            <PopupHeader
              icon={<span className="text-2xl">🙌</span>}
              title="One last step"
              subtitle="Leave a 5-star rating on Google Play — it helps us grow! 💙"
            />
            <div className="space-y-4 px-5 pb-5 pt-5 text-center">
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-6 w-6 fill-warning text-warning" />
                ))}
              </div>
              <button
                onClick={handleGoToPlayStore}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/30 transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
              >
                <Star className="h-4 w-4 fill-primary-foreground" />
                {submitting ? "Opening..." : "Go to Google Play"}
              </button>
              <MaybeLater />
            </div>
          </>
        )}

        {/* Step 4: Feedback */}
        {step === "feedback" && (
          <>
            <PopupHeader
              icon={<MessageSquare className="h-6 w-6 text-primary-foreground" />}
              title="Thanks for your honesty! 🙏"
              subtitle="Help us improve — your feedback matters"
            />
            <div className="space-y-4 px-5 pb-5 pt-5">
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What can we improve? (optional)"
                className="min-h-[90px] border-border bg-secondary/40 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary"
                maxLength={500}
              />
              <Button
                onClick={handleFeedbackSubmit}
                disabled={submitting}
                className="w-full bg-primary font-semibold text-primary-foreground shadow-md shadow-primary/30 hover:bg-primary/90"
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? "Sending..." : "Submit Feedback"}
              </Button>
              <MaybeLater label="Skip" />
            </div>
          </>
        )}

        {/* Step 5: Thanks */}
        {step === "thanks" && (
          <>
            <PopupHeader
              icon={<span className="text-2xl">🎉</span>}
              title="Thank you so much!"
              subtitle="Your rating means a lot to our team"
            />
            <div className="space-y-4 px-5 pb-6 pt-5 text-center">
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-7 w-7 fill-warning text-warning" />
                ))}
              </div>
              <Button
                onClick={handleClose}
                className="w-full bg-primary font-bold text-primary-foreground shadow-md shadow-primary/30 hover:bg-primary/90"
              >
                Awesome! 🚀
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
