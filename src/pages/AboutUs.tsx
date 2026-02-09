import { Helmet } from "react-helmet-async";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AboutUs = () => {
  const navigate = useNavigate();
  
  return (
    <>
      <Helmet>
        <title>About Us – AI Sports Predictions | ProPredict</title>
        <meta name="description" content="ProPredict is an AI-powered sports analysis platform providing match insights, predictions, and statistics for informational and entertainment purposes." />
      </Helmet>
      <div className="section-gap">
      <Button 
        variant="ghost" 
        className="mb-2 h-7 text-xs gap-1" 
        onClick={() => navigate("/settings")}
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Settings
      </Button>
      
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">About ProPredict</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Smart sports insights powered by data and analysis</p>

        <div className="space-y-3">
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">Who We Are</h3>
            <p className="text-xs text-muted-foreground">
              ProPredict is a sports analysis platform designed to provide users with AI-powered match insights,
              statistics, and predictions for informational and entertainment purposes.
            </p>
          </div>

          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">What We Do</h3>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              <li>Analyze football matches using data and AI models</li>
              <li>Provide probability-based predictions</li>
              <li>Offer premium analytical insights</li>
              <li>Display live scores and match statistics</li>
            </ul>
          </div>

          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">No Gambling Policy</h3>
            <p className="text-xs text-muted-foreground font-medium mb-1.5">
              ProPredict does NOT provide gambling services of any kind.
            </p>
            <p className="text-xs text-muted-foreground">
              We do not facilitate real-money transactions, process wagers, or connect to any gambling operators. All content is
              for informational and entertainment purposes only.
            </p>
          </div>

          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">Contact</h3>
            <p className="text-xs text-muted-foreground">If you have any questions, feel free to contact us:</p>
            <a href="mailto:propredictsupp@gmail.com" className="text-xs text-primary hover:underline">
              propredictsupp@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default AboutUs;
