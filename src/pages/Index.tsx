import { DashboardLayout } from "@/components/DashboardLayout";
import { FeaturedPredictions } from "@/components/dashboard/FeaturedPredictions";
import { MatchPredictions } from "@/components/dashboard/MatchPredictions";
import { BettingTickets } from "@/components/dashboard/BettingTickets";
import { BottomCTA } from "@/components/dashboard/BottomCTA";
import { MobileAppBanner } from "@/components/dashboard/MobileAppBanner";
import { GuestBanner } from "@/components/GuestBanner";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto section-gap">
        <GuestBanner />
        <FeaturedPredictions />
        <MatchPredictions />
        <BettingTickets />
        <BottomCTA />
        <MobileAppBanner />
      </div>
    </DashboardLayout>
  );
};

export default Index;
