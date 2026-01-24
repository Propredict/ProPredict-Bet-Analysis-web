import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Scale, Ban, Users, Mail } from "lucide-react";

const Disclaimer = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <h1 className="text-4xl font-bold">Disclaimer</h1>
          </div>
          <p className="text-muted-foreground mb-8">Last updated: January 10, 2026</p>

          <div className="space-y-6">
            {/* Important Warning Banner */}
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <Ban className="w-8 h-8 text-amber-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg text-amber-500 mb-2">⚠️ Important Notice</h3>
                    <p className="text-foreground font-medium text-lg">
                      ProPredict does NOT accept bets, process payments, or provide cash rewards.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Disclaimer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  General Disclaimer
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  ProPredict is a sports analysis and match prediction application created for
                  <strong className="text-foreground"> informational and entertainment purposes only</strong>.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  The app does not support, facilitate, or promote real-money gambling or betting of any kind. All
                  predictions, statistics, and insights provided in this app are based on analysis and historical data
                  and <strong className="text-foreground">do not guarantee outcomes</strong>.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Users are solely responsible for any decisions they make based on the information provided by this
                  app. ProPredict shall not be held liable for any losses or damages resulting from the use of the app.
                </p>
              </CardContent>
            </Card>

            {/* Age Restriction */}
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <Users className="w-5 h-5" />
                  Age Restriction (18+)
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  This app is intended <strong className="text-red-400">only for users aged 18 years or older</strong>.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  By using this app, you confirm that you meet the minimum age requirement and that you comply with all
                  local laws and regulations related to sports predictions and betting content in your country.
                </p>
                <p className="text-muted-foreground leading-relaxed font-medium">
                  If you are under 18 years of age, please do not use this app.
                </p>
              </CardContent>
            </Card>

            {/* Legal Compliance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  Legal Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Users must ensure that their use of this app complies with all applicable local, national, and
                  international laws and regulations.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  ProPredict makes no representations regarding the legality of accessing or using this app in any
                  particular jurisdiction. It is your responsibility to determine whether your access and use of this
                  app is lawful.
                </p>
              </CardContent>
            </Card>

            {/* No Gambling */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="w-5 h-5 text-primary" />
                  No Gambling Services
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground leading-relaxed mb-4">To be absolutely clear, ProPredict:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Does NOT accept or process any bets</li>
                  <li>Does NOT facilitate real-money gambling</li>
                  <li>Does NOT process payments for betting purposes</li>
                  <li>Does NOT provide cash rewards or payouts</li>
                  <li>Does NOT partner with gambling operators for bet placement</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  All content is purely informational and for entertainment purposes.
                </p>
              </CardContent>
            </Card>

            {/* Acceptance */}
            <Card className="bg-muted/30">
              <CardContent className="py-6">
                <p className="text-muted-foreground text-center leading-relaxed">
                  <strong className="text-foreground">
                    By using ProPredict, you acknowledge that you have read, understood, and agree to this disclaimer.
                  </strong>
                  <br />
                  <span className="text-sm">
                    If you do not agree with this disclaimer, please discontinue use of the app immediately.
                  </span>
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Contact Us
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-muted-foreground">
                  If you have any questions about this disclaimer, please contact us:
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
                <div className="mt-6 flex flex-wrap gap-4">
                  <Link to="/privacy">
                    <Button variant="outline" className="gap-2">
                      <Shield className="w-4 h-4" />
                      Privacy Policy
                    </Button>
                  </Link>
                  <Link to="/terms">
                    <Button variant="outline" className="gap-2">
                      <Scale className="w-4 h-4" />
                      Terms of Service
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

export default Disclaimer;
