import { Crown, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";

const features = [
  "Access all Premium tips & tickets",
  "Exclusive expert predictions",
  "AI-powered match analysis",
  "No ads or waiting",
  "Priority support",
];

export default function GetPremium() {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    // TODO: Integrate with payment provider
    console.log("Subscribe clicked");
  };

  return (
    <DashboardLayout>
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <Button
          variant="ghost"
          className="self-start mb-6 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Upgrade to Premium
          </h1>
          <p className="text-muted-foreground max-w-md">
            Unlock all premium content and get the edge you need to win
          </p>
        </div>

        <Card className="w-full max-w-md p-6 bg-card border-border">
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-foreground">
              $9.99
              <span className="text-lg font-normal text-muted-foreground">/month</span>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-3 text-foreground">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="h-3 w-3 text-success" />
                </div>
                {feature}
              </li>
            ))}
          </ul>

          <Button
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity"
            onClick={handleSubscribe}
          >
            <Crown className="h-5 w-5 mr-2" />
            Subscribe Now
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Cancel anytime. No hidden fees.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
