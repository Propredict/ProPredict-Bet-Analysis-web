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

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightPlan?: "basic" | "premium";
}

const plans = [
  {
    id: "free" as UserPlan,
    name: "Free",
    price: "$0",
    period: "forever",
    icon: Sparkles,
    description: "Basic access with ads",
    features: [
      "Daily tips (watch ads)",
      "Basic match stats",
      "Live scores",
    ],
    buttonText: "Current Plan",
    buttonVariant: "outline" as const,
  },
  {
    id: "basic" as UserPlan,
    name: "Basic",
    price: "$9.99",
    period: "/month",
    icon: Star,
    description: "Ad-free with exclusive content",
    popular: true,
    features: [
      "All Daily tips unlocked",
      "Exclusive predictions",
      "Ad-free experience",
      "Priority support",
    ],
    buttonText: "Upgrade to Basic",
    buttonVariant: "default" as const,
  },
  {
    id: "premium" as UserPlan,
    name: "Premium",
    price: "$24.99",
    period: "/month",
    icon: Crown,
    description: "Full access to everything",
    features: [
      "Everything in Basic",
      "Premium predictions",
      "VIP betting tickets",
      "Expert analysis",
      "Early access to features",
    ],
    buttonText: "Go Premium",
    buttonVariant: "default" as const,
  },
];

export function PricingModal({ open, onOpenChange, highlightPlan }: PricingModalProps) {
  const { plan: currentPlan } = useUserPlan();

  const handleSelectPlan = (planId: UserPlan) => {
    // Real payment integration would go here
    // For now, just close the modal and show a message
    if (planId === "basic") {
      window.open("https://example.com/checkout/basic", "_blank");
    } else if (planId === "premium") {
      window.open("https://example.com/checkout/premium", "_blank");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Unlock Premium Predictions
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
                  <div className={cn(
                    "p-2 rounded-lg",
                    planItem.id === "premium" ? "bg-warning/20 text-warning" :
                    planItem.id === "basic" ? "bg-primary/20 text-primary" :
                    "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{planItem.name}</h3>
                    <p className="text-xs text-muted-foreground">{planItem.description}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">{planItem.price}</span>
                  <span className="text-muted-foreground text-sm">{planItem.period}</span>
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
                  className={cn(
                    "w-full",
                    planItem.id === "premium" && !isCurrentPlan && "bg-warning hover:bg-warning/90 text-warning-foreground"
                  )}
                  disabled={isCurrentPlan || planItem.id === "free"}
                  onClick={() => handleSelectPlan(planItem.id)}
                >
                  {isCurrentPlan ? "Current Plan" : planItem.buttonText}
                </Button>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Payment integration coming soon. Contact support for early access.
        </p>
      </DialogContent>
    </Dialog>
  );
}
