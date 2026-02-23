import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FeaturedPredictions } from "@/components/dashboard/FeaturedPredictions";
import { MatchPredictions } from "@/components/dashboard/MatchPredictions";
import { BettingTickets } from "@/components/dashboard/BettingTickets";
import { LeagueStandings } from "@/components/dashboard/LeagueStandings";
import { TodaysMatches } from "@/components/dashboard/TodaysMatches";
import { DashboardAIPredictions } from "@/components/dashboard/DashboardAIPredictions";
import { DashboardSocialProof } from "@/components/dashboard/DashboardSocialProof";
import { BottomCTA } from "@/components/dashboard/BottomCTA";
import { GuestBanner } from "@/components/GuestBanner";
import { GuestSignInModal } from "@/components/GuestSignInModal";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
import { getIsAndroidApp } from "@/hooks/usePlatform";

const Index = () => {
  const { maybeShowInterstitial } = useAndroidInterstitial();
  const isAndroid = getIsAndroidApp();
  const firedRef = useRef(false);

  // Android only: show one interstitial on Home (max 1 per app session)
  useEffect(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      maybeShowInterstitial("home");
    }
  }, [maybeShowInterstitial]);
  return (
    <>
      <Helmet>
        <title>ProPredict – AI Sports Analysis & Predictions</title>
        <meta
          name="description"
          content="AI-powered sports predictions, match analysis, and statistics for entertainment and informational purposes only."
        />
      </Helmet>
      <div className="space-y-6">
        <GuestBanner />
        
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-xl p-6 md:p-8 text-center shadow-lg shadow-primary/10">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">Welcome to ProPredict</h1>
          <p className="text-xs md:text-sm font-medium text-primary mb-3">AI-Powered Sports Analytics & Match Intelligence</p>
          <p className="text-[11px] md:text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-2">
            ProPredict is a data-driven sports analysis platform built for users who want deeper, structured insights into football matches. Using advanced statistical modeling and machine learning techniques, we transform raw match data into clear probability forecasts and analytical insights.
          </p>
          <p className="text-[11px] md:text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Explore AI-generated match previews, performance trends, and structured statistical breakdowns — all designed to help you better understand upcoming matches and historical outcomes.
          </p>
        </div>

        {/* What We Do – Web only */}
        {!isAndroid && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">🔹 AI Match Analysis</h3>
              <p className="text-[11px] text-muted-foreground">We apply machine learning algorithms to evaluate match performance metrics and generate structured probability insights.</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">🔹 Statistical Forecasting</h3>
              <p className="text-[11px] text-muted-foreground">Our models use historical data and regression techniques to estimate potential match outcomes based on measurable indicators.</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">🔹 Performance Trend Tracking</h3>
              <p className="text-[11px] text-muted-foreground">Users can review team trends, recent form patterns, and long-term performance indicators.</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">🔹 Data Transparency</h3>
              <p className="text-[11px] text-muted-foreground">We provide analytical insights based on measurable statistics — not subjective advice.</p>
            </div>
          </div>
        )}

        {/* SEO About Section – Web only */}
        {!isAndroid && (
          <section className="bg-card border border-border rounded-xl p-5 md:p-6">
            <h2 className="text-sm md:text-base font-bold text-foreground mb-3">About ProPredict – Advanced AI Sports Analysis</h2>
            <div className="space-y-2 text-[11px] md:text-xs text-muted-foreground leading-relaxed">
              <p>
                ProPredict is an AI-powered sports analytics platform focused on football data analysis and predictive modeling. Our system combines historical match statistics, performance indicators, team metrics, and machine learning algorithms to generate structured probability-based insights.
              </p>
              <p>
                Unlike traditional platforms, ProPredict does not provide gambling services or financial advice. Instead, our goal is to offer transparent, data-driven analysis that helps users understand patterns, trends, and performance indicators in football matches.
              </p>
              <p>Our AI models analyze multiple data points including:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-2">
                <li>Team form and historical performance</li>
                <li>Offensive and defensive efficiency metrics</li>
                <li>Head-to-head statistics</li>
                <li>Goal expectancy indicators</li>
                <li>Possession and shot conversion trends</li>
                <li>Contextual match variables</li>
              </ul>
              <p>
                Using statistical regression models and probability estimation methods, the platform generates structured match insights. These insights are designed for informational and educational purposes only.
              </p>
              <p>
                ProPredict does not guarantee outcomes or results. Football matches are influenced by many unpredictable factors, and statistical analysis can only estimate probabilities — not certainties. Our platform emphasizes analytical transparency and data interpretation rather than subjective advice.
              </p>
              <p>Users can explore:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-2">
                <li>Probability-based outcome forecasts</li>
                <li>Structured performance comparisons</li>
                <li>Historical trend analysis</li>
                <li>Analytical match summaries</li>
                <li>AI-generated statistical breakdowns</li>
              </ul>
              <p>
                By focusing on data science rather than speculation, ProPredict provides a modern analytical approach to understanding football performance metrics. Our mission is to make sports analytics accessible, structured, and easy to interpret — empowering users with knowledge rather than promises.
              </p>
            </div>
          </section>
        )}

        {/* Social Proof Section */}
        <DashboardSocialProof />

        <FeaturedPredictions />
        <MatchPredictions />
        <BettingTickets />
        
        {/* Two-column layout for Standings and Live Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeagueStandings />
          <TodaysMatches />
        </div>
        
        {/* AI Predictions Section */}
        <DashboardAIPredictions />
        
        <BottomCTA />

        {/* SEO internal link */}
        <p className="text-xs text-muted-foreground text-center mt-2">
          👉 Learn more about how our AI prediction model works →{" "}
          <Link to="/how-ai-works" className="text-primary hover:underline font-medium">
            How AI Works
          </Link>
        </p>

        {/* Compliance Disclaimer */}
        <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-4">
          Disclaimer: ProPredict does not provide betting or gambling services. All AI-generated predictions are for informational and entertainment purposes only.
        </p>
      </div>
      <GuestSignInModal />
    </>
  );
};

export default Index;
