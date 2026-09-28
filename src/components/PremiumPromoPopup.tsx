import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Crown, X, ArrowRight, Trophy, Ticket, Radio, BarChart3, Brain, Ban,
  Sparkles, ShieldCheck, CreditCard, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { toast } from "sonner";

const SHOW_COUNT_KEY = "propredict:premium_popup_shows";
const PREMIUM_MONTHLY_PRICE_ID = "price_1U7aifL8E849h6yxdv1QWtqC";
const SHOW_DELAY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SHOWS_PER_DAY = 2;
const PROMO_END = new Date("2026-10-28T23:00:00Z");

function isAndroidApp(): boolean {
  try {
    const w = window as unknown as { Android?: unknown };
    return typeof w.Android !== "undefined" || new URLSearchParams(window.location.search).get("platform") === "android";
  } catch {
    return false;
  }
}

function showsToday(): number {
  try {
    const raw = localStorage.getItem(SHOW_COUNT_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date: string; count: number };
    return parsed.date === new Date().toDateString() ? parsed.count : 0;
  } catch {
    return 0;
  }
}

function markShown() {
  try {
    localStorage.setItem(
      SHOW_COUNT_KEY,
      JSON.stringify({ date: new Date().toDateString(), count: showsToday() + 1 })
    );
  } catch { /* ignore */ }
}

const FEATURES = [
  { icon: Trophy, label: "Premium Predictions" },
  { icon: Ticket, label: "Premium Tickets" },
  { icon: Radio, label: "Live Scores" },
  { icon: BarChart3, label: "Daily Tips" },
  { icon: Brain, label: "Full AI Analysis" },
  { icon: Ban, label: "No Ads" },
];

export function PremiumPromoPopup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan } = useUserPlan();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const promoActive = new Date() < PROMO_END;

  useEffect(() => {
    // Premium users never see it
    if (plan === "premium") return;
    if (showsToday() >= MAX_SHOWS_PER_DAY) return;

    const timer = setTimeout(() => {
      if (showsToday() >= MAX_SHOWS_PER_DAY) return;
      setOpen(true);
      markShown();
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [plan]);

  const handleGetPremium = async () => {
    if (loading) return;

    // Android app → RevenueCat / Google Play purchase via native bridge
    if (isAndroidApp()) {
      const w = window as unknown as { Android?: { purchasePlan?: (pkg: string) => void } };
      if (w.Android?.purchasePlan) {
        w.Android.purchasePlan("premium-monthly");
        setOpen(false);
        return;
      }
    }

    // Web → Stripe Checkout (server applies the €9.99 first-month coupon)
    if (!user) {
      setOpen(false);
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId: PREMIUM_MONTHLY_PRICE_ID,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/get-premium`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
      console.error("[premium-popup] checkout failed", err);
      toast.error("Checkout failed — please try again / Naplata nije uspela — pokušaj ponovo");
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm max-h-[95vh] overflow-y-auto rounded-3xl animate-scale-in"
        style={{
          background: "linear-gradient(165deg, #14264d 0%, #0b1a3a 55%, #060f24 100%)",
          boxShadow: "0 30px 70px -15px rgba(6,15,36,0.8), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Glow accents */}
        <div className="pointer-events-none absolute -top-16 -left-10 w-64 h-64 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 w-64 h-64 rounded-full bg-fuchsia-500/15 blur-3xl" />

        <div className="relative p-6 text-center text-white">
          {/* Crown */}
          <div className="mx-auto mb-3 w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #fbbf24, #d97706)", boxShadow: "0 8px 24px rgba(251,191,36,0.45)" }}
          >
            <Crown className="h-8 w-8 text-white" strokeWidth={2.2} />
          </div>

          <h3 className="text-2xl font-black tracking-tight leading-tight">
            Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">PREMIUM</span>
          </h3>
          {promoActive && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/90 text-white text-xs font-extrabold tracking-wide shadow-lg">
              🔥 1 MONTH OFFER
            </div>
          )}
          <p className="mt-2 text-sm font-medium text-white/85">
            Get full access to all features and take your football predictions to the next level!
          </p>

          {/* Feature grid */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.07] border border-white/10 px-1.5 py-3"
              >
                <Icon className="h-5 w-5 text-amber-300" />
                <span className="text-[10px] font-semibold leading-tight text-white/90">{label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleGetPremium}
            disabled={loading}
            className="mt-6 flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-extrabold text-base text-[#3a2503] transition-all shadow-lg hover:scale-[1.02] active:scale-[0.99] disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #fde047, #f59e0b)", boxShadow: "0 10px 30px -8px rgba(245,158,11,0.6)" }}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                GET PREMIUM NOW
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          {/* Price */}
          <div className="mt-3 flex items-baseline justify-center gap-2">
            {promoActive && (
              <span className="text-sm font-bold text-red-400 line-through">€14.99</span>
            )}
            <span className="text-2xl font-black text-white">{promoActive ? "€9.99" : "€14.99"}</span>
            {promoActive && <span className="text-xs font-semibold text-white/70">/ first month</span>}
          </div>
          <p className="mt-1 text-[11px] text-white/60">
            {promoActive ? "Then €14.99 per month. Cancel anytime." : "Per month. Cancel anytime."}
          </p>

          {/* Trust row */}
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-semibold text-white/70">
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-300" /> All Premium Features</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-400" /> Cancel Anytime</span>
            <span className="flex items-center gap-1"><CreditCard className="h-3 w-3 text-sky-400" /> Secure Payment</span>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="mt-3 text-xs text-white/60 hover:text-white transition-colors"
          >
            No thanks / Ne hvala
          </button>
        </div>
      </div>
    </div>
  );
}
