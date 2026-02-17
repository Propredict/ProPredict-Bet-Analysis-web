import { useEffect, useState } from "react";
import { Check, Crown, Star, Sparkles, X, Flame, Zap, Bell, Ban, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserPlan, type UserPlan } from "@/hooks/useUserPlan";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightPlan?: "basic" | "premium";
}

const proFeatures = [
  { icon: Sparkles, label: "Daily & Pro AI Picks unlocked" },
  { icon: BarChart3, label: "Basic & Pro AI predictions" },
  { icon: Zap, label: "Live scores & standings" },
  { icon: Ban, label: "Ad-free AI Picks experience" },
];

const premiumFeatures = [
  { icon: Check, label: "All Pro features included" },
  { icon: Crown, label: "Premium match insights" },
  { icon: BarChart3, label: "VIP multi-match analysis" },
  { icon: Sparkles, label: "Full AI analysis" },
  { icon: Bell, label: "Instant goal alerts" },
  { icon: Ban, label: "Completely ad-free experience" },
];

export function PricingModal({ open, onOpenChange, highlightPlan }: PricingModalProps) {
  const { plan: currentPlan, isAuthenticated } = useUserPlan();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);

  const planRequired = searchParams.get("plan_required");
  const showFomoBadge = open && (planRequired === "premium" || planRequired === "pro");

  const isPremium = highlightPlan === "premium";
  const targetPlan: UserPlan = isPremium ? "premium" : "basic";
  const features = isPremium ? premiumFeatures : proFeatures;

  useEffect(() => {
    if (open) {
      // Small delay for mount → animate
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onOpenChange(false), 300);
  };

  const handleSelectPlan = () => {
    handleClose();

    if (!isAuthenticated) {
      toast.error("Please sign in to subscribe.");
      navigate("/login");
      return;
    }

    const android = (window as any).Android;
    if (android) {
      if (targetPlan === "basic" && typeof android.purchasePackage === "function") {
        android.purchasePackage("propredict_pro_monthly");
      } else if (targetPlan === "premium" && typeof android.purchasePackage === "function") {
        android.purchasePackage("propredict_premium_monthly");
      } else if (targetPlan === "basic" && typeof android.getPro === "function") {
        android.getPro();
      } else if (targetPlan === "premium" && typeof android.getPremium === "function") {
        android.getPremium();
      }
      return;
    }

    navigate("/get-premium");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/90 transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          "relative w-full max-w-lg bg-background border-t border-border/50 transition-transform duration-300 ease-out flex flex-col",
          "rounded-t-[24px] max-h-[85vh]",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          {/* FOMO Badge */}
          {showFomoBadge && (
            <div className="flex justify-center mt-2 mb-4">
              <div className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold animate-pulse",
                isPremium
                  ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              )}>
                <Flame className="h-3.5 w-3.5" />
                {isPremium ? "Premium Tip Just Dropped" : "Pro Tip Just Dropped"}
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mt-2 mb-5">
            <div className={cn(
              "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3",
              isPremium
                ? "bg-gradient-to-br from-fuchsia-500/30 to-purple-600/30 shadow-[0_0_20px_rgba(217,70,239,0.3)]"
                : "bg-gradient-to-br from-amber-500/30 to-yellow-600/30 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            )}>
              {isPremium
                ? <Crown className="h-6 w-6 text-fuchsia-400" />
                : <Star className="h-6 w-6 text-amber-400" />
              }
            </div>
            <h2 className={cn(
              "text-xl font-bold mb-1.5 bg-clip-text text-transparent",
              isPremium
                ? "bg-gradient-to-r from-fuchsia-400 via-purple-400 to-pink-400"
                : "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"
            )}>
              {isPremium ? "Unlock Premium Access" : "Unlock Pro Access"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
              {isPremium
                ? "Don't miss today's highest confidence AI picks."
                : "Get access to higher confidence AI picks & analysis."
              }
            </p>
          </div>


          {/* Features */}
          <div className={cn(
            "rounded-xl p-4 mb-4 border",
            isPremium
              ? "bg-fuchsia-500/5 border-fuchsia-500/20"
              : "bg-amber-500/5 border-amber-500/20"
          )}>
            <h3 className="text-xs font-semibold text-foreground mb-3">
              Everything you get:
            </h3>
            <ul className="space-y-2.5">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center",
                    isPremium ? "bg-fuchsia-500/15" : "bg-amber-500/15"
                  )}>
                    <feature.icon className={cn(
                      "h-3.5 w-3.5",
                      isPremium ? "text-fuchsia-400" : "text-amber-400"
                    )} />
                  </div>
                  <span className="text-xs text-foreground">{feature.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Proof */}
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground">
              <span className={cn(
                "font-semibold",
                isPremium ? "text-fuchsia-400" : "text-amber-400"
              )}>2,400+</span> users already upgraded
            </p>
          </div>
        </div>

        {/* Sticky Bottom CTA */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-5 bg-gradient-to-t from-background via-background to-background/0">
          <Button
            onClick={handleSelectPlan}
            disabled={currentPlan === targetPlan}
            className={cn(
              "w-full h-12 text-sm font-bold rounded-xl transition-all duration-200 shadow-lg",
              isPremium
                ? "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-500 hover:via-purple-500 hover:to-pink-500 text-white shadow-fuchsia-500/30"
                : "bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-400 hover:via-yellow-400 hover:to-orange-400 text-black shadow-amber-500/30"
            )}
          >
            <span className="flex items-center gap-2">
              {isPremium ? <Crown className="h-5 w-5" /> : <Star className="h-5 w-5" />}
              {currentPlan === targetPlan
                ? "Current Plan"
                : isPremium
                  ? "Upgrade to Premium – €5.99/mo"
                  : "Upgrade to Pro – €3.99/mo"
              }
            </span>
          </Button>

          {/* Cross-sell hint */}
          {!isPremium && (
            <p className="text-center text-[11px] text-muted-foreground mt-2.5">
              Want everything? <button
                onClick={() => onOpenChange(true)}
                className="text-fuchsia-400 font-semibold underline underline-offset-2"
              >
                Go Premium →
              </button>
            </p>
          )}
          {isPremium && currentPlan === "free" && (
            <p className="text-center text-[11px] text-muted-foreground mt-2.5">
              Looking for a lighter plan? <button
                onClick={() => onOpenChange(true)}
                className="text-amber-400 font-semibold underline underline-offset-2"
              >
                Try Pro →
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
