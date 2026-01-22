import { useState } from "react";
import { TrendingUp, Sparkles, Star, Crown, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TabType = "daily" | "exclusive" | "premium";

export function MatchPredictions() {
  const [activeTab, setActiveTab] = useState<TabType>("daily");

  const tabs = [
    { id: "daily" as TabType, label: "Daily", count: 0, icon: Sparkles, sublabel: "Free with Ads" },
    { id: "exclusive" as TabType, label: "Exclusive", count: 0, icon: Star, sublabel: "Higher Confidence" },
    { id: "premium" as TabType, label: "Premium", count: 0, icon: Crown, sublabel: "Members Only" },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Match Predictions</h2>
      </div>

      <Card className="p-1 bg-card border-border">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => (
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
                  {tab.count}
                </span>
              </div>
              <span className="text-xs opacity-80">{tab.sublabel}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Users unlocked banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg py-2 px-4 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-primary">
          <Users className="h-4 w-4" />
          <span>210 users unlocked daily tips today</span>
        </div>
      </div>

      {/* Empty state */}
      <Card className="p-8 bg-card border-border text-center">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="h-12 w-12 text-primary opacity-50" />
          <div>
            <p className="text-muted-foreground">No daily predictions available</p>
            <p className="text-sm text-muted-foreground">Check back soon for new picks!</p>
          </div>
        </div>
      </Card>
    </section>
  );
}
