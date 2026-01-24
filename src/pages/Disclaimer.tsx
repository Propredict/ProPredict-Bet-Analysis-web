import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";

const Disclaimer = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container px-4 py-8 flex-1">
        <Button
          variant="ghost"
          onClick={() => navigate("/settings")}
          className="mb-3 h-7 text-xs gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Settings
        </Button>
        
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <h1 className="text-4xl font-bold">Disclaimer</h1>
          </div>

          <p className="text-muted-foreground mb-8">Last updated: January 10, 2026</p>

          <div className="space-y-6">
            {/* Warning */}
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="py-6">
                <h3 className="font-bold text-lg text-amber-500 mb-2">Important Legal Notice</h3>
                <p className="text-foreground font-medium">
                  ProPredict does NOT offer betting, gambling, wagering, or real-money gaming services.
                </p>
              </CardContent>
            </Card>

            {/* General */}
            <Card>
              <CardHeader>
                <CardTitle>General Disclaimer</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  ProPredict is a sports analysis application created for
                  <strong> informational and entertainment purposes only</strong>.
                </p>

                <p className="text-muted-foreground mt-4">
                  Predictions, statistics, and insights are based on analysis and historical data and do not guarantee
                  outcomes.
                </p>

                <p className="text-muted-foreground mt-4">
                  ProPredict does not provide financial, investment, or betting advice.
                </p>
              </CardContent>
            </Card>

            {/* Responsibility */}
            <Card>
              <CardHeader>
                <CardTitle>User Responsibility</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Users are solely responsible for any decisions they make based on the information provided by this
                  app.
                </p>
              </CardContent>
            </Card>

            {/* Age */}
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader>
                <CardTitle className="text-red-400">Age Restriction (18+)</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">This app is intended only for users aged 18 or older.</p>
              </CardContent>
            </Card>

            {/* Ads */}
            <Card>
              <CardHeader>
                <CardTitle>Advertisements</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  ProPredict displays advertisements through Google AdSense and other advertising partners.
                </p>

                <p className="text-muted-foreground mt-4">
                  These services may use cookies or device identifiers to display relevant ads in accordance with their
                  privacy policies.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">For questions regarding this disclaimer, contact us at:</p>
                <p className="mt-4">
                  <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">
                    propredictsupp@gmail.com
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

export default Disclaimer;
