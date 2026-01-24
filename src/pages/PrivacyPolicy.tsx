import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Trash2, Lock } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container px-4 py-16 flex-1">
        <div className="max-w-4xl mx-auto">
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

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-6">
                <p className="text-sm">
                  <strong>ProPredict</strong> ("we", "our", or "us") is committed to protecting your privacy. This
                  Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our
                  mobile application and website.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>1. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground">Personal Information</h4>
                  <p className="text-muted-foreground">
                    When you create an account or use our services, we may collect:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                    <li>Email address (for account creation and communication)</li>
                    <li>Display name and profile picture (optional)</li>
                    <li>Authentication credentials (securely hashed)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Usage Data</h4>
                  <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                    <li>Device information (type, operating system, unique identifiers)</li>
                    <li>App usage statistics and preferences</li>
                    <li>IP address and approximate location (country/region)</li>
                    <li>Crash reports and performance data</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Payment Information</h4>
                  <p className="text-muted-foreground">
                    Payment processing is handled by Google Play Store. We do not store your credit card or payment
                    details on our servers.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">We use the information we collect to:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process subscriptions and manage your account</li>
                  <li>Send you important updates and notifications</li>
                  <li>Personalize your experience and content</li>
                  <li>Analyze usage patterns to improve the app</li>
                  <li>Detect and prevent fraud and abuse</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Third-Party Services</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none space-y-4">
                <p className="text-muted-foreground">We use the following third-party services:</p>
                <div>
                  <h4 className="font-semibold text-foreground">Google AdMob</h4>
                  <p className="text-muted-foreground text-sm">
                    Displays advertisements in our free tier. AdMob may collect device identifiers and usage data to
                    serve personalized ads.
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      Google Privacy Policy
                    </a>
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Google Analytics / Firebase</h4>
                  <p className="text-muted-foreground text-sm">Used for app analytics and crash reporting.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Supabase</h4>
                  <p className="text-muted-foreground text-sm">Provides secure authentication and database services.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Data Sharing</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground font-medium">We do NOT sell your personal information.</p>
                <p className="text-muted-foreground mt-4">We may share information with:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-2">
                  <li>Service providers necessary for app operation</li>
                  <li>Advertising partners (for ad-supported features)</li>
                  <li>Legal authorities when required by law</li>
                  <li>Business partners in case of merger or acquisition</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Data Security</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">We implement industry-standard security measures including:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                  <li>Encryption of data in transit (TLS/SSL)</li>
                  <li>Secure password hashing</li>
                  <li>Regular security audits</li>
                  <li>Access controls and authentication</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute
                  security.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Your Rights (GDPR/CCPA)</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">Depending on your jurisdiction, you may have the right to:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                  <li>
                    <strong>Access</strong> - Request a copy of your personal data
                  </li>
                  <li>
                    <strong>Rectification</strong> - Correct inaccurate data
                  </li>
                  <li>
                    <strong>Erasure</strong> - Request deletion of your data
                  </li>
                  <li>
                    <strong>Portability</strong> - Receive your data in a portable format
                  </li>
                  <li>
                    <strong>Object</strong> - Opt out of certain processing
                  </li>
                  <li>
                    <strong>Withdraw Consent</strong> - Revoke consent at any time
                  </li>
                </ul>
                <div className="mt-6">
                  <Link to="/data-deletion">
                    <Button variant="outline" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Request Data Deletion
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Data Retention</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  We retain your personal data for as long as your account is active or as needed to provide services.
                  After account deletion:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                  <li>Account data is deleted within 30 days</li>
                  <li>Backup data is purged within 90 days</li>
                  <li>Financial records may be retained for legal compliance (up to 7 years)</li>
                  <li>Anonymized analytics data may be retained indefinitely</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Children's Privacy</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Our services are <strong>not intended for children under 18 years of age</strong>. We do not knowingly
                  collect personal information from children. If you believe a child has provided us with personal
                  information, please contact us immediately at
                  <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline ml-1">
                    propredictsupp@gmail.com
                  </a>
                  .
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. International Data Transfers</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Your data may be processed in countries outside your residence. We ensure appropriate safeguards are
                  in place, including Standard Contractual Clauses approved by the European Commission where applicable.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. Changes to This Policy</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by
                  posting the new policy in the app and updating the "Last updated" date. Continued use of the app after
                  changes constitutes acceptance.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>11. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  For privacy-related questions or to exercise your rights, contact us at:
                </p>
                <div className="mt-4 space-y-2 text-muted-foreground">
                  <p>
                    <strong>Email:</strong>{" "}
                    <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">
                      propredictsupp@gmail.com
                    </a>
                  </p>
                  <p>
                    <strong>Website:</strong>{" "}
                    <a
                      href="https://propredict.me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      https://propredict.me
                    </a>
                  </p>
                </div>
                <div className="mt-6 flex gap-4">
                  <Link to="/data-deletion">
                    <Button variant="outline" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete My Data
                    </Button>
                  </Link>
                  <Link to="/support">
                    <Button variant="ghost">Contact Support</Button>
                  </Link>
                </div>
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
