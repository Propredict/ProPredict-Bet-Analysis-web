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

/* =====================
   STRIPE PRICE IDS
===================== */
const STRIPE_PRICES = {
  pro: {
    monthly: "price_1So1aOL8E849h6yxa6XtgjRj",
    annual: "price_1SpZ5OL8E849h6yxLP3NB1pi",
  },
  premium: {
    monthly: "price_1SpWSoL8E849h6yxK7hBWrRm",
    annual: "price_1SpZ64L8E849h6yxd2Fnz1YP",
  },
};

/* =====================
   PLANS CONFIG
===================== */
const plans = {
  monthly: [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "/forever",
      description: "Watch ads to unlock daily tips",
      buttonText: "Current Plan",
      buttonVariant: "outline" as const,
      features: [
        { text: "Daily tips (watch ads to unlock)", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "Basic predictions", included: true },
        { text: "Exclusive tips", included: false },
        { text: "Premium tickets", included: false },
        { text: "Ad-free experience", included: false },
      ],
    },
    {
      id: "basic",
      name: "Pro",
      price: "$3.99",
      period: "/month",
      description: "Unlock all tips without watching ads",
      buttonText: "Get Pro",
      buttonVariant: "default" as const,
      popular: true,
      features: [
        { text: "All daily tips unlocked", included: true },
        { text: "Exclusive tips access", included: true },
        { text: "Live scores", included: true },
        { text: "League standings", included: true },
        { text: "No ads for tips", included: true },
        { text: "Premium tickets", included: false },
        { text: "VIP analysis", included: false },
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: "$5.99",
      period: "/month",
      description: "Full access to all tickets and tips",
      buttonText: "Get Premium",
      buttonVariant: "default" as const,
      features: [
        { text: "All Pro features", included: true },
        { text: "All premium tickets", included: true },
        { text: "VIP accumulator bets", included: true },
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
      price: "$0",
      period: "/forever",
      description: "Watch ads to unlock daily tips",
      buttonText: "Current Plan",
      buttonVariant: "outline" as const,
      features: [],
    },
    {
      id: "basic",
      name: "Pro",
      price: "$39.99",
      period: "/year",
      savings: "Save 17%",
      description: "Unlock all tips without watching ads",
      buttonText: "Get Pro",
      buttonVariant: "default" as const,
      popular: true,
      features: [],
    },
    {
      id: "premium",
      name: "Premium",
      price: "$59.99",
      period: "/year",
      savings: "Save 17%",
      description: "Full access to all tickets and tips",
      buttonText: "Get Premium",
      buttonVariant: "default" as const,
      features: [],
    },
  ],
};

/* =====================
   COMPONENT
===================== */
export default function GetPremium() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const { plan: currentPlan } = useUserPlan();

  const handleSubscribe = async (planId: string) => {
    if (planId === "free" || planId === currentPlan) return;

    let priceId = "";

    if (planId === "basic") {
      priceId = STRIPE_PRICES.pro[billingPeriod];
    }

    if (planId === "premium") {
      priceId = STRIPE_PRICES.premium[billingPeriod];
    }

    if (!priceId) return;

    const stripe = (window as any).Stripe(
      import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    );

    await stripe.redirectToCheckout({
      mode: "subscription",
      lineItems: [{ price: priceId, quantity: 1 }],
      successUrl: `${window.location.origin}/profile`,
      cancelUrl: `${window.location.origin}/get-premium`,
    });
  };

  const currentPlans = plans[billingPeriod];

  return (
    <div className="section-gap max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Crown className="h-6 w-6 text-warning" />
          <h1 className="text-xl font-bold">Upgrade Your Experience</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Choose the plan that's right for you
        </p>
      </div>

      {/* BILLING TOGGLE */}
      <div className="flex justify-center">
        <div className="inline-flex gap-1 p-1 rounded-lg bg-card border">
          {["monthly", "annual"].map((p) => (
            <button
              key={p}
              onClick={() => setBillingPeriod(p as any)}
              className={`px-4 py-1.5 text-xs rounded-md ${
                billingPeriod === p
                  ? "bg-gradient-to-r from-warning via-accent to-primary text-white"
                  : "text-muted-foreground"
              }`}
            >
              {p === "monthly" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>
      </div>

      {/* PLANS */}
      <div className="grid md:grid-cols-3 gap-3">
        {currentPlans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <Card key={plan.id} className="p-4">
              <h3 className="text-sm font-semibold text-center">{plan.name}</h3>
              <p className="text-center text-xl font-bold">{plan.price}</p>

              <Button
                className="w-full mt-3"
                disabled={isCurrent}
                onClick={() => handleSubscribe(plan.id)}
              >
                {isCurrent ? "Current Plan" : plan.buttonText}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
