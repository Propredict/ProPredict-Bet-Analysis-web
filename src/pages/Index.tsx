import { Helmet } from "react-helmet-async";
import { FeaturedPredictions } from "@/components/dashboard/FeaturedPredictions";
import { MatchPredictions } from "@/components/dashboard/MatchPredictions";
import { BettingTickets } from "@/components/dashboard/BettingTickets";
import { BottomCTA } from "@/components/dashboard/BottomCTA";
import { GuestBanner } from "@/components/GuestBanner";
import { GuestSignInModal } from "@/components/GuestSignInModal";
import { SidebarAd } from "@/components/ads/AdSenseBanner";

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
        <SidebarAd />
        <BottomCTA />
      </div>
      <GuestSignInModal />
    </>
  );
};

export default Index;
