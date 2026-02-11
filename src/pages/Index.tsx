import { useEffect, useRef } from "react";
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

const Index = () => {
  const { maybeShowInterstitial } = useAndroidInterstitial();
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
        
        {/* Welcome Header Section */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-xl p-6 text-center shadow-lg shadow-primary/10">
          <h2 className="text-xl font-bold text-foreground mb-3">Welcome to ProPredict</h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ProPredict is a sports analysis platform designed for users who want deeper insights into football matches. Here you can explore match previews, expert analysis, AI-assisted predictions, and track results in one place. Our goal is to provide clear, structured, and informative content to help you better understand upcoming matches and past performance.
          </p>
        </div>

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
