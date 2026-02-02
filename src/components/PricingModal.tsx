import { Check, Crown, Star, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUserPlan, type UserPlan } from "@/hooks/useUserPlan";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useNavigate } from "react-router-dom";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightPlan?: "basic" | "premium";
}

const plans = [
  {
    id: "free" as UserPlan,
    name: "Free",
    price: "€0",
    period: "forever",
    icon: Sparkles,
    description: "Basic access to get started",
    features: [
      "Full access to daily tips/tickets",
      "Free AI predictions",
      "Live scores & standings",
      "Ads supported",
    ],
    buttonText: "Current Plan",
    buttonVariant: "outline" as const,
  },
  {
    id: "basic" as UserPlan,
    name: "Pro",
    price: "€3.99",
    period: "/month",
    icon: Star,
    description: "Full access to daily & exclusive",
    popular: true,
    features: [
      "All daily tips/tickets unlocked",
      "Exclusive tips/tickets",
      "Live scores & standings",
      "Ad-free tips/ticket experience",
    ],
    buttonText: "Upgrade to Pro",
    buttonVariant: "default" as const,
  },
  {
    id: "premium" as UserPlan,
    name: "Premium",
    price: "€5.99",
    period: "/month",
    icon: Crown,
    description: "Full access to everything",
    features: [
      "All Pro features",
      "Premium match insights",
      "VIP multi-match analysis",
      "Full AI analysis",
      "Priority support",
      "Ad-free experience",
    ],
    buttonText: "Go Premium",
    buttonVariant: "default" as const,
  },
];

export function PricingModal({ open, onOpenChange, highlightPlan }: PricingModalProps) {
  const { plan: currentPlan } = useUserPlan();
  const navigate = useNavigate();

  const handleSelectPlan = (planId: UserPlan) => {
    onOpenChange(false);

    // Android: HARD BLOCK - never navigate to Stripe flows
    if (getIsAndroidApp()) {
      if (!window.Android) return;
      if (planId === "basic") {
        if (window.Android.getPro) window.Android.getPro();
        else if (window.Android.buyPro) window.Android.buyPro();
      }
      if (planId === "premium") {
        if (window.Android.getPremium) window.Android.getPremium();
        else if (window.Android.buyPremium) window.Android.buyPremium();
      }
      return;
    }

    navigate("/get-premium");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Choose the plan that fits your betting style
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {plans.map((planItem) => {
            const isCurrentPlan = currentPlan === planItem.id;
            const isHighlighted = highlightPlan === planItem.id;
            const Icon = planItem.icon;

            return (
              <Card
                key={planItem.id}
                className={cn(
                  "relative p-5 flex flex-col",
                  isHighlighted && "ring-2 ring-primary",
                  planItem.popular && "border-primary"
                )}
              >
                {planItem.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-primary/20 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{planItem.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {planItem.description}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">{planItem.price}</span>
                  <span className="text-muted-foreground text-sm">
                    {planItem.period}
                  </span>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {planItem.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isCurrentPlan ? "outline" : planItem.buttonVariant}
                  className="w-full"
                  disabled={isCurrentPlan || planItem.id === "free"}
                  onClick={() => handleSelectPlan(planItem.id)}
                >
                  {isCurrentPlan ? "Current Plan" : planItem.buttonText}
                </Button>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
