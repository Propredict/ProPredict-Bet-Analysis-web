import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/settings")}
            className="mb-3 h-7 text-xs gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Settings
          </Button>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
          </div>

          <p className="text-muted-foreground mb-8">
            Last updated: January 10, 2026 | Effective Date: January 10, 2026
          </p>

          <div className="space-y-8">
            {/* Important Disclaimer Banner */}
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <Lock className="w-8 h-8 text-amber-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-amber-500 mb-2">🔒 Important Notice</h3>
                    <p className="text-foreground font-medium">
                      ProPredict does NOT provide betting services and does NOT allow users to place bets. All content
                      is for <strong>informational and entertainment purposes only</strong>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Intro */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-6">
                <p className="text-sm">
                  <strong>ProPredict</strong> ("we", "our", or "us") is committed to protecting your privacy. This
                  Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our
                  mobile application and website.
                </p>
              </CardContent>
            </Card>

            {/* Section 1 */}
            <Card>
              <CardHeader>
                <CardTitle>1. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground">Personal Information</h4>
                  <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                    <li>Email address</li>
                    <li>Display name and profile picture (optional)</li>
                    <li>Authentication credentials (securely hashed)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground">Usage Data</h4>
                  <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                    <li>Device and browser information</li>
                    <li>IP address and approximate location</li>
                    <li>App usage statistics</li>
                    <li>Crash and performance reports</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Section 2 */}
            <Card>
              <CardHeader>
                <CardTitle>2. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Operate and improve the app</li>
                  <li>Manage subscriptions</li>
                  <li>Provide support and notifications</li>
                  <li>Analyze usage patterns</li>
                  <li>Ensure security and prevent abuse</li>
                </ul>
              </CardContent>
            </Card>

            {/* Section 3 */}
            <Card>
              <CardHeader>
                <CardTitle>3. Third-Party Services</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground">Google AdMob</h4>
                  <p className="text-muted-foreground text-sm">Used to display ads in the mobile application.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground">Google Analytics / Firebase</h4>
                  <p className="text-muted-foreground text-sm">Used for analytics and crash reporting.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground">Supabase</h4>
                  <p className="text-muted-foreground text-sm">Provides authentication and database services.</p>
                </div>

                {/* ✅ GOOGLE ADSENSE (IMPORTANT) */}
                <div>
                  <h4 className="font-semibold text-foreground">Google AdSense</h4>
                  <p className="text-muted-foreground text-sm">
                    We use Google AdSense to display advertisements on our website. Google may use cookies or device
                    identifiers to serve personalized ads based on your interests and browsing behavior.
                    <a
                      href="https://policies.google.com/technologies/ads"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      Learn more about how Google manages ads and data.
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Section 4 */}
            <Card>
              <CardHeader>
                <CardTitle>4. Data Sharing</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground font-medium">We do NOT sell your personal data.</p>
                <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                  <li>Service providers</li>
                  <li>Advertising partners</li>
                  <li>Legal authorities if required</li>
                </ul>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Email:{" "}
                  <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">
                    propredictsupp@gmail.com
                  </a>
                </p>
                <p className="text-muted-foreground">
                  Website:{" "}
                  <a
                    href="https://propredict.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    https://propredict.me
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

export default PrivacyPolicy;
