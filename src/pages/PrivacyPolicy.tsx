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

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Privacy Policy</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Last updated: January 10, 2026</p>

        <div className="space-y-3">
          {/* Important Notice */}
          <div className="border border-amber-500/50 bg-amber-500/10 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-amber-500 mb-1">Important Notice</h3>
                <p className="text-xs text-muted-foreground">
                  ProPredict does <strong className="text-foreground">NOT</strong> provide betting or gambling services. All content is for{" "}
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
              <li>Account credentials</li>
              <li>Subscription details</li>
              <li>Support inquiries</li>
            </ul>

            <h4 className="font-semibold text-xs mb-1">2.2 Automatically Collected Information</h4>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-2">
              <li>IP address</li>
              <li>Device type</li>
              <li>Operating system</li>
              <li>Browser type</li>
              <li>Usage data (pages visited, features used)</li>
              <li>App interaction data</li>
            </ul>

            <h4 className="font-semibold text-xs mb-1">2.3 Payment Information</h4>
            <div className="border border-border bg-muted/30 rounded-md p-2 mt-1">
              <p className="text-xs font-semibold mb-1">💳 Payment Processing</p>
              <p className="text-xs text-muted-foreground mb-1.5">
                We use third-party payment processors to securely handle subscription payments:
              </p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
                <li>Stripe (for subscriptions purchased via our website)</li>
                <li>Google Play Billing (for subscriptions purchased within our Android mobile application)</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                We do not store full payment card details on our servers. All payment transactions are processed securely by the respective payment provider.
              </p>
            </div>
          </div>

          {/* 2 */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">2. How We Use Your Information</h3>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              <li>Operate and improve the app</li>
              <li>Provide support and notifications</li>
              <li>Manage subscriptions</li>
              <li>Analyze usage trends</li>
              <li>Prevent fraud and abuse</li>
            </ul>
          </div>

          {/* 3 */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">3. Third-Party Services</h3>
            <p className="text-xs text-muted-foreground mb-1.5">We use trusted third-party services to operate and monetize ProPredict:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-2">
              <li>Advertising partners for website and mobile app monetization</li>
              <li>Analytics services (e.g. Google Analytics / Firebase)</li>
              <li>Authentication and database services (e.g. Supabase)</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Advertising partners may use cookies, device identifiers, or similar technologies to display personalized or non-personalized advertisements in accordance with applicable laws.
            </p>
          </div>

          {/* Advertising & Consent */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">Advertising & Consent</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              ProPredict may display advertisements on the website and in the mobile application through third-party advertising partners.
            </p>
            <p className="text-xs text-muted-foreground mb-1.5">
              Ads may be personalized or non-personalized depending on user consent, location, and applicable regulations (such as GDPR and CCPA).
            </p>
            <p className="text-xs text-muted-foreground">
              Users may manage or withdraw consent through cookie settings, device settings, or browser controls.
            </p>
          </div>

          {/* 4 - Subscriptions & Payments */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">4. Subscriptions & Payments</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              Premium features may be available through paid subscriptions.
            </p>
            <p className="text-xs text-muted-foreground mb-1.5">
              All subscription payments are processed and managed exclusively by the platform where the purchase is made (such as Google Play Store or Apple App Store).
            </p>
            <p className="text-xs text-muted-foreground">
              ProPredict does not directly collect, process, or store any payment or credit card information.
            </p>
          </div>

          {/* 5 */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">5. Data Sharing</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              We do <strong className="text-foreground">NOT</strong> sell personal data. Information may be shared only with:
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              <li>Service providers</li>
              <li>Advertising partners</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </div>

          {/* 6 - Cookies */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">6. Cookies</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              We use cookies to improve functionality, analyze traffic, and display advertisements.
            </p>
            <p className="text-xs text-muted-foreground">
              For more information about cookies and how we use them, please review our{" "}
              <a href="/cookie-policy" className="text-primary hover:underline">
                Cookie Policy
              </a>
              .
            </p>
          </div>

          {/* 7 - Data Retention */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">7. Data Retention</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              We retain personal data only for as long as necessary to provide and improve the service or to comply with legal obligations.
            </p>
            <p className="text-xs text-muted-foreground">
              Users may request deletion of their personal data at any time via the{" "}
              <a href="/data-deletion" className="text-primary hover:underline">
                Data Deletion Request
              </a>{" "}
              page or by contacting us at{" "}
              <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">
                propredictsupp@gmail.com
              </a>
              .
            </p>
          </div>

          {/* Contact */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">Contact Us</h3>
            <p className="text-xs text-muted-foreground">
              Email:{" "}
              <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">
                propredictsupp@gmail.com
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
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
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default PrivacyPolicy;
