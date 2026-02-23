import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const CookiePolicy = () => {
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
        "name": "Cookie Policy",
        "item": "https://propredict.me/cookie-policy"
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Cookie Policy – ProPredict</title>
        <meta name="description" content="Understand how ProPredict uses cookies and similar technologies to improve your experience." />
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>
      <div className="section-gap">
      <Button variant="ghost" className="mb-2 h-7 text-xs gap-1" onClick={() => navigate("/settings")}>
        <ArrowLeft className="h-3 w-3" />
        Back to Settings
      </Button>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🍪</span>
          <h1 className="text-xl font-bold">Cookie Policy</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Last updated: January 10, 2026</p>

        <div className="space-y-4">
          {/* 1. Introduction */}
          <div className="border border-primary/30 bg-primary/5 rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">1. Introduction</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              This Cookie Policy explains how ProPredict ("we", "our", or "us") uses cookies and similar technologies when you visit our website (<a href="https://propredict.me" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://propredict.me</a>) or use our mobile application.
            </p>
            <p className="text-xs text-muted-foreground">
              By continuing to use our services, you agree to the use of cookies as described in this policy.
            </p>
          </div>

          {/* 2. What Are Cookies? */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">2. What Are Cookies?</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              Cookies are small text files placed on your device when you visit a website. They are widely used to ensure websites function properly, improve user experience, analyze traffic, and display relevant advertisements.
            </p>
            <p className="text-xs text-muted-foreground">
              Similar technologies such as pixels, local storage, and advertising identifiers may also be used in our mobile application.
            </p>
          </div>

          {/* 3. Types of Cookies We Use */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">3. Types of Cookies We Use</h3>

            <h4 className="font-semibold text-xs mb-1">3.1 Essential Cookies</h4>
            <p className="text-xs text-muted-foreground mb-1">These cookies are necessary for the operation of our website and mobile application. They enable core functionality such as:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>User authentication</li>
              <li>Security features</li>
              <li>Session management</li>
              <li>Fraud prevention</li>
            </ul>
            <p className="text-xs text-muted-foreground mb-2">Without these cookies, certain parts of our services may not function properly.</p>

            <h4 className="font-semibold text-xs mb-1">3.2 Analytics Cookies</h4>
            <p className="text-xs text-muted-foreground mb-1">We use analytics tools to understand how users interact with our platform. These cookies collect information such as:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>Pages visited</li>
              <li>Time spent on pages</li>
              <li>Device type</li>
              <li>Browser type</li>
              <li>App usage data</li>
            </ul>
            <p className="text-xs text-muted-foreground mb-2">This information helps us improve performance and user experience.</p>

            <h4 className="font-semibold text-xs mb-1">3.3 Advertising Cookies</h4>
            <p className="text-xs text-muted-foreground mb-1">We use third-party advertising services to display ads:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li><strong className="text-foreground">Google AdSense</strong> (for website advertising)</li>
              <li><strong className="text-foreground">Google AdMob</strong> (for mobile app advertising)</li>
            </ul>
            <p className="text-xs text-muted-foreground mb-1">These services may use cookies, advertising identifiers (such as Google Advertising ID), and similar technologies to:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>Deliver personalized advertisements</li>
              <li>Measure ad performance</li>
              <li>Prevent fraud</li>
              <li>Improve ad relevance</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Google and its partners may serve ads based on your prior visits to our website or app and other websites.
            </p>
          </div>

          {/* 4. Third-Party Cookies */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">4. Third-Party Cookies</h3>
            <p className="text-xs text-muted-foreground mb-1">Some cookies are placed by third-party providers who perform services on our behalf, including:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>Google (AdSense and AdMob)</li>
              <li>Stripe (payment processing)</li>
              <li>Google Play Billing (in-app purchases)</li>
              <li>Supabase (authentication and infrastructure services)</li>
              <li>Analytics providers</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              These third parties may collect data in accordance with their own privacy policies.
            </p>
          </div>

          {/* 5. How to Manage Cookies */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">5. How to Manage Cookies</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              You can manage or disable cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of our website.
            </p>
            <p className="text-xs text-muted-foreground mb-1.5">
              For personalized advertising preferences, you may visit:{" "}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://adssettings.google.com</a>
            </p>
            <p className="text-xs text-muted-foreground">
              Mobile users can reset or limit advertising identifiers through their device settings.
            </p>
          </div>

          {/* 6. Consent */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">6. Consent</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              Where required by law (including in the European Economic Area and the United Kingdom), we will request your consent before placing non-essential cookies on your device.
            </p>
            <p className="text-xs text-muted-foreground">
              You may withdraw your consent at any time by adjusting your cookie preferences or browser settings.
            </p>
          </div>

          {/* 7. Changes */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">7. Changes to This Cookie Policy</h3>
            <p className="text-xs text-muted-foreground">
              We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated effective date.
            </p>
          </div>

          {/* 8. Contact */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">8. Contact Us</h3>
            <p className="text-xs text-muted-foreground mb-1">If you have questions about this Cookie Policy, please contact us at:</p>
            <p className="text-xs text-muted-foreground">
              Email:{" "}
              <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">propredictsupp@gmail.com</a>
            </p>
            <p className="text-xs text-muted-foreground">
              Website:{" "}
              <a href="https://propredict.me" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://propredict.me</a>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default CookiePolicy;
