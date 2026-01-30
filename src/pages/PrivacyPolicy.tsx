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

          {/* Intro */}
          <div className="border border-primary/30 bg-primary/5 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              ProPredict ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, and protect your information when you use our website and mobile application.
            </p>
          </div>

          {/* 1 */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">1. Information We Collect</h3>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              <li>Email address and account credentials</li>
              <li>Optional profile information</li>
              <li>Device and browser information</li>
              <li>IP address and approximate location</li>
              <li>Usage and performance data</li>
            </ul>
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
            <p className="text-xs text-muted-foreground mb-1.5">We use trusted third-party services:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-2">
              <li>Google Analytics / Firebase – analytics & performance</li>
              <li>Supabase – authentication & database</li>
              <li>Google AdMob – ads in the mobile app</li>
              <li>Google AdSense – ads on the website</li>
            </ul>
            <p className="text-xs text-muted-foreground mb-1">
              Google may use cookies or device identifiers to display personalized or non-personalized ads.
            </p>
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Learn more about Google ads and data usage
            </a>
          </div>

          {/* 4 */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">4. Data Sharing</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              We do <strong className="text-foreground">NOT</strong> sell personal data. Information may be shared only with:
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              <li>Service providers</li>
              <li>Advertising partners</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </div>

          {/* Cookies */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">5. Cookies</h3>
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
