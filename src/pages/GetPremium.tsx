import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const plans = {
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
        { text: "Full access to daily tips/tickets", included: true },
        { text: "Free AI Basic predictions", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "Ads supported", included: true },
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
        { text: "Daily & Pro tips/tickets unlocked", included: true },
        { text: "Basic & Pro AI predictions", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "Ad-free tips/ticket experience", included: true },
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
        { text: "Full access to daily tips/tickets", included: true },
        { text: "Free AI Basic predictions", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "Ads supported", included: true },
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
        { text: "Daily & Pro tips/tickets unlocked", included: true },
        { text: "Basic & Pro AI predictions", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "Ad-free tips/ticket experience", included: true },
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
        { text: "Priority support", included: true },
        { text: "Ad-free experience", included: true },
      ],
    },
  ],
};

const benefits = [
  { icon: Target, title: "Premium Predictions", description: "Expert analysis with 90%+ historical accuracy" },
  { icon: Zap, title: "VIP Match Bundles", description: "Curated multi-match insights from our experts" },
  { icon: Brain, title: "Full AI Analysis", description: "Complete AI-powered match analysis and insights" },
  { icon: Bell, title: "Real-time Alerts", description: "Instant notifications for new predictions" },
  { icon: Clock, title: "Priority Access", description: "Get insights before match kickoff" },
  { icon: Shield, title: "Satisfaction Guarantee", description: "30-day refund if not satisfied" },
];

const stats = [
  { value: "92%", label: "Prediction Accuracy" },
  { value: "10K+", label: "Active Users" },
  { value: "500+", label: "Daily Analyses" },
  { value: "4.9", label: "User Rating", isStar: true },
];

const faqs = [
  { question: "Can I cancel anytime?", answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period." },
  { question: "How do premium tips work?", answer: "Our expert analysts provide carefully curated predictions with detailed analysis, giving you the edge you need to make informed decisions." },
  { question: "Can I change my plan anytime?", answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is adjusted accordingly." },
];

export default function GetPremium() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const { plan: currentPlan } = useUserPlan();
  const { isAndroidApp } = usePlatform();

  const currentPlans = plans[billingPeriod];

  const handleSubscribe = async (planId: string) => {
    if (planId === "free" || currentPlan === planId) return;

    // Android: HARD BLOCK - NO Stripe, NO redirects. Native only.
    if (isAndroidApp) {
      if (!window.Android) {
        toast.error("Native purchase is unavailable. Please use the Android app version.");
        return;
      }

      if (planId === "basic") {
        if (window.Android.getPro) window.Android.getPro();
        else if (window.Android.buyPro) window.Android.buyPro();
        return;
      }

      if (planId === "premium") {
        if (window.Android.getPremium) window.Android.getPremium();
        else if (window.Android.buyPremium) window.Android.buyPremium();
        return;
      }

      return;
    }

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
          successUrl: `${window.location.origin}/profile?payment=success`,
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
    <div className="section-gap max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Crown className="h-6 w-6 text-warning" />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Upgrade Your Experience</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">Choose the plan that's right for you</p>
      </div>

      {isAndroidApp && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Subscriptions in the Android app are processed via Google Play. Tap <span className="font-medium text-foreground">Get Pro</span> or <span className="font-medium text-foreground">Get Premium</span> to continue.
          </p>
        </div>
      )}

      {/* Billing Toggle */}
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

          return (
            <Card
              key={plan.id}
              className={`relative p-4 transition-all ${
                isPremium
                  ? "bg-gradient-to-b from-warning/10 via-card to-card border-warning/30 ring-1 ring-warning/20"
                  : isPopular
                  ? "bg-gradient-to-b from-primary/10 via-card to-card border-primary/30"
                  : "bg-card border-border"
              }`}
            >
              {isPremium && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-warning via-accent to-primary text-white border-0 text-[9px] px-2">
                  <Crown className="h-2.5 w-2.5 mr-1" />
                  Best Value
                </Badge>
              )}
              {isPopular && !isPremium && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0 text-[9px] px-2">
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
                {plan.savings && (
                  <p className="text-[10px] text-primary font-medium">{plan.savings}</p>
                )}
                <p className="text-[10px] text-muted-foreground">{plan.description}</p>
              </div>

              <Button
                className={`w-full mt-4 h-8 text-xs ${
                  isPremium && !isCurrentPlan
                    ? "bg-gradient-to-r from-warning via-accent to-primary hover:opacity-90 text-white border-0"
                    : isPopular && !isCurrentPlan
                    ? "bg-primary hover:bg-primary/90"
                    : ""
                }`}
                variant={isCurrentPlan ? "outline" : plan.buttonVariant}
                disabled={isCurrentPlan || isLoading}
                onClick={() => handleSubscribe(plan.id)}
              >
                {isLoading ? "Loading..." : isCurrentPlan ? "Current Plan" : plan.buttonText}
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
              className="relative p-3 bg-card border-l-2 border-l-primary border-t border-r border-b border-border/50 hover:border-l-primary hover:border-primary/40 transition-all group overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 group-hover:bg-primary/20 transition-colors">
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

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat, index) => (
          <div key={index} className="text-center py-3">
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg sm:text-xl font-bold text-foreground">{stat.value}</span>
              {stat.isStar && <Star className="h-4 w-4 text-warning fill-warning" />}
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground text-center">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="space-y-1">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="border border-border rounded-lg bg-card/50 px-3"
            >
              <AccordionTrigger className="text-xs font-medium text-foreground py-3 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-[11px] text-muted-foreground pb-3">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Footer CTA */}
      <p className="text-center text-xs text-muted-foreground">
        Choose package and unlock premium features.
      </p>
    </div>
  );
}
