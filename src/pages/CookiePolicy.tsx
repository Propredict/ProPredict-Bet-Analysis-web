import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CookiePolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container px-4 py-8 flex-1">
        <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate("/settings")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Settings
        </Button>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 10, 2026</p>

          <div className="space-y-8">
            {/* What are cookies */}
            <Card>
              <CardHeader>
                <CardTitle>What Are Cookies?</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Cookies are small text files stored on your device when you visit a website. They are widely used to
                  make websites work efficiently, improve performance, and enhance user experience.
                </p>
              </CardContent>
            </Card>

            {/* How we use cookies */}
            <Card>
              <CardHeader>
                <CardTitle>How We Use Cookies</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>To ensure basic website functionality</li>
                  <li>To analyze traffic and improve performance</li>
                  <li>To display advertisements</li>
                  <li>To enhance user experience</li>
                </ul>
              </CardContent>
            </Card>

            {/* Third-party cookies */}
            <Card>
              <CardHeader>
                <CardTitle>Third-Party Cookies</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none space-y-4">
                <p className="text-muted-foreground">
                  We use third-party services that may place cookies or similar technologies on your device.
                </p>

                <p className="text-muted-foreground">
                  <strong>Google AdSense</strong> is used on our website to display advertisements. Google may use
                  cookies or device identifiers to serve personalized or non-personalized ads based on your browsing
                  behavior.
                </p>

                <p className="text-muted-foreground">
                  <strong>Google AdMob</strong> is used in our mobile application to display advertisements. AdMob may
                  collect device identifiers and usage data to provide relevant ads.
                </p>

                <p className="text-muted-foreground">
                  <strong>Google Analytics / Firebase</strong> may be used to analyze usage patterns and improve
                  performance and stability.
                </p>

                <p className="text-muted-foreground">
                  Learn more about how Google uses data from sites that use its services:
                </p>

                <a
                  href="https://policies.google.com/technologies/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://policies.google.com/technologies/ads
                </a>
              </CardContent>
            </Card>

            {/* User choices */}
            <Card>
              <CardHeader>
                <CardTitle>Your Choices</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  You can control or disable cookies through your browser settings. Please note that disabling cookies
                  may affect the functionality and performance of the website.
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
