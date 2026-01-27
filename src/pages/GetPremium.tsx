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
  { icon: Target, title: "Premium Tips", description: "Expert predictions with 90%+ historical accuracy" },
  { icon: Zap, title: "VIP Tickets", description: "High-odds accumulator bets curated by experts" },
  { icon: Brain, title: "Full AI Analysis", description: "Complete AI-powered match analysis and insights" },
  { icon: Bell, title: "Real-time Alerts", description: "Instant notifications for new tips and opportunities" },
  { icon: Clock, title: "Priority Access", description: "Get picks before the odds change" },
  { icon: Shield, title: "Money-back Guarantee", description: "30-day refund if not satisfied" },
];

const stats = [
  { value: "92%", label: "Premium Tip Accuracy" },
  { value: "15K+", label: "Active Subscribers" },
  { value: "$2.4M", label: "User Winnings (2025)" },
  { value: "4.9", label: "User Rating", isStar: true },
];

const faqs = [
  { question: "Can I cancel anytime?", answer: "Yes, you can cancel anytime." },
  { question: "How do premium tips work?", answer: "Expert curated predictions with full analysis." },
  { question: "Is there a money-back guarantee?", answer: "Yes, 30-day refund guarantee." },
];

export default function GetPremium() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const { plan: currentPlan } = useUserPlan();

  const currentPlans = plans[billingPeriod];

  const handleSubscribe = (planId: string) => {
    alert(`Subscribe clicked: ${planId} (${billingPeriod})`);
  };

  return (
    <div className="py-4 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currentPlans.map((plan) => (
          <Card key={plan.id} className="p-4">
            <h3 className="text-center font-semibold mb-2">{plan.name}</h3>
            <p className="text-center text-lg font-bold">{plan.price}{plan.period}</p>

            <Button
              className="w-full mt-3"
              disabled={currentPlan === plan.id}
              onClick={() => handleSubscribe(plan.id)}
            >
              {currentPlan === plan.id ? "Current Plan" : plan.buttonText}
            </Button>

            <ul className="mt-3 space-y-1">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  {f.included ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-muted-foreground" />}
                  {f.text}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
