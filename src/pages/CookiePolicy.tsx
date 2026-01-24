import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cookie, ArrowLeft, Settings, Shield } from "lucide-react";

const CookiePolicy = () => {
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
            <Cookie className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">Cookie Policy</h1>
          </div>

          <p className="text-muted-foreground mb-8">
            Last updated: January 24, 2026 | Effective Date: January 24, 2026
          </p>

          <div className="space-y-8">
            {/* Intro */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-6">
                <p className="text-sm">
                  This Cookie Policy explains how <strong>ProPredict</strong> ("we", "our", or "us") uses cookies and
                  similar tracking technologies when you visit our website and mobile application. By using our
                  services, you consent to the use of cookies as described in this policy.
                </p>
              </CardContent>
            </Card>

            {/* Section 1 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cookie className="w-5 h-5 text-primary" />
                  1. What Are Cookies?
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you
                  visit a website. They help websites remember your preferences, understand how you use the site, and
                  improve your overall experience.
                </p>
              </CardContent>
            </Card>

            {/* Section 2 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  2. Types of Cookies We Use
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground">Essential Cookies</h4>
                  <p className="text-muted-foreground text-sm">
                    These cookies are necessary for the website to function properly. They enable core features such as
                    security, authentication, and accessibility. You cannot opt out of these cookies.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground">Analytics Cookies</h4>
                  <p className="text-muted-foreground text-sm">
                    We use analytics cookies (such as Google Analytics and Firebase Analytics) to understand how
                    visitors interact with our website. This helps us improve our services and user experience.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground">Advertising Cookies</h4>
                  <p className="text-muted-foreground text-sm">
                    These cookies are used by advertising partners (such as Google AdSense and Google AdMob) to deliver
                    personalized advertisements based on your interests and browsing behavior.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground">Preference Cookies</h4>
                  <p className="text-muted-foreground text-sm">
                    These cookies remember your settings and preferences, such as language, theme, and notification
                    preferences, to provide a more personalized experience.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Section 3 */}
            <Card>
              <CardHeader>
                <CardTitle>3. Third-Party Cookies</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none space-y-4">
                <p className="text-muted-foreground">
                  We may allow third-party service providers to place cookies on your device. These include:
                </p>

                <div>
                  <h4 className="font-semibold text-foreground">Google Services</h4>
                  <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                    <li>Google Analytics – for website traffic analysis</li>
                    <li>Google AdSense – for displaying advertisements on our website</li>
                    <li>Google AdMob – for displaying advertisements in our mobile app</li>
                    <li>Firebase – for authentication and crash reporting</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground">Supabase</h4>
                  <p className="text-muted-foreground text-sm">
                    Used for authentication and session management.
                  </p>
                </div>

                <p className="text-muted-foreground text-sm">
                  For more information about how Google uses cookies, visit:{" "}
                  <a
                    href="https://policies.google.com/technologies/cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google's Cookie Policy
                  </a>
                </p>
              </CardContent>
            </Card>

            {/* Section 4 */}
            <Card>
              <CardHeader>
                <CardTitle>4. How to Manage Cookies</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  You can control and manage cookies in several ways:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>
                    <strong>Browser Settings:</strong> Most browsers allow you to refuse or delete cookies through
                    their settings menu.
                  </li>
                  <li>
                    <strong>Google Ad Settings:</strong> You can opt out of personalized advertising by visiting{" "}
                    <a
                      href="https://adssettings.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Ads Settings
                    </a>
                  </li>
                  <li>
                    <strong>Opt-Out Tools:</strong> You can use tools like the{" "}
                    <a
                      href="https://optout.networkadvertising.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Network Advertising Initiative opt-out page
                    </a>
                  </li>
                </ul>
                <p className="text-muted-foreground mt-4 text-sm">
                  Please note that disabling cookies may affect the functionality of our website and limit your access
                  to certain features.
                </p>
              </CardContent>
            </Card>

            {/* Section 5 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  5. Your Privacy Rights
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Depending on your location, you may have certain rights regarding cookies and personal data,
                  including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                  <li>The right to know what cookies are being used</li>
                  <li>The right to withdraw consent at any time</li>
                  <li>The right to request deletion of data collected via cookies</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  For more information about your privacy rights, please see our{" "}
                  <a
                    href="/privacy-policy"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </CardContent>
            </Card>

            {/* Section 6 */}
            <Card>
              <CardHeader>
                <CardTitle>6. Updates to This Policy</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  We may update this Cookie Policy from time to time to reflect changes in our practices or for legal,
                  operational, or regulatory reasons. We encourage you to review this page periodically for the latest
                  information.
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
                  If you have any questions about this Cookie Policy, please contact us:
                </p>
                <p className="text-muted-foreground mt-2">
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

export default CookiePolicy;
