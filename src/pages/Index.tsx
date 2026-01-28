import { FeaturedPredictions } from "@/components/dashboard/FeaturedPredictions";
import { MatchPredictions } from "@/components/dashboard/MatchPredictions";
import { BettingTickets } from "@/components/dashboard/BettingTickets";
import { BottomCTA } from "@/components/dashboard/BottomCTA";
import { GuestBanner } from "@/components/GuestBanner";
import { SidebarAd } from "@/components/ads/AdSenseBanner";

const Index = () => {
  return (
    <div className="space-y-6">
      <GuestBanner />
      <FeaturedPredictions />
      <SidebarAd className="my-4" />
      <MatchPredictions />
      <BettingTickets />
      <SidebarAd className="my-4" />
      <BottomCTA />
    </div>
  );
};

export default Index;
