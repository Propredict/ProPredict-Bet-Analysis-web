import { useEffect, useRef, useState } from "react";
import { Check, Crown, Star, Sparkles, X, Flame, Zap, Bell, Ban, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserPlan, type UserPlan } from "@/hooks/useUserPlan";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { purchaseSubscription } from "@/hooks/useRevenueCat";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightPlan?: "basic" | "premium";
}

const proFeatures = [
  { icon: Sparkles, label: "Daily & Pro Predictions unlocked" },
  { icon: BarChart3, label: "Basic & Pro AI predictions" },
  { icon: Zap, label: "Live scores & standings" },
  { icon: Ban, label: "Ad-free predictions experience" },
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [internalPlan, setInternalPlan] = useState<"basic" | "premium">(highlightPlan ?? "basic");
  const isAndroid = getIsAndroidApp();

  // Sync internal plan when parent changes highlightPlan or modal opens
  useEffect(() => {
    if (open && highlightPlan) {
      setInternalPlan(highlightPlan);
    }
  }, [open, highlightPlan]);

  const planRequired = searchParams.get("plan_required");
  const showFomoBadge = open && (planRequired === "premium" || planRequired === "pro");

  const isPremium = internalPlan === "premium";
  const targetPlan: UserPlan = isPremium ? "premium" : "basic";
  const features = isPremium ? premiumFeatures : proFeatures;

  // Pricing per plan & period
  const pricing = isPremium
    ? { monthly: "€5.99/mo", annual: "€59.99/yr", saveBadge: "Save 17%" }
    : { monthly: "€3.99/mo", annual: "€39.99/yr", saveBadge: "Save 16%" };
  const currentPrice = period === "monthly" ? pricing.monthly : pricing.annual;

  useEffect(() => {
    let frame: number | undefined;

    if (open) {
      document.body.style.overflow = "hidden";
      frame = requestAnimationFrame(() => {
        setIsVisible(true);
        contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });
    } else {
      document.body.style.overflow = "";
      setIsVisible(false);
    }

    return () => {
      document.body.style.overflow = "";
      if (frame) cancelAnimationFrame(frame);
    };
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

    // Android: use RevenueCat purchaseSubscription helper (priority chain)
    if (isAndroid) {
      purchaseSubscription(targetPlan === "premium" ? "premium" : "basic", period, currentPlan);
      return;
    }

    // Web: go to pricing page
    navigate("/get-premium");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:p-4 sm:pt-[calc(3.75rem+env(safe-area-inset-top,0px))] sm:pb-4">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Card Modal */}
      <div
        className={cn(
          "relative w-full max-w-sm border border-border/50 transition-all duration-300 ease-out flex flex-col max-h-full sm:max-h-[85vh]",
          "rounded-2xl shadow-2xl",
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
        style={{ backgroundColor: 'hsl(var(--background))' }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Scrollable Content */}
        <div ref={contentRef} className="px-5 pt-2 pb-3 overflow-y-auto flex-1 min-h-0">
          {/* FOMO Badge */}
          {showFomoBadge && (
            <div className="flex justify-center mt-1 mb-2">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold animate-pulse",
                isPremium
                  ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              )}>
                <Flame className="h-3 w-3" />
                {isPremium ? "Premium Prediction Just Dropped" : "Pro Prediction Just Dropped"}
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mt-1 mb-3">
            <div className={cn(
              "inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2",
              isPremium
                ? "bg-gradient-to-br from-fuchsia-500/30 to-purple-600/30 shadow-[0_0_20px_rgba(217,70,239,0.3)]"
                : "bg-gradient-to-br from-amber-500/30 to-yellow-600/30 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            )}>
              {isPremium
                ? <Crown className="h-5 w-5 text-fuchsia-400" />
                : <Star className="h-5 w-5 text-amber-400" />
              }
            </div>
            <h2 className={cn(
              "text-lg font-bold mb-1 bg-clip-text text-transparent",
              isPremium
                ? "bg-gradient-to-r from-fuchsia-400 via-purple-400 to-pink-400"
                : "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"
            )}>
              {isPremium ? "Unlock Premium Access" : "Unlock Pro Access"}
            </h2>
            <p className="text-xs text-muted-foreground max-w-[260px] mx-auto">
              {isPremium
                ? "Don't miss today's highest confidence AI predictions."
                : "Get access to higher confidence AI predictions & analysis."
              }
            </p>
          </div>

          {/* Features */}
          <div className={cn(
            "rounded-xl p-3 mb-3 border",
            isPremium
              ? "bg-fuchsia-500/5 border-fuchsia-500/20"
              : "bg-amber-500/5 border-amber-500/20"
          )}>
            <h3 className="text-[11px] font-semibold text-foreground mb-2">
              Everything you get:
            </h3>
            <ul className="space-y-1.5">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <div className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center",
                    isPremium ? "bg-fuchsia-500/15" : "bg-amber-500/15"
                  )}>
                    <feature.icon className={cn(
                      "h-3 w-3",
                      isPremium ? "text-fuchsia-400" : "text-amber-400"
                    )} />
                  </div>
                  <span className="text-[11px] text-foreground">{feature.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Proof */}
          <div className="text-center mb-1">
            <p className="text-[11px] text-muted-foreground">
              <span className={cn(
                "font-semibold",
                isPremium ? "text-fuchsia-400" : "text-amber-400"
              )}>2,400+</span> users already upgraded
            </p>
          </div>
        </div>

        {/* Sticky Bottom CTA */}
        <div className="p-4 pt-3 border-t border-border/30">
          {/* Monthly / Annual toggle — Android only */}
          {isAndroid && (
            <div className="flex items-center justify-center gap-1 mb-3 p-1 rounded-lg bg-muted/50">
              <button
                onClick={() => setPeriod("monthly")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all",
                  period === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setPeriod("annual")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all relative",
                  period === "annual"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Annual
                <span className={cn(
                  "ml-1 text-[10px] font-bold",
                  isPremium ? "text-fuchsia-400" : "text-amber-400"
                )}>
                  {pricing.saveBadge}
                </span>
              </button>
            </div>
          )}

          <Button
            onClick={handleSelectPlan}
            disabled={currentPlan === targetPlan}
            className={cn(
              "w-full h-11 text-sm font-bold rounded-xl transition-all duration-200 shadow-lg",
              isPremium
                ? "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-500 hover:via-purple-500 hover:to-pink-500 text-white shadow-fuchsia-500/30"
                : "bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-400 hover:via-yellow-400 hover:to-orange-400 text-black shadow-amber-500/30"
            )}
          >
            <span className="flex items-center gap-2">
              {isPremium ? <Crown className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              {currentPlan === targetPlan
                ? "Current Plan"
                : isPremium
                  ? `Upgrade to Premium – ${currentPrice}`
                  : `Upgrade to Pro – ${currentPrice}`
              }
            </span>
          </Button>

          {/* Cross-sell hint */}
          {!isPremium && (
            <p className="text-center text-[11px] text-muted-foreground mt-2">
              Want everything? <button
                onClick={() => setInternalPlan("premium")}
                className="text-fuchsia-400 font-semibold underline underline-offset-2"
              >
                Go Premium →
              </button>
            </p>
          )}
          {isPremium && currentPlan === "free" && (
            <p className="text-center text-[11px] text-muted-foreground mt-2">
              Looking for a lighter plan? <button
                onClick={() => setInternalPlan("basic")}
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
