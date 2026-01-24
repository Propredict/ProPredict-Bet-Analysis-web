import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";

const TermsOfService = () => {
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
          <h1 className="text-xl font-bold mb-1">Terms of Service</h1>
          <p className="text-xs text-muted-foreground mb-4">Last updated: January 10, 2026</p>

          <div className="space-y-3">
            {/* Important Notice */}
            <div className="border border-amber-500/50 bg-amber-500/10 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm text-amber-500 mb-1">Important Notice – No Betting Services</h3>
                  <p className="text-xs text-muted-foreground">
                    ProPredict does <strong className="text-foreground">NOT</strong> provide betting, gambling, or wagering services and does not allow users to place bets.
                  </p>
                </div>
              </div>
            </div>

            {/* 1 */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">1. Acceptance of Terms</h3>
              <p className="text-xs text-muted-foreground">
                By accessing or using ProPredict, you agree to be bound by these Terms of Service. If you do not
                agree, you must not use the service.
              </p>
            </div>

            {/* 2 */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">2. Nature of the Service</h3>
              <p className="text-xs text-muted-foreground font-medium mb-2">
                ProPredict is an informational and entertainment service only.
              </p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-2">
                <li>Sports predictions and analytical insights</li>
                <li>Match statistics and historical data</li>
                <li>AI-based analysis and probabilities</li>
                <li>Sports-related informational content</li>
              </ul>
              <p className="text-xs text-muted-foreground font-medium mb-1">ProPredict does NOT provide:</p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                <li>Betting or gambling services</li>
                <li>Real-money wagering</li>
                <li>Bet placement or processing</li>
                <li>Connections to bookmakers or betting operators</li>
              </ul>
            </div>

            {/* 3 */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">3. Disclaimer</h3>
              <p className="text-xs text-muted-foreground font-medium mb-2">
                ALL CONTENT IS PROVIDED FOR INFORMATIONAL AND ENTERTAINMENT PURPOSES ONLY.
              </p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-2">
                <li>Predictions are not guaranteed</li>
                <li>Past performance does not guarantee future results</li>
                <li>You are solely responsible for how you use the content</li>
                <li>Use of the service is at your own risk</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                ProPredict does not provide financial, investment, or betting advice.
              </p>
            </div>

            {/* 4 */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">4. Advertisements</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Some free features may require viewing advertisements to unlock content. Advertisements are provided
                by third-party partners.
              </p>
              <p className="text-xs text-muted-foreground">
                We use Google AdSense and other advertising services. These providers may use cookies or device
                identifiers to show personalized or non-personalized advertisements according to their privacy
                policies.
              </p>
            </div>

            {/* 5 */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">5. Subscriptions</h3>
              <p className="text-xs text-muted-foreground">
                Premium features may be available through subscriptions. Payments, renewals, and cancellations are
                handled by the platform where you purchased the subscription.
              </p>
            </div>

            {/* 6 */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">6. Age Restriction</h3>
              <p className="text-xs text-muted-foreground">
                You must be at least <strong className="text-foreground">18 years old</strong> to use ProPredict.
              </p>
            </div>

            {/* 7 */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">7. Limitation of Liability</h3>
              <p className="text-xs text-muted-foreground">
                ProPredict shall not be liable for any losses, damages, or consequences arising from the use of this
                service.
              </p>
            </div>

            {/* 8 */}
            <div className="border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-1.5">8. Contact</h3>
              <p className="text-xs text-muted-foreground">For questions about these Terms, contact us at:</p>
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

export default TermsOfService;
