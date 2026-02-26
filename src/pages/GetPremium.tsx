import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Check,
  X,
  Zap,
  Target,
  Brain,
  Bell,
  Clock,
  Shield,
  Star,
  Crown,
  Sparkles,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";
import { purchaseSubscription } from "@/hooks/useRevenueCat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Web-only: Stripe price IDs
const STRIPE_PRICES = {
  basic: {
    monthly: "price_1SuCcpL8E849h6yxv6RvooUp",
    annual: "price_1SpZ5OL8E849h6yxLP3NB1pi",
  },
  premium: {
    monthly: "price_1SpWSoL8E849h6yxK7hBWrRm",
    annual: "price_1SpZ64L8E849h6yxd2Fnz1YP",
  },
};

// Android-specific plans (RevenueCat) - matches reference image exactly
const androidPlans = {
  monthly: [
    {
      id: "free",
      name: "Free",
      price: "€0",
      period: "/forever",
       description: "Watch ads to access daily predictions",
      buttonText: "Current Plan",
      buttonVariant: "outline" as const,
      features: [
        { text: "Daily Predictions (watch ads to access)", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "Basic predictions", included: true },
        { text: "Match Previews", included: false },
        { text: "Pro Insights", included: false },
        { text: "Premium Multi-Match Predictions", included: false },
        { text: "Ad-free experience", included: false },
      ],
    },
    {
      id: "basic",
      name: "Pro",
      price: "€3.99",
      period: "/month",
       description: "Access all predictions without watching ads",
      buttonText: "Get Pro",
      buttonVariant: "default" as const,
      popular: true,
      features: [
        { text: "All Daily Predictions unlocked", included: true },
        { text: "Pro Insights access", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "No ads for predictions", included: true },
        { text: "5 Match Previews daily", included: true },
        { text: "Premium Multi-Match Predictions", included: false },
        { text: "VIP analysis", included: false },
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: "€5.99",
      period: "/month",
       description: "Full access to all predictions",
      buttonText: "Get Premium",
      buttonVariant: "default" as const,
      features: [
        { text: "All Pro features", included: true },
        { text: "All premium match insights", included: true },
        { text: "VIP multi-match analysis", included: true },
        { text: "Full AI analysis", included: true },
        { text: "Unlimited Match Previews", included: true },
        { text: "Priority support", included: true },
        { text: "Ad-free experience", included: true },
      ],
    },
  ],
  annual: [
    {
      id: "free",
      name: "Free",
      price: "€0",
      period: "/forever",
      description: "Watch ads to access daily predictions",
      buttonText: "Current Plan",
      buttonVariant: "outline" as const,
      features: [
        { text: "Daily Predictions (watch ads to access)", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "Basic predictions", included: true },
        { text: "Match Previews", included: false },
        { text: "Pro Insights", included: false },
        { text: "Premium Multi-Match Predictions", included: false },
        { text: "Ad-free experience", included: false },
      ],
    },
    {
      id: "basic",
      name: "Pro",
      price: "€39.99",
      period: "/year",
      savings: "€3.33/mo - Save 17%",
      description: "Access all predictions without watching ads",
      buttonText: "Get Pro",
      buttonVariant: "default" as const,
      popular: true,
      features: [
        { text: "All Daily Predictions unlocked", included: true },
        { text: "Pro Insights access", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "No ads for predictions", included: true },
        { text: "5 Match Previews daily", included: true },
        { text: "Premium Multi-Match Predictions", included: false },
        { text: "VIP analysis", included: false },
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: "€59.99",
      period: "/year",
      savings: "€5.00/mo - Save 17%",
      description: "Full access to all predictions",
      buttonText: "Get Premium",
      buttonVariant: "default" as const,
      features: [
        { text: "All Pro features", included: true },
        { text: "All premium match insights", included: true },
        { text: "VIP multi-match analysis", included: true },
        { text: "Full AI analysis", included: true },
        { text: "Unlimited Match Previews", included: true },
        { text: "Priority support", included: true },
        { text: "Ad-free experience", included: true },
      ],
    },
  ],
};

// Web plans (Stripe) - unchanged
const webPlans = {
  monthly: [
    {
      id: "free",
      name: "Free",
      price: "€0",
      period: "/forever",
      description: "Basic access to get started",
      buttonText: "Current Plan",
      buttonVariant: "outline" as const,
      features: [
         { text: "Full access to Daily Predictions", included: true },
        { text: "Free AI Basic predictions", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "Ads supported", included: true },
        { text: "Match Previews", included: false },
        { text: "Exclusive content", included: false },
        { text: "Premium content", included: false },
      ],
    },
    {
      id: "basic",
      name: "Pro",
      price: "€3.99",
      period: "/month",
      description: "Full access to daily & exclusive content",
      buttonText: "Get Pro",
      buttonVariant: "default" as const,
      popular: true,
      features: [
         { text: "Daily & Pro Predictions unlocked", included: true },
        { text: "Basic & Pro AI predictions", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
         { text: "Ad-free predictions experience", included: true },
        { text: "5 Match Previews daily", included: true },
        { text: "Premium insights", included: false },
        { text: "VIP analysis", included: false },
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: "€5.99",
      period: "/month",
      description: "Full access to all content",
      buttonText: "Get Premium",
      buttonVariant: "default" as const,
      features: [
        { text: "All Pro features", included: true },
        { text: "Premium match insights", included: true },
        { text: "VIP multi-match analysis", included: true },
        { text: "Full AI analysis", included: true },
        { text: "Unlimited Match Previews", included: true },
        { text: "Priority support", included: true },
        { text: "Ad-free experience", included: true },
      ],
    },
  ],
  annual: [
    {
      id: "free",
      name: "Free",
      price: "€0",
      period: "/forever",
      description: "Basic access to get started",
      buttonText: "Current Plan",
      buttonVariant: "outline" as const,
      features: [
        { text: "Full access to Daily Predictions", included: true },
        { text: "Free AI Basic predictions", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "Ads supported", included: true },
        { text: "Match Previews", included: false },
        { text: "Exclusive content", included: false },
        { text: "Premium content", included: false },
      ],
    },
    {
      id: "basic",
      name: "Pro",
      price: "€39.99",
      period: "/year",
      savings: "€3.33/mo - Save 17%",
      description: "Full access to daily & exclusive content",
      buttonText: "Get Pro",
      buttonVariant: "default" as const,
      popular: true,
      features: [
        { text: "Daily & Pro Predictions unlocked", included: true },
        { text: "Basic & Pro AI predictions", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "Ad-free predictions experience", included: true },
        { text: "5 Match Previews daily", included: true },
        { text: "Premium insights", included: false },
        { text: "VIP analysis", included: false },
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: "€59.99",
      period: "/year",
      savings: "€5.00/mo - Save 17%",
      description: "Full access to all content",
      buttonText: "Get Premium",
      buttonVariant: "default" as const,
      features: [
        { text: "All Pro features", included: true },
        { text: "Premium match insights", included: true },
        { text: "VIP multi-match analysis", included: true },
        { text: "Full AI analysis", included: true },
        { text: "Unlimited Match Previews", included: true },
        { text: "Priority support", included: true },
        { text: "Ad-free experience", included: true },
      ],
    },
  ],
};

const benefits = [
  { icon: Target, title: "Premium AI Predictions", description: "AI analysis with 90%+ historical accuracy" },
  { icon: Zap, title: "VIP Multi-Match Predictions", description: "Curated multi-match AI analysis and insights" },
  { icon: Brain, title: "Full AI Analysis", description: "Complete AI-powered match analysis and insights" },
  { icon: Bell, title: "Real-time Alerts", description: "Instant notifications for new predictions" },
  { icon: Clock, title: "Priority Access", description: "Get insights before match kickoff" },
  { icon: Shield, title: "Flexible & Risk-Free", description: "Cancel or switch plans anytime, no questions asked" },
];

const stats = [
  { value: "92%", label: "Prediction Accuracy" },
  { value: "10K+", label: "Active Users" },
  { value: "500+", label: "Daily Analyses" },
  { value: "4.9", label: "User Rating", isStar: true },
];

const testimonials = [
  { name: "Luka87", badge: "Analyst", rating: 5, comment: "The AI predictions are incredibly accurate. I've been using ProPredict for 3 months and the insights have been game-changing." },
  { name: "MilanTips", badge: "Premium", rating: 5, comment: "Best sports analysis platform I've found. The premium combos alone are worth the subscription." },
  { name: "ProAnalyst", badge: "Expert", rating: 4, comment: "Solid AI analysis with great accuracy. The match previews give me an edge every matchday." },
  { name: "StefanPro", badge: "Premium", rating: 5, comment: "Upgraded to Premium last month — the VIP insights are next level. Highly recommend!" },
  { name: "GoalMaster99", badge: "Analyst", rating: 5, comment: "I love how the AI breaks down every match. The confidence ratings are surprisingly reliable." },
  { name: "DataKing", badge: "Expert", rating: 4, comment: "Clean interface, accurate predictions, and outstanding value. What more could you ask for?" },
];

const faqs = [
  { question: "Can I cancel anytime?", answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period." },
  { question: "How do Premium AI Predictions work?", answer: "Our AI models provide carefully curated predictions with detailed analysis, giving you deeper insights to understand match dynamics." },
  { question: "Can I change my plan anytime?", answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is adjusted accordingly." },
];

function TestimonialsSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const t = testimonials[current];
  const badgeColor = t.badge === "Premium" 
    ? "bg-violet-500/20 text-violet-400 border-violet-500/40" 
    : t.badge === "Expert" 
    ? "bg-warning/20 text-warning border-warning/40"
    : "bg-primary/20 text-primary border-primary/40";

  return (
    <Card className="p-4 bg-gradient-to-b from-card to-card/80 border-border/50 relative overflow-hidden">
      <div className="flex items-start gap-3 animate-fade-in" key={current}>
        <Quote className="h-5 w-5 text-primary/40 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground">{t.name}</span>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${badgeColor}`}>
              {t.badge}
            </Badge>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="h-3 w-3 text-warning fill-warning" />
              ))}
              {Array.from({ length: 5 - t.rating }).map((_, i) => (
                <Star key={i} className="h-3 w-3 text-muted-foreground/30" />
              ))}
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed italic">
            "{t.comment}"
          </p>
        </div>
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </Card>
  );
}

export default function GetPremium() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const { plan: currentPlan, isAuthenticated, refetch: refetchPlan } = useUserPlan();
  const { isAndroidApp } = usePlatform();
  const navigate = useNavigate();

  // Both Android and Web now support monthly/annual toggle
  const currentPlans = isAndroidApp ? androidPlans[billingPeriod] : webPlans[billingPeriod];

  // Listen for RevenueCat purchase success on Android
  useEffect(() => {
    if (!isAndroidApp) return;

    const handlePurchaseSuccess = (event: CustomEvent<{ entitlements?: { pro?: boolean; premium?: boolean } }>) => {
      toast.success("Subscription activated successfully!");
      // Refresh entitlements
      refetchPlan();
      // Navigate back after successful purchase
      setTimeout(() => navigate(-1), 500);
    };

    const handleMessage = (event: MessageEvent) => {
      const data = typeof event.data === "string" ? (() => { try { return JSON.parse(event.data); } catch { return {}; } })() : event.data;
      const { type } = data || {};
      if (
        type === "PURCHASE_SUCCESS" ||
        type === "REVENUECAT_PURCHASE_SUCCESS" ||
        type === "REVENUECAT_ENTITLEMENTS_UPDATE"
      ) {
        toast.success("Subscription activated successfully!");
        refetchPlan();
        setTimeout(() => navigate(-1), 500);
      }
      // Handle RESTORE_SUCCESS — re-fetch plan from Supabase after webhook syncs
      if (type === "RESTORE_SUCCESS") {
        toast.success("Purchases restored! Updating your plan…");
        // Give RevenueCat webhook time to write to Supabase
        setTimeout(() => {
          refetchPlan();
        }, 2000);
      }
    };

    window.addEventListener("revenuecat-purchase-success", handlePurchaseSuccess as EventListener);
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("revenuecat-purchase-success", handlePurchaseSuccess as EventListener);
      window.removeEventListener("message", handleMessage);
    };
  }, [isAndroidApp, refetchPlan, navigate]);

  const handleSubscribe = async (planId: string) => {
    if (planId === "free" || currentPlan === planId) return;

    // Auth guard: block purchases for non-authenticated users
    if (!isAuthenticated) {
      toast.error("Please sign in to subscribe.");
      navigate("/login");
      return;
    }

    // Android: HARD BLOCK - use native bridge, never Stripe
    const android = (window as any).Android;
    if (android) {
      // Pass currentPlan so purchaseSubscription can detect upgrade vs downgrade
      purchaseSubscription(planId as "basic" | "premium", billingPeriod, currentPlan);
      return;
    }

    // Web: Stripe checkout
    const priceId = planId === "basic" 
      ? STRIPE_PRICES.basic[billingPeriod]
      : planId === "premium"
      ? STRIPE_PRICES.premium[billingPeriod]
      : null;

    if (!priceId) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId,
          successUrl: `${window.location.origin}/profile?payment=success&purchased_plan=${planId}&billing=${billingPeriod}`,
          cancelUrl: `${window.location.origin}/get-premium`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create checkout session");
      }

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Helmet>
      <title>Get Premium – Upgrade Your Plan | ProPredict</title>
      <meta name="description" content="Upgrade to Pro or Premium for full access to AI predictions, match previews, and ad-free experience. Flexible monthly and annual plans." />
      <meta property="og:title" content="Get Premium – ProPredict" />
      <meta property="og:description" content="Upgrade for full access to AI predictions, match previews, and ad-free experience." />
      <meta property="og:image" content="https://propredict.me/og-image.png" />
      <meta property="og:url" content="https://propredict.me/get-premium" />
      <meta property="og:type" content="website" />
    </Helmet>
    <div className="section-gap max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Crown className="h-6 w-6 text-warning" />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Upgrade Your Experience</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">Choose the plan that's right for you</p>
      </div>

      {/* Android: Google Play info banner + Manage Subscription */}
      {isAndroidApp && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Subscriptions are processed via Google Play. Tap <span className="font-medium text-foreground">Get Pro</span> or <span className="font-medium text-foreground">Get Premium</span> to continue.
          </p>
          {currentPlan !== "free" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                const android = (window as any).Android;
                if (android?.manageSubscription) {
                  android.manageSubscription();
                } else {
                  // Fallback: open Google Play subscriptions page
                  window.open("https://play.google.com/store/account/subscriptions", "_blank");
                }
              }}
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Manage Subscription
            </Button>
          )}
        </div>
      )}

      {/* Billing Toggle - Both Web and Android */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-card border border-border">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              billingPeriod === "monthly"
                ? "bg-gradient-to-r from-warning via-accent to-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
              billingPeriod === "annual"
                ? "bg-gradient-to-r from-warning via-accent to-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <Badge className="bg-primary/20 text-primary border-0 text-[9px] px-1">Save 17%</Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {currentPlans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const isPremium = plan.id === "premium";
          const isPopular = plan.popular;
          const isFree = plan.id === "free";

          return (
            <Card
              key={plan.id}
              className={`relative p-4 transition-all ${
                isPremium
                  ? "bg-gradient-to-b from-violet-500/10 via-card to-card border-violet-500/30 ring-1 ring-violet-500/20"
                  : isPopular
                  ? "bg-gradient-to-b from-amber-500/10 via-card to-card border-amber-500/30"
                  : isFree
                  ? "bg-gradient-to-b from-primary/15 via-card to-card border-primary/30"
                  : "bg-card border-border"
              }`}
            >
              {isPremium && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 text-white border-0 text-[9px] px-2">
                  <Crown className="h-2.5 w-2.5 mr-1" />
                  Best Value
                </Badge>
              )}
              {isPopular && !isPremium && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black border-0 text-[9px] px-2">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  Popular
                </Badge>
              )}

              <div className="text-center space-y-2 pt-2">
                <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                </div>
                {'savings' in plan && typeof plan.savings === 'string' && (
                  <p className="text-[10px] text-primary font-medium">{plan.savings}</p>
                )}
                <p className="text-[10px] text-muted-foreground">{plan.description}</p>
              </div>

              <Button
                className={`w-full mt-4 h-8 text-xs ${
                  isPremium && !isCurrentPlan
                    ? "bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 hover:opacity-90 text-white border-0"
                    : isPopular && !isCurrentPlan
                    ? "bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    : ""
                }`}
                variant={isCurrentPlan ? "outline" : plan.buttonVariant}
                disabled={isCurrentPlan || (isFree && currentPlan !== "free") || isLoading}
                onClick={() => handleSubscribe(plan.id)}
              >
                {isLoading
                  ? "Loading..."
                  : isCurrentPlan
                  ? "Current Plan"
                  : isFree
                  ? (currentPlan === "free" ? "Current Plan" : "Free Plan")
                  : plan.buttonText
                }
              </Button>

              <ul className="mt-4 space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px]">
                    {f.included ? (
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                    )}
                    <span className={f.included ? "text-foreground" : "text-muted-foreground/50"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {/* Why Go Premium Section */}
      <div className="space-y-3">
        <h2 className="text-sm sm:text-base font-semibold text-foreground text-center">
          Why Go Premium?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="relative p-3 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border border-primary/30 hover:border-primary/50 hover:from-primary/20 hover:via-primary/15 transition-all group overflow-hidden shadow-[0_0_10px_rgba(15,155,142,0.1)]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20 border border-primary/40 group-hover:bg-primary/30 transition-colors">
                  <benefit.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-foreground">{benefit.title}</h4>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Animated Social Proof Text */}
      <p className="text-center text-xs sm:text-sm text-primary/90 font-medium animate-fade-in">
        Join 10,000+ smart users improving their prediction accuracy daily.
      </p>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className={`text-center py-4 px-2 bg-gradient-to-b from-primary/10 via-card to-card border-primary/20 shadow-[0_0_15px_rgba(15,155,142,0.1)] ${
              stat.isStar ? "animate-pulse ring-1 ring-warning/30 shadow-[0_0_20px_rgba(245,196,81,0.15)]" : ""
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</span>
              {stat.isStar && <Star className="h-4 w-4 sm:h-5 sm:w-5 text-warning fill-warning" />}
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Testimonials Slider */}
      <TestimonialsSlider />

      {/* Urgency Line */}
      <p className="text-center text-[10px] sm:text-xs text-warning/80 font-medium">
        🔥 Over 247 users upgraded to Premium this month.
      </p>

      {/* FAQ Section */}
      <div className="space-y-4">
        <h2 className="text-sm sm:text-base font-semibold text-foreground text-center">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="border border-primary/30 rounded-lg bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-4 shadow-[0_0_12px_rgba(15,155,142,0.12)] hover:border-primary/50 transition-colors"
            >
              <AccordionTrigger className="text-xs sm:text-sm font-medium text-foreground py-4 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-[11px] sm:text-xs text-muted-foreground pb-4 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Android: Restore Purchases */}
      {isAndroidApp && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground underline"
            onClick={() => {
              const android = (window as any).Android;
              if (android?.restorePurchases) {
                console.log("[Android] restorePurchases called");
                android.restorePurchases();
                toast.info("Restoring purchases…");
              } else {
                toast.error("Restore not available on this device.");
              }
            }}
          >
            Restore Purchases
          </Button>
        </div>
      )}

      {/* Footer CTA */}
      <p className="text-center text-xs text-muted-foreground">
        Choose package and unlock premium features.
      </p>
    </div>
    </>
  );
}
