import { DashboardLayout } from "@/components/DashboardLayout";
import { FeaturedPredictions } from "@/components/dashboard/FeaturedPredictions";
import { MatchPredictions } from "@/components/dashboard/MatchPredictions";
import { BettingTickets } from "@/components/dashboard/BettingTickets";
import { BottomCTA } from "@/components/dashboard/BottomCTA";
import { MobileAppBanner } from "@/components/dashboard/MobileAppBanner";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
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
