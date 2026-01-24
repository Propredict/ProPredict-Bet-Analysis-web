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
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 10, 2026</p>

          <div className="space-y-8">
            {/* Important Disclaimer */}
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <Lock className="w-8 h-8 text-amber-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-amber-500 mb-2">Important Notice – No Betting Services</h3>
                    <p className="text-foreground font-medium mb-2">
                      ProPredict does <strong>NOT</strong> provide betting or gambling services and does not allow users
                      to place bets.
                    </p>
                    <p className="text-muted-foreground text-sm">
                      All content, including predictions, tips, and analytics, is provided for{" "}
                      <strong className="text-foreground">informational and entertainment purposes only</strong>.
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
                  ProPredict is an informational service only. We provide:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Sports predictions and analytical insights</li>
                  <li>Match statistics and historical data</li>
                  <li>Tips based on statistical analysis</li>
                  <li>Sports-related entertainment content</li>
                </ul>

                <p className="text-muted-foreground mt-4 font-semibold">We do NOT provide:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-2">
                  <li>Betting or gambling services</li>
                  <li>Real-money wagering</li>
                  <li>Bet placement or processing</li>
                  <li>Connections to bookmakers or operators</li>
                </ul>
              </CardContent>
            </Card>

            {/* 3 */}
            <Card>
              <CardHeader>
                <CardTitle>3. Content Description</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Daily Tips – Free predictions</li>
                  <li>Exclusive Tips – Unlockable via ads or subscription</li>
                  <li>Premium Tips – Subscription-only content</li>
                  <li>Daily Tickets – Curated prediction combinations</li>
                </ul>
              </CardContent>
            </Card>

            {/* 4 */}
            <Card>
              <CardHeader>
                <CardTitle>4. Disclaimer</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground font-semibold">
                  ALL CONTENT IS PROVIDED FOR ENTERTAINMENT AND INFORMATIONAL PURPOSES ONLY.
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                  <li>Predictions are not guaranteed</li>
                  <li>Past performance does not guarantee future results</li>
                  <li>You are solely responsible for how you use the content</li>
                  <li>Use of the service is at your own risk</li>
                </ul>
              </CardContent>
            </Card>

            {/* 5 */}
            <Card>
              <CardHeader>
                <CardTitle>5. User Accounts</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Provide accurate account information</li>
                  <li>Keep your login credentials secure</li>
                  <li>Notify us of unauthorized access</li>
                  <li>You are responsible for all activity on your account</li>
                </ul>
              </CardContent>
            </Card>

            {/* 6 */}
            <Card>
              <CardHeader>
                <CardTitle>6. Subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Premium features may be available via subscription. Billing, pricing, renewals, and cancellations are
                  handled by the app store platform you use. Prices may vary by region.
                </p>
              </CardContent>
            </Card>

            {/* 7 */}
            <Card>
              <CardHeader>
                <CardTitle>7. Advertisements</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Some free features may require viewing advertisements to unlock content. Advertisements are provided
                  by third parties.
                </p>
              </CardContent>
            </Card>

            {/* 8 */}
            <Card>
              <CardHeader>
                <CardTitle>8. Age Restriction</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  You must be at least <strong>18 years old</strong> to use ProPredict. By using the service, you
                  confirm that you meet this requirement.
                </p>
              </CardContent>
            </Card>

            {/* 9 */}
            <Card>
              <CardHeader>
                <CardTitle>9. Intellectual Property</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  All content and features are owned by ProPredict and protected by intellectual property laws.
                </p>
              </CardContent>
            </Card>

            {/* 10 */}
            <Card>
              <CardHeader>
                <CardTitle>10. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  ProPredict shall not be liable for any indirect, incidental, or consequential damages resulting from
                  your use of the service or reliance on any information provided.
                </p>
              </CardContent>
            </Card>

            {/* 11 */}
            <Card>
              <CardHeader>
                <CardTitle>11. Changes to Terms</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  We may update these Terms from time to time. Continued use of the service after changes means you
                  accept the updated Terms.
                </p>
              </CardContent>
            </Card>

            {/* 12 */}
            <Card>
              <CardHeader>
                <CardTitle>12. Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">Questions about these Terms can be sent to:</p>
                <p className="mt-4 text-muted-foreground">
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
