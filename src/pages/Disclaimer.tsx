import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";

const Disclaimer = () => {
  const navigate = useNavigate();
  
  return (
    <>
      <Helmet>
        <title>Disclaimer – AI Sports Predictions | ProPredict</title>
        <meta name="description" content="Important legal disclaimer for ProPredict. AI-powered sports analysis for informational and entertainment purposes only. 18+ age restriction applies." />
      </Helmet>
      <div className="section-gap">
      <Button
        variant="ghost"
        onClick={() => navigate("/settings")}
        className="mb-2 h-7 text-xs gap-1"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Settings
      </Button>
      
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h1 className="text-xl font-bold">Disclaimer</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Last updated: January 10, 2026</p>

        <div className="space-y-3">
          {/* Warning */}
          <div className="border border-amber-500/50 bg-amber-500/10 rounded-lg p-3">
            <h3 className="font-semibold text-sm text-amber-500 mb-1.5">🔔 Important Legal Notice</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              ProPredict does <strong className="text-foreground">NOT</strong> provide betting, gambling, wagering, or real-money gaming services.
            </p>
            <p className="text-xs text-muted-foreground">
              ProPredict does <strong className="text-foreground">NOT</strong> allow users to place bets, process wagers, or connect to bookmakers or betting operators.
            </p>
            <p className="text-xs text-muted-foreground">
              ProPredict is <strong className="text-foreground">not affiliated with, endorsed by, or connected to</strong> any sportsbook, bookmaker, gambling platform, or betting operator.
            </p>
          </div>

          {/* General */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">📊 General Disclaimer</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              ProPredict is a sports analysis application created for <strong className="text-foreground">informational and entertainment purposes only</strong>.
            </p>
            <p className="text-xs text-muted-foreground mb-1.5">
              All predictions, statistics, probabilities, and insights are generated using data analysis and historical information and do not guarantee outcomes.
            </p>
            <p className="text-xs text-muted-foreground mb-1.5">ProPredict does <strong className="text-foreground">NOT</strong> provide:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mb-1.5">
              <li>financial advice</li>
              <li>investment advice</li>
              <li>betting or gambling advice</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Use of the content is entirely at the user's own discretion and risk.
            </p>
          </div>

          {/* Responsibility */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">👤 User Responsibility</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              Users are solely responsible for any decisions they make based on the information provided by ProPredict.
            </p>
            <p className="text-xs text-muted-foreground">
              ProPredict shall not be held responsible for losses, damages, or consequences resulting from the use or interpretation of the content.
            </p>
          </div>

          {/* Age */}
          <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-3">
            <h3 className="font-semibold text-sm text-red-400 mb-1.5">🔞 Age Restriction (18+)</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              ProPredict is intended only for users aged 18 years or older.
            </p>
            <p className="text-xs text-muted-foreground">
              By using this service, you confirm that you meet the minimum age requirement.
            </p>
          </div>

          {/* Ads */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">📢 Advertisements</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              ProPredict may display advertisements on the website and in the mobile application through third-party advertising partners.
            </p>
            <p className="text-xs text-muted-foreground mb-1.5">
              Some features may require viewing advertisements to unlock content.
            </p>
            <p className="text-xs text-muted-foreground">
              Advertising partners may use cookies or device identifiers in accordance with their own privacy policies and applicable regulations.
            </p>
          </div>

          {/* Limitation */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">⚖️ Limitation of Liability</h3>
            <p className="text-xs text-muted-foreground mb-1.5">
              ProPredict is provided "as is" without warranties of any kind.
            </p>
            <p className="text-xs text-muted-foreground">
              ProPredict shall not be liable for any direct or indirect damages arising from the use of the service, including but not limited to financial loss, incorrect predictions, or reliance on provided content.
            </p>
          </div>

          {/* Contact */}
          <div className="border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1.5">📬 Contact</h3>
            <p className="text-xs text-muted-foreground mb-1.5">If you have questions regarding this disclaimer, please contact us at:</p>
            <p className="text-xs text-muted-foreground">
              Email:{" "}
              <a href="mailto:propredictsupp@gmail.com" className="text-primary hover:underline">
                propredictsupp@gmail.com
              </a>
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

export default Disclaimer;
