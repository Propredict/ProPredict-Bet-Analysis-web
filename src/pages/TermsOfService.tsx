import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 10, 2026</p>

          <div className="space-y-8">
            {/* Important Notice */}
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <Lock className="w-8 h-8 text-amber-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-amber-500 mb-2">Important Notice – No Betting Services</h3>
                    <p className="text-foreground font-medium">
                      ProPredict does <strong>NOT</strong> provide betting, gambling, or wagering services and does not
                      allow users to place bets.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 1 */}
            <Card>
              <CardHeader>
                <CardTitle>1. Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  By accessing or using ProPredict, you agree to be bound by these Terms of Service. If you do not
                  agree, you must not use the service.
                </p>
              </CardContent>
            </Card>

            {/* 2 */}
            <Card>
              <CardHeader>
                <CardTitle>2. Nature of the Service</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground font-semibold mb-4">
                  ProPredict is an informational and entertainment service only.
                </p>

                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Sports predictions and analytical insights</li>
                  <li>Match statistics and historical data</li>
                  <li>AI-based analysis and probabilities</li>
                  <li>Sports-related informational content</li>
                </ul>

                <p className="text-muted-foreground mt-4 font-semibold">ProPredict does NOT provide:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-2">
                  <li>Betting or gambling services</li>
                  <li>Real-money wagering</li>
                  <li>Bet placement or processing</li>
                  <li>Connections to bookmakers or betting operators</li>
                </ul>
              </CardContent>
            </Card>

            {/* 3 */}
            <Card>
              <CardHeader>
                <CardTitle>3. Disclaimer</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground font-semibold">
                  ALL CONTENT IS PROVIDED FOR INFORMATIONAL AND ENTERTAINMENT PURPOSES ONLY.
                </p>

                <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                  <li>Predictions are not guaranteed</li>
                  <li>Past performance does not guarantee future results</li>
                  <li>You are solely responsible for how you use the content</li>
                  <li>Use of the service is at your own risk</li>
                </ul>

                <p className="text-muted-foreground mt-4">
                  ProPredict does not provide financial, investment, or betting advice.
                </p>
              </CardContent>
            </Card>

            {/* 4 */}
            <Card>
              <CardHeader>
                <CardTitle>4. Advertisements</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Some free features may require viewing advertisements to unlock content. Advertisements are provided
                  by third-party partners.
                </p>

                <p className="text-muted-foreground mt-4">
                  We use Google AdSense and other advertising services. These providers may use cookies or device
                  identifiers to show personalized or non-personalized advertisements according to their privacy
                  policies.
                </p>
              </CardContent>
            </Card>

            {/* 5 */}
            <Card>
              <CardHeader>
                <CardTitle>5. Subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Premium features may be available through subscriptions. Payments, renewals, and cancellations are
                  handled by the platform where you purchased the subscription.
                </p>
              </CardContent>
            </Card>

            {/* 6 */}
            <Card>
              <CardHeader>
                <CardTitle>6. Age Restriction</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  You must be at least <strong>18 years old</strong> to use ProPredict.
                </p>
              </CardContent>
            </Card>

            {/* 7 */}
            <Card>
              <CardHeader>
                <CardTitle>7. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  ProPredict shall not be liable for any losses, damages, or consequences arising from the use of this
                  service.
                </p>
              </CardContent>
            </Card>

            {/* 8 */}
            <Card>
              <CardHeader>
                <CardTitle>8. Contact</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">For questions about these Terms, contact us at:</p>
                <p className="mt-4">
                  <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">
                    propredictsupp@gmail.com
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
