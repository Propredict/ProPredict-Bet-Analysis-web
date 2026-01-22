import { useState } from "react";
import { TrendingUp, Sparkles, Star, Crown, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { TipCard, type Tip } from "./TipCard";
import { PricingModal } from "@/components/PricingModal";
import { toast } from "sonner";

type TabType = "daily" | "exclusive" | "premium";

// Sample tips data
const sampleTips: Tip[] = [
  {
    id: "1",
    homeTeam: "Liverpool",
    awayTeam: "Manchester City",
    league: "Premier League",
    prediction: "Over 2.5 Goals",
    odds: 1.85,
    confidence: 78,
    kickoff: "Today, 20:00",
    tier: "daily",
  },
  {
    id: "2",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    league: "La Liga",
    prediction: "Both Teams Score",
    odds: 1.72,
    confidence: 82,
    kickoff: "Today, 21:00",
    tier: "daily",
  },
  {
    id: "3",
    homeTeam: "Bayern Munich",
    awayTeam: "Dortmund",
    league: "Bundesliga",
    prediction: "Home Win",
    odds: 1.65,
    confidence: 85,
    kickoff: "Tomorrow, 18:30",
    tier: "exclusive",
  },
  {
    id: "4",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    league: "Ligue 1",
    prediction: "Over 3.5 Goals",
    odds: 2.10,
    confidence: 71,
    kickoff: "Tomorrow, 21:00",
    tier: "exclusive",
  },
  {
    id: "5",
    homeTeam: "Inter Milan",
    awayTeam: "AC Milan",
    league: "Serie A",
    prediction: "Draw",
    odds: 3.40,
    confidence: 68,
    kickoff: "Saturday, 20:45",
    tier: "premium",
  },
  {
    id: "6",
    homeTeam: "Chelsea",
    awayTeam: "Arsenal",
    league: "Premier League",
    prediction: "Away Win & Over 1.5",
    odds: 2.85,
    confidence: 74,
    kickoff: "Sunday, 16:30",
    tier: "premium",
  },
];

export function MatchPredictions() {
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium" | undefined>();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const { plan, canAccess, getUnlockMethod, unlockContent } = useUserPlan();

  const tabs = [
    { id: "daily" as TabType, label: "Daily", icon: Sparkles, sublabel: "Free with Ads" },
    { id: "exclusive" as TabType, label: "Exclusive", icon: Star, sublabel: "Basic+ Members" },
    { id: "premium" as TabType, label: "Premium", icon: Crown, sublabel: "Premium Only" },
  ];

  const filteredTips = sampleTips.filter((tip) => tip.tier === activeTab);

  const handleUnlockClick = async (tip: Tip) => {
    const method = getUnlockMethod(tip.tier, "tip", tip.id);
    if (!method || method.type === "unlocked") return;

    if (method.type === "watch_ad") {
      setUnlockingId(tip.id);
      
      // Simulate ad playback delay
      toast.info("Playing rewarded ad...", { duration: 2000 });
      
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const success = await unlockContent("tip", tip.id);
      
      if (success) {
        toast.success("Tip unlocked! Valid until midnight UTC.");
      } else {
        toast.error("Failed to unlock. Please try again.");
      }
      
      setUnlockingId(null);
    } else if (method.type === "upgrade_basic") {
      setHighlightPlan("basic");
      setShowPricingModal(true);
    } else if (method.type === "upgrade_premium") {
      setHighlightPlan("premium");
      setShowPricingModal(true);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Match Predictions</h2>
      </div>

      <Card className="p-1 bg-card border-border">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const tipCount = sampleTips.filter((t) => t.tier === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 px-4 rounded-lg transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted"
                  )}>
                    {tipCount}
                  </span>
                </div>
                <span className="text-xs opacity-80">{tab.sublabel}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Users unlocked banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg py-2 px-4 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-primary">
          <Users className="h-4 w-4" />
          <span>210 users unlocked daily tips today</span>
        </div>
      </div>

      {/* Tips List */}
      {filteredTips.length > 0 ? (
        <div className="space-y-3">
          {filteredTips.map((tip) => {
            const isLocked = !canAccess(tip.tier, "tip", tip.id);
            const unlockMethod = getUnlockMethod(tip.tier, "tip", tip.id);
            const isUnlocking = unlockingId === tip.id;
            return (
              <TipCard
                key={tip.id}
                tip={tip}
                isLocked={isLocked}
                unlockMethod={unlockMethod}
                onUnlockClick={() => handleUnlockClick(tip)}
                isUnlocking={isUnlocking}
              />
            );
          })}
        </div>
      ) : (
        <Card className="p-8 bg-card border-border text-center">
          <div className="flex flex-col items-center gap-4">
            <Sparkles className="h-12 w-12 text-primary opacity-50" />
            <div>
              <p className="text-muted-foreground">No {activeTab} predictions available</p>
              <p className="text-sm text-muted-foreground">Check back soon for new picks!</p>
            </div>
          </div>
        </Card>
      )}

      <PricingModal 
        open={showPricingModal} 
        onOpenChange={setShowPricingModal}
        highlightPlan={highlightPlan}
      />
    </section>
  );
}