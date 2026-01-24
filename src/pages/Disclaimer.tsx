import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";

const Disclaimer = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container px-4 py-4 flex-1">
        <Button
          variant="ghost"
          onClick={() => navigate("/settings")}
          className="mb-2 h-7 text-xs gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Settings
        </Button>
        
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h1 className="text-xl font-bold">Disclaimer</h1>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Last updated: January 10, 2026</p>

          <div className="space-y-3">
            {/* Warning */}
            <div className="border border-amber-500/50 bg-amber-500/10 rounded-lg p-3">
              <h3 className="font-semibold text-sm text-amber-500 mb-1">Important Legal Notice</h3>
              <p className="text-xs text-muted-foreground">
                ProPredict does NOT offer betting, gambling, wagering, or real-money gaming services.
              </p>
            </div>

            {/* General */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">General Disclaimer</h3>
              <p className="text-xs text-muted-foreground mb-2">
                ProPredict is a sports analysis application created for
                <strong className="text-foreground"> informational and entertainment purposes only</strong>.
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Predictions, statistics, and insights are based on analysis and historical data and do not guarantee
                outcomes.
              </p>
              <p className="text-xs text-muted-foreground">
                ProPredict does not provide financial, investment, or betting advice.
              </p>
            </div>

            {/* Responsibility */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">User Responsibility</h3>
              <p className="text-xs text-muted-foreground">
                Users are solely responsible for any decisions they make based on the information provided by this
                app.
              </p>
            </div>

            {/* Age */}
            <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-3">
              <h3 className="font-semibold text-sm text-red-400 mb-1.5">Age Restriction (18+)</h3>
              <p className="text-xs text-muted-foreground">This app is intended only for users aged 18 or older.</p>
            </div>

            {/* Ads */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">Advertisements</h3>
              <p className="text-xs text-muted-foreground mb-2">
                ProPredict displays advertisements through Google AdSense and other advertising partners.
              </p>
              <p className="text-xs text-muted-foreground">
                These services may use cookies or device identifiers to display relevant ads in accordance with their
                privacy policies.
              </p>
            </div>

            {/* Contact */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">Contact</h3>
              <p className="text-xs text-muted-foreground">For questions regarding this disclaimer, contact us at:</p>
              <a href="mailto:propredictsupp@gmail.com" className="text-xs text-primary hover:underline">
                propredictsupp@gmail.com
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Disclaimer;
