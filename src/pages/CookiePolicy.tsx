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

      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold mb-1">Cookie Policy</h1>
        <p className="text-xs text-muted-foreground mb-4">Last updated: January 10, 2026</p>

        <div className="space-y-3">
          {/* What are cookies */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">What Are Cookies?</h3>
            <p className="text-xs text-muted-foreground">
              Cookies are small text files stored on your device when you visit a website. They are widely used to
              make websites work efficiently, improve performance, and enhance user experience.
            </p>
          </div>

          {/* How we use cookies */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">How We Use Cookies</h3>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              <li>To ensure basic website functionality</li>
              <li>To analyze traffic and improve performance</li>
              <li>To display advertisements</li>
              <li>To enhance user experience</li>
            </ul>
          </div>

          {/* Third-party cookies */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">Third-Party Cookies</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              We use third-party services that may place cookies or similar technologies on your device.
            </p>
            <p className="text-xs text-muted-foreground mb-1.5">
              These services are used for advertising, analytics, and performance optimization on the website and mobile application.
            </p>
            <p className="text-xs text-muted-foreground">
              Advertising partners may use cookies or device identifiers to provide relevant ads based on your preferences and consent.
            </p>
          </div>

          {/* User choices */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">Your Choices</h3>
            <p className="text-xs text-muted-foreground">
              You can control or disable cookies through your browser settings. Please note that disabling cookies
              may affect the functionality and performance of the website.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default CookiePolicy;
