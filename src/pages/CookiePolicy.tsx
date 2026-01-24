import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CookiePolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container px-4 py-4 flex-1">
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
              <p className="text-xs text-muted-foreground mb-2">
                We use third-party services that may place cookies or similar technologies on your device.
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                <strong className="text-foreground">Google AdSense</strong> is used on our website to display advertisements. Google may use
                cookies or device identifiers to serve personalized or non-personalized ads based on your browsing
                behavior.
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                <strong className="text-foreground">Google AdMob</strong> is used in our mobile application to display advertisements. AdMob may
                collect device identifiers and usage data to provide relevant ads.
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                <strong className="text-foreground">Google Analytics / Firebase</strong> may be used to analyze usage patterns and improve
                performance and stability.
              </p>
              <p className="text-xs text-muted-foreground mb-1">
                Learn more about how Google uses data from sites that use its services:
              </p>
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                https://policies.google.com/technologies/ads
              </a>
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
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;
