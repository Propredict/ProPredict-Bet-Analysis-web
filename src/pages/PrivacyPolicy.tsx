import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Shield, Lock, ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://propredict.me"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Privacy Policy",
        "item": "https://propredict.me/privacy-policy"
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Privacy Policy – ProPredict</title>
        <meta name="description" content="Learn how ProPredict collects, uses, and protects your personal information. Your privacy matters to us." />
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>
      <div className="section-gap">
      <Button variant="ghost" onClick={() => navigate("/settings")} className="mb-2 h-7 text-xs gap-1">
        <ArrowLeft className="h-3 w-3" />
        Back to Settings
      </Button>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Privacy Policy</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Last updated: January 10, 2026</p>

        <div className="space-y-4">
          {/* Important Notice */}
          <div className="border border-amber-500/50 bg-amber-500/10 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-amber-500 mb-1">Important Notice</h3>
                <p className="text-xs text-muted-foreground">
                  ProPredict does <strong className="text-foreground">NOT</strong> provide gambling services. All content is for{" "}
                  <strong className="text-foreground">informational and entertainment purposes only</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* 1. Introduction */}
          <div className="border border-primary/30 bg-primary/5 rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">1. Introduction</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              Welcome to ProPredict ("we", "our", or "us").
              We respect your privacy and are committed to protecting your personal information.
            </p>
            <p className="text-xs text-muted-foreground mb-1.5">
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website (propredict.me) and our mobile application.
            </p>
            <p className="text-xs text-muted-foreground">
              By using our services, you agree to the practices described in this policy.
            </p>
          </div>

          {/* 2. Information We Collect */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">2. Information We Collect</h3>
            <p className="text-xs text-muted-foreground mb-2">We may collect the following types of information:</p>

            <h4 className="font-semibold text-xs mb-1">2.1 Information You Provide</h4>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-2">
              <li>Email address</li>
              <li>Account login details</li>
              <li>Subscription information</li>
              <li>Customer support communications</li>
            </ul>

            <h4 className="font-semibold text-xs mb-1">2.2 Automatically Collected Information</h4>
            <p className="text-xs text-muted-foreground mb-1">When you use our website or mobile application, we may automatically collect:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-2">
              <li>IP address</li>
              <li>Device type and operating system</li>
              <li>Browser type</li>
              <li>App version</li>
              <li>Usage activity (pages viewed, interactions)</li>
              <li>Diagnostic data</li>
            </ul>

            <h4 className="font-semibold text-xs mb-1">2.3 Payment Information</h4>
            <p className="text-xs text-muted-foreground mb-1">Payments are processed securely through third-party payment providers:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>Stripe (for subscriptions purchased via our website)</li>
              <li>Google Play Billing (for subscriptions purchased within the Android application)</li>
            </ul>
            <p className="text-xs text-muted-foreground mb-2">We do not store full credit card details on our servers.</p>

            <h4 className="font-semibold text-xs mb-1">2.4 Advertising Identifiers</h4>
            <p className="text-xs text-muted-foreground">
              If you use our mobile application, advertising identifiers (such as Google Advertising ID) may be collected by Google AdMob for advertising and analytics purposes.
            </p>
          </div>

          {/* 3. How We Use Your Information */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">3. How We Use Your Information</h3>
            <p className="text-xs text-muted-foreground mb-1">We use collected information to:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              <li>Provide and maintain our services</li>
              <li>Generate AI-based statistical analysis and probability insights</li>
              <li>Improve our platform functionality</li>
              <li>Process subscription payments</li>
              <li>Communicate with users</li>
              <li>Send service-related notifications</li>
              <li>Analyze performance and usage trends</li>
              <li>Display advertisements (where applicable)</li>
            </ul>
          </div>

          {/* 4. Advertising and Third-Party Services */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">4. Advertising and Third-Party Services</h3>

            <h4 className="font-semibold text-xs mb-1">4.1 Advertising</h4>
            <p className="text-xs text-muted-foreground mb-1">We use:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li><strong className="text-foreground">Google AdSense</strong> to display advertisements on our website</li>
              <li><strong className="text-foreground">Google AdMob</strong> to display advertisements within our mobile application</li>
            </ul>
            <p className="text-xs text-muted-foreground mb-1.5">
              Google and its partners may use cookies and similar technologies to serve ads based on your prior visits to our website or app and other websites.
            </p>
            <p className="text-xs text-muted-foreground mb-1">These services may collect:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>Device information</li>
              <li>Advertising identifiers</li>
              <li>IP address</li>
              <li>Usage data</li>
            </ul>
            <p className="text-xs text-muted-foreground mb-2">
              You can manage or opt out of personalized advertising by visiting:{" "}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://adssettings.google.com
              </a>
            </p>

            <h4 className="font-semibold text-xs mb-1">4.2 Payment Processing</h4>
            <p className="text-xs text-muted-foreground mb-1">Subscription payments are processed by:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>Stripe (website subscriptions)</li>
              <li>Google Play Billing (Android in-app subscriptions)</li>
            </ul>
            <p className="text-xs text-muted-foreground mb-2">
              Each provider processes payment information in accordance with its own privacy policies.
            </p>

            <h4 className="font-semibold text-xs mb-1">4.3 Infrastructure & Analytics</h4>
            <p className="text-xs text-muted-foreground mb-1">We use trusted third-party service providers such as:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>Supabase (database and authentication services)</li>
              <li>Analytics providers for service improvement</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              These providers process data only as necessary to support our services.
            </p>
          </div>

          {/* 5. Cookies and Tracking Technologies */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">5. Cookies and Tracking Technologies</h3>
            <p className="text-xs text-muted-foreground mb-1">We use cookies and similar technologies to:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>Improve website functionality</li>
              <li>Analyze traffic and user behavior</li>
              <li>Provide personalized experiences</li>
              <li>Deliver relevant advertisements</li>
            </ul>
            <p className="text-xs text-muted-foreground mb-1.5">Users may control cookies through browser settings.</p>
            <p className="text-xs text-muted-foreground">
              For additional details, please refer to our{" "}
              <a href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</a>.
            </p>
          </div>

          {/* 6. Data Sharing */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">6. Data Sharing</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              We do <strong className="text-foreground">NOT</strong> sell personal data.
            </p>
            <p className="text-xs text-muted-foreground mb-1">We may share information with third parties only to:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              <li>Process payments</li>
              <li>Provide advertising services</li>
              <li>Maintain technical infrastructure</li>
              <li>Comply with legal obligations</li>
            </ul>
          </div>

          {/* 7. Data Retention */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">7. Data Retention</h3>
            <p className="text-xs text-muted-foreground mb-1">We retain personal data only as long as necessary to:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>Provide our services</li>
              <li>Comply with legal requirements</li>
              <li>Resolve disputes</li>
              <li>Enforce agreements</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Users may request account deletion at any time via the{" "}
              <a href="/data-deletion" className="text-primary hover:underline">Data Deletion Request</a>{" "}
              page or by contacting us at{" "}
              <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">propredictsupp@gmail.com</a>.
            </p>
          </div>

          {/* 8. Data Security */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">8. Data Security</h3>
            <p className="text-xs text-muted-foreground">
              We implement industry-standard technical and organizational safeguards to protect personal information from unauthorized access, alteration, disclosure, or destruction.
            </p>
          </div>

          {/* 9. Your Rights */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">9. Your Rights</h3>
            <p className="text-xs text-muted-foreground mb-1">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion</li>
              <li>Withdraw consent</li>
              <li>Restrict processing</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              To exercise these rights, contact us at:{" "}
              <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">propredictsupp@gmail.com</a>.
            </p>
          </div>

          {/* 10. Informational Nature of the Service */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">10. Informational Nature of the Service</h3>
            <p className="text-xs text-muted-foreground mb-1">
              ProPredict provides AI-generated statistical analysis and probability-based insights related to sports events.
            </p>
            <p className="text-xs text-muted-foreground mb-1">
              The platform does not facilitate gambling, accept wagers, or provide financial advice.
            </p>
            <p className="text-xs text-muted-foreground">
              All predictions are provided for informational and educational purposes only.
            </p>
          </div>

          {/* 11. Children's Privacy */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">11. Children's Privacy</h3>
            <p className="text-xs text-muted-foreground mb-1">
              Our services are not intended for individuals under the age of 18.
            </p>
            <p className="text-xs text-muted-foreground">
              We do not knowingly collect personal data from minors.
            </p>
          </div>

          {/* 12. International Data Transfers */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">12. International Data Transfers</h3>
            <p className="text-xs text-muted-foreground">
              Your information may be processed in countries outside your country of residence. By using our services, you consent to such transfers in accordance with applicable data protection laws.
            </p>
          </div>

          {/* 13. Changes to This Privacy Policy */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">13. Changes to This Privacy Policy</h3>
            <p className="text-xs text-muted-foreground">
              We may update this Privacy Policy periodically. Updates will be posted on this page with a revised effective date.
            </p>
          </div>

          {/* 14. Contact Information */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">14. Contact Information</h3>
            <p className="text-xs text-muted-foreground mb-1">If you have any questions about this Privacy Policy, please contact:</p>
            <p className="text-xs text-muted-foreground">
              Email:{" "}
              <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">propredictsupp@gmail.com</a>
            </p>
            <p className="text-xs text-muted-foreground">
              Website:{" "}
              <a href="https://propredict.me" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://propredict.me
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default PrivacyPolicy;
