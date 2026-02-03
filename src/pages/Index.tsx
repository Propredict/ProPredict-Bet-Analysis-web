import { Helmet } from "react-helmet-async";
import { FeaturedPredictions } from "@/components/dashboard/FeaturedPredictions";
import { MatchPredictions } from "@/components/dashboard/MatchPredictions";
import { BettingTickets } from "@/components/dashboard/BettingTickets";
import { LeagueStandings } from "@/components/dashboard/LeagueStandings";
import { TodaysMatches } from "@/components/dashboard/TodaysMatches";
import { DashboardAIPredictions } from "@/components/dashboard/DashboardAIPredictions";
import { BottomCTA } from "@/components/dashboard/BottomCTA";
import { GuestBanner } from "@/components/GuestBanner";
import { GuestSignInModal } from "@/components/GuestSignInModal";
import { SidebarAd } from "@/components/ads/EzoicAd";

const Index = () => {
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
        <FeaturedPredictions />
        <SidebarAd />
        <MatchPredictions />
        <BettingTickets />
        
        {/* Two-column layout for Standings and Live Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeagueStandings />
          <TodaysMatches />
        </div>
        
        {/* Welcome Header Section */}
        <div className="text-center py-8 px-4">
          <h2 className="text-2xl font-bold text-foreground mb-3">Welcome to ProPredict</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ProPredict is a football analysis platform created for fans who want deeper insights into matches, teams, and performance trends. Here you can explore daily match analysis, AI-assisted predictions, and track match results — all in one place.
          </p>
        </div>

        {/* AI Predictions Section */}
        <DashboardAIPredictions />
        
        <SidebarAd />
        <BottomCTA />
      </div>
      <GuestSignInModal />
    </>
  );
};

export default Index;
