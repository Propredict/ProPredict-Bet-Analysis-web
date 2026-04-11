import { useState } from "react";
import { Star, X, Send, MessageSquare, Sparkles } from "lucide-react";
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
      setStep("feedback");
    }
  };

  const handleFeedbackSubmit = async () => {
    await onSubmit(selectedStars, feedback || undefined);
    toast({ title: "Hvala! 🙏", description: "Tvoj feedback nam pomaže da budemo bolji." });
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

  const starLabels = ["", "Loše 😕", "Može bolje 😐", "Okej 🙂", "Super! 😊", "Savršeno! 🤩"];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-[340px] p-0 gap-0 border-0 !bg-gradient-to-b !from-white !to-amber-50/50 overflow-hidden rounded-2xl shadow-2xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {step === "stars" && (
          <div className="px-5 pt-7 pb-5 text-center space-y-4">
            {/* Emotional header */}
            <div className="space-y-2">
              <div className="relative inline-block">
                <span className="text-5xl animate-bounce inline-block" style={{ animationDuration: "1.5s" }}>💛</span>
                <Sparkles className="absolute -top-1 -right-3 h-4 w-4 text-amber-400 animate-pulse" />
              </div>
              <DialogTitle className="text-lg font-extrabold text-slate-900 leading-snug">
                Drago nam je što si tu!
              </DialogTitle>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tvoja ocena nam daje snagu da nastavimo 💪<br />
                Osvoji <span className="font-extrabold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md">+50 poena</span> za ocenu!
              </p>
            </div>

            {/* Star selector */}
            <div className="flex justify-center gap-2.5 py-3">
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
                        ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                        : "text-slate-200 hover:text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Dynamic label */}
            <p className="text-xs font-medium text-slate-500 h-4 transition-all">
              {displayStars > 0 ? starLabels[displayStars] : "Klikni na zvezdicu ⭐"}
            </p>

            {/* Soft CTA */}
            <button
              className="w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
              onClick={handleClose}
            >
              Možda kasnije
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
                Hvala na iskrenosti! 🙏
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-1">
                Pomozi nam da budemo bolji:
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
              placeholder="Šta možemo poboljšati? (opciono)"
              className="min-h-[80px] text-sm border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
              maxLength={500}
            />

            <Button
              onClick={handleFeedbackSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Šalje se..." : "Pošalji"}
            </Button>

            <button
              className="w-full py-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
              onClick={handleClose}
            >
              Preskoči
            </button>
          </div>
        )}

        {step === "thanks" && (
          <div className="px-5 pt-8 pb-6 text-center space-y-3">
            <div className="relative inline-block">
              <span className="text-5xl inline-block animate-bounce">🎉</span>
              <Sparkles className="absolute -top-1 -right-2 h-5 w-5 text-amber-400 animate-pulse" />
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Hvala ti puno! 💛
            </DialogTitle>
            <p className="text-sm text-amber-600 font-extrabold bg-amber-50 rounded-lg py-2 px-3 border border-amber-200">
              🎁 +50 poena dodato!
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
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold shadow-lg shadow-amber-500/20"
            >
              Odlično! 🚀
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
