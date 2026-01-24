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
          <Button variant="ghost" onClick={() => navigate("/settings")} className="mb-3 h-7 text-xs gap-1">
            <ArrowLeft className="h-3 w-3" />
            Back to Settings
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-9 h-9 text-primary" />
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
          </div>

          <p className="text-muted-foreground mb-8">Last updated: January 10, 2026</p>

          <div className="space-y-8">
            {/* Important Notice */}
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <Lock className="w-7 h-7 text-amber-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-500 mb-2">Important Notice</h3>
                    <p className="text-muted-foreground">
                      ProPredict does <strong>NOT</strong> provide betting or gambling services. All content is for{" "}
                      <strong>informational and entertainment purposes only</strong>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Intro */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-6 text-sm text-muted-foreground">
                ProPredict ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains
                how we collect, use, and protect your information when you use our website and mobile application.
              </CardContent>
            </Card>

            {/* 1 */}
            <Card>
              <CardHeader>
                <CardTitle>1. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Email address and account credentials</li>
                  <li>Optional profile information</li>
                  <li>Device and browser information</li>
                  <li>IP address and approximate location</li>
                  <li>Usage and performance data</li>
                </ul>
              </CardContent>
            </Card>

            {/* 2 */}
            <Card>
              <CardHeader>
                <CardTitle>2. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Operate and improve the app</li>
                  <li>Provide support and notifications</li>
                  <li>Manage subscriptions</li>
                  <li>Analyze usage trends</li>
                  <li>Prevent fraud and abuse</li>
                </ul>
              </CardContent>
            </Card>

            {/* 3 */}
            <Card>
              <CardHeader>
                <CardTitle>3. Third-Party Services</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none space-y-4">
                <p className="text-muted-foreground">We use trusted third-party services:</p>

                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Google Analytics / Firebase – analytics & performance</li>
                  <li>Supabase – authentication & database</li>
                  <li>Google AdMob – ads in the mobile app</li>
                  <li>Google AdSense – ads on the website</li>
                </ul>

                <p className="text-muted-foreground text-sm">
                  Google may use cookies or device identifiers to display personalized or non-personalized ads.
                </p>

                <a
                  href="https://policies.google.com/technologies/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  Learn more about Google ads and data usage
                </a>
              </CardContent>
            </Card>

            {/* 4 */}
            <Card>
              <CardHeader>
                <CardTitle>4. Data Sharing</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  We do <strong>NOT</strong> sell personal data. Information may be shared only with:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-3 space-y-2">
                  <li>Service providers</li>
                  <li>Advertising partners</li>
                  <li>Legal authorities when required by law</li>
                </ul>
              </CardContent>
            </Card>

            {/* Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>5. Cookies</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  We use cookies to improve functionality, analyze traffic, and display advertisements.
                </p>

                <p className="text-muted-foreground mt-4">
                  For more information about cookies and how we use them, please review our{" "}
                  <a href="/cookies" className="text-primary hover:underline">
                    Cookie Policy
                  </a>
                  .
                </p>
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
