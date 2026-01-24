import { useState } from "react";
import { Crown, Check, X, Zap, Target, Brain, Bell, Clock, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUserPlan } from "@/hooks/useUserPlan";

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
      name: "Basic",
      price: "$3.99",
      period: "/month",
      description: "Unlock all tips without watching ads",
      buttonText: "Get Basic",
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
        { text: "All Basic features", included: true },
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
      name: "Basic",
      price: "$39.99",
      period: "/year",
      savings: "$3.33/mo - Save 17%",
      description: "Unlock all tips without watching ads",
      buttonText: "Get Basic",
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
      price: "$59.99",
      period: "/year",
      savings: "$5.00/mo - Save 17%",
      description: "Full access to all tickets and tips",
      buttonText: "Get Premium",
      buttonVariant: "default" as const,
      features: [
        { text: "All Basic features", included: true },
        { text: "All premium tickets", included: true },
        { text: "VIP accumulator bets", included: true },
        { text: "Full AI analysis", included: true },
        { text: "Priority support", included: true },
        { text: "Ad-free experience", included: true },
      ],
    },
  ],
};

const benefits = [
  {
    icon: Target,
    title: "Premium Tips",
    description: "Expert predictions with 90%+ historical accuracy",
  },
  {
    icon: Zap,
    title: "VIP Tickets",
    description: "High-odds accumulator bets curated by experts",
  },
  {
    icon: Brain,
    title: "Full AI Analysis",
    description: "Complete AI-powered match analysis and insights",
  },
  {
    icon: Bell,
    title: "Real-time Alerts",
    description: "Instant notifications for new tips and opportunities",
  },
  {
    icon: Clock,
    title: "Priority Access",
    description: "Get picks before the odds change",
  },
  {
    icon: Shield,
    title: "Money-back Guarantee",
    description: "30-day refund if not satisfied",
  },
];

const stats = [
  { value: "92%", label: "Premium Tip Accuracy" },
  { value: "15K+", label: "Active Subscribers" },
  { value: "$2.4M", label: "User Winnings (2024)" },
  { value: "4.9", label: "User Rating", isStar: true },
];

const faqs = [
  {
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.",
  },
  {
    question: "How do premium tips work?",
    answer: "Premium tips are expert-curated predictions with detailed analysis. You'll receive them directly in the app with notifications for time-sensitive picks.",
  },
  {
    question: "Is there a money-back guarantee?",
    answer: "Yes! We offer a 30-day money-back guarantee. If you're not satisfied with our premium service, we'll refund your subscription - no questions asked.",
  },
];

export default function GetPremium() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const { plan: currentPlan } = useUserPlan();
  const navigate = useNavigate();

  const currentPlans = plans[billingPeriod];

  const handleSubscribe = (planId: string) => {
    // TODO: Integrate with payment provider
    console.log(`Subscribe to ${planId} - ${billingPeriod}`);
  };

  return (
    <DashboardLayout>
      <div className="py-2 sm:py-4 px-0 sm:px-2 max-w-full overflow-x-hidden">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-3 sm:mb-4 px-1.5">
            <p className="text-accent text-[10px] sm:text-xs mb-2 sm:mb-3">
              Unlock expert predictions, VIP tips, and AI-powered analysis.
            </p>

            {/* Billing Toggle - responsive */}
            <div className="inline-flex items-center gap-0.5 sm:gap-1 bg-muted/50 p-0.5 rounded-full">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-colors flex items-center gap-0.5 sm:gap-1 ${
                  billingPeriod === "annual"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
                <Badge className="bg-accent text-accent-foreground text-[8px] sm:text-[9px] px-0.5 sm:px-1">Save 17%</Badge>
              </button>
            </div>
          </div>

          {/* Pricing Cards - stack on mobile, 3 cols on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-8 px-1.5 sm:px-0">
            {currentPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative p-2.5 sm:p-4 bg-card border-border ${
                  plan.popular ? "border-primary ring-1 ring-primary" : ""
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] px-1.5">
                    Most Popular
                  </Badge>
                )}

                <div className="text-center mb-2 sm:mb-3">
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-1">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-lg sm:text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.savings && (
                    <p className="text-[9px] sm:text-[10px] text-primary mt-0.5">{plan.savings}</p>
                  )}
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <Button
                  className={`w-full mb-2 sm:mb-3 text-[10px] sm:text-xs h-7 sm:h-8 ${
                    plan.id === "premium"
                      ? "bg-gradient-to-r from-accent to-primary hover:opacity-90"
                      : plan.id === "basic"
                      ? "bg-primary hover:bg-primary/90"
                      : ""
                  }`}
                  variant={plan.buttonVariant}
                  disabled={currentPlan === plan.id}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {currentPlan === plan.id ? "Current Plan" : plan.buttonText}
                </Button>

                <ul className="space-y-1 sm:space-y-1.5">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-[9px] sm:text-[10px]">
                      {feature.included ? (
                        <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary flex-shrink-0" />
                      ) : (
                        <X className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={feature.included ? "text-foreground" : "text-muted-foreground"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          {/* Why Go Premium */}
          <div className="mb-4 sm:mb-8 px-1.5 sm:px-0">
            <h2 className="text-sm sm:text-base font-bold text-foreground text-center mb-2 sm:mb-4">
              Why Go Premium?
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
              {benefits.map((benefit, idx) => (
                <Card key={idx} className="p-2 sm:p-2.5 bg-card border-border">
                  <div className="flex items-start gap-1.5 sm:gap-2">
                    <div className="p-1 sm:p-1.5 rounded-md bg-accent/10 flex-shrink-0">
                      <benefit.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground mb-0.5 text-[10px] sm:text-xs">{benefit.title}</h3>
                      <p className="text-[8px] sm:text-[9px] text-muted-foreground leading-tight">{benefit.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-8 px-1.5 sm:px-0">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-sm sm:text-lg font-bold text-foreground flex items-center justify-center gap-0.5">
                  {stat.value}
                  {stat.isStar && <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent fill-accent" />}
                </div>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mb-4 sm:mb-8 px-1.5 sm:px-0">
            <h2 className="text-sm sm:text-base font-bold text-foreground text-center mb-2 sm:mb-4">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="max-w-xl mx-auto">
              {faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`faq-${idx}`} className="border-border">
                  <AccordionTrigger className="text-foreground hover:no-underline text-left text-[10px] sm:text-xs py-2">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-[9px] sm:text-[10px] pb-2">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Bottom CTA */}
          <div className="text-center px-1.5 sm:px-0 pb-2">
            <p className="text-muted-foreground text-[10px] sm:text-xs">
              Choose package and unlock premium features.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
