import { FeaturedPredictions } from "@/components/dashboard/FeaturedPredictions";
import { MatchPredictions } from "@/components/dashboard/MatchPredictions";
import { BettingTickets } from "@/components/dashboard/BettingTickets";
import { BottomCTA } from "@/components/dashboard/BottomCTA";
import { GuestBanner } from "@/components/GuestBanner";

const Index = () => {
  return (
    <div className="section-gap">
      <GuestBanner />
      <FeaturedPredictions />
      <MatchPredictions />
      <BettingTickets />
      <BottomCTA />
    </div>
  );
};

export default Index;
