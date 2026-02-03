import { useState, Fragment } from "react";
import { Helmet } from "react-helmet-async";
import { Ticket, Lightbulb, Calendar, Star, Crown, RefreshCw, Loader2, Trophy, History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTickets, type TicketWithMatches } from "@/hooks/useTickets";
import { useTips } from "@/hooks/useTips";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { PricingModal } from "@/components/PricingModal";
import { SidebarAd, InlineListAd } from "@/components/ads/EzoicAd";
import { toast } from "sonner";
import { AllTicketsCard } from "@/components/all-tickets/AllTicketsCard";
import { AllTicketsStatCard } from "@/components/all-tickets/AllTicketsStatCard";
import { format, parseISO, isAfter, subDays } from "date-fns";

type ContentType = "tips" | "tickets";
type TabType = "daily" | "exclusive" | "premium";

export default function AllTickets() {
  const [contentType, setContentType] = useState<ContentType>("tips");
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium" | undefined>();

  const { tickets, isLoading: ticketsLoading, refetch: refetchTickets } = useTickets(false);
  const { tips, isLoading: tipsLoading, refetch: refetchTips } = useTips(false);
  const { canAccess, getUnlockMethod, refetch: refetchPlan } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler({
    onUpgradeBasic: () => {
      setHighlightPlan("basic");
      setShowPricingModal(true);
    },
    onUpgradePremium: () => {
      setHighlightPlan("premium");
      setShowPricingModal(true);
    }
  });

  const isLoading = contentType === "tips" ? tipsLoading : ticketsLoading;

  const handleRefresh = () => {
    if (contentType === "tips") {
      refetchTips();
    } else {
      refetchTickets();
    }
    refetchPlan();
    toast.success(`${contentType === "tips" ? "Tips" : "Tickets"} refreshed`);
  };

  // Filter to exclude today and sort by date descending (last 3 days first)
  const filterAndSort = <T extends { tip_date?: string | null; ticket_date?: string | null }>(items: T[]): T[] => {
    const today = format(new Date(), "yyyy-MM-dd");
    const threeDaysAgo = subDays(new Date(), 4); // 4 days ago to include last 3 days before today
    
    // Filter out today's items
    const filtered = items.filter(item => {
      const itemDate = item.tip_date || item.ticket_date;
      if (!itemDate) return true;
      return itemDate !== today;
    });
    
    return filtered.sort((a, b) => {
      const dateA = a.tip_date || a.ticket_date;
      const dateB = b.tip_date || b.ticket_date;
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      const parsedA = parseISO(dateA);
      const parsedB = parseISO(dateB);
      
      // Recent items (last 3 days, excluding today) come first
      const aIsRecent = isAfter(parsedA, threeDaysAgo);
      const bIsRecent = isAfter(parsedB, threeDaysAgo);
      
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
      
      // Within same category, sort by date descending
      return parsedB.getTime() - parsedA.getTime();
    });
  };

  // Filter out today's content first
  const today = format(new Date(), "yyyy-MM-dd");
  const archivedTips = tips.filter(t => t.tip_date !== today);
  const archivedTickets = tickets.filter(t => t.ticket_date !== today);

  // Tips stats (excluding today)
  const dailyTipsCount = archivedTips.filter(t => t.tier === "daily").length;
  const exclusiveTipsCount = archivedTips.filter(t => t.tier === "exclusive").length;
  const premiumTipsCount = archivedTips.filter(t => t.tier === "premium").length;
  const totalTipsCount = archivedTips.length;
  const wonTipsCount = archivedTips.filter(t => t.result === "won").length;

  // Tickets stats (excluding today)
  const dailyTicketsCount = archivedTickets.filter(t => t.tier === "daily").length;
  const exclusiveTicketsCount = archivedTickets.filter(t => t.tier === "exclusive").length;
  const premiumTicketsCount = archivedTickets.filter(t => t.tier === "premium").length;
  const totalTicketsCount = archivedTickets.length;
  const wonTicketsCount = archivedTickets.filter(t => t.result === "won").length;

  // Get filtered and sorted content (already excludes today via archivedTips/archivedTickets)
  const filteredTips = filterAndSort(archivedTips.filter(tip => tip.tier === activeTab));
  const filteredTickets = filterAndSort(archivedTickets.filter(ticket => ticket.tier === activeTab));

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case "daily": return "Daily";
      case "exclusive": return "Pro";
      case "premium": return "Premium";
    }
  };

  const tipsTabs = [
    { id: "daily" as TabType, label: "Daily", icon: Calendar, count: dailyTipsCount },
    { id: "exclusive" as TabType, label: "Pro", icon: Star, count: exclusiveTipsCount },
    { id: "premium" as TabType, label: "Premium", icon: Crown, count: premiumTipsCount }
  ];

  const ticketsTabs = [
    { id: "daily" as TabType, label: "Daily", icon: Calendar, count: dailyTicketsCount },
    { id: "exclusive" as TabType, label: "Pro", icon: Star, count: exclusiveTicketsCount },
    { id: "premium" as TabType, label: "Premium", icon: Crown, count: premiumTicketsCount }
  ];

  const currentTabs = contentType === "tips" ? tipsTabs : ticketsTabs;

  const getTabStyles = (tabId: string, isActive: boolean) => {
    const baseStyles = "relative py-3 px-3 rounded-xl text-xs font-semibold transition-all duration-300 border-2 shadow-md";
    return isActive 
      ? cn(baseStyles, "bg-primary/20 border-primary/60 text-primary shadow-primary/25")
      : cn(baseStyles, "bg-primary/5 border-primary/20 text-primary/70 hover:border-primary/40 hover:text-primary");
  };

  return (
    <>
      <Helmet>
        <title>Winning Tips History – ProPredict Archive</title>
        <meta
          name="description"
          content="Browse our complete archive of football betting tips and prediction tickets. Track winning history, analyze past performance, and discover successful betting patterns."
        />
        <meta name="keywords" content="football tips history, betting tips archive, winning predictions, football betting history, sports predictions archive" />
        <link rel="canonical" href="https://propredictbet.lovable.app/all-tickets" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Winning Tips History – ProPredict Archive" />
        <meta property="og:description" content="Browse our complete archive of football betting tips and prediction tickets. Track winning history and analyze past performance." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://propredictbet.lovable.app/all-tickets" />
        
        {/* JSON-LD Breadcrumb */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://propredictbet.lovable.app/" },
              { "@type": "ListItem", "position": 2, "name": "Winning Tips History", "item": "https://propredictbet.lovable.app/all-tickets" }
            ]
          })}
        </script>
      </Helmet>

      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/20">
              <History className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-semibold text-foreground">Winning Tips History</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Browse our archive of tips & tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[9px] sm:text-[10px] px-2 py-0.5 bg-primary/10 border-primary/30 text-primary">
              <Trophy className="h-3 w-3 mr-1" />
              {contentType === "tips" ? wonTipsCount : wonTicketsCount} won
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh} 
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content Type Tabs - Tips vs Tickets */}
        <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-card border border-border">
            <TabsTrigger 
              value="tips" 
              className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              <Lightbulb className="h-4 w-4" />
              <span className="font-medium">Tips</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{totalTipsCount}</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="tickets" 
              className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              <Ticket className="h-4 w-4" />
              <span className="font-medium">Tickets</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{totalTicketsCount}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2">
          {contentType === "tips" ? (
            <>
              <AllTicketsStatCard icon={Calendar} count={dailyTipsCount} label="Daily" accentColor="accent" />
              <AllTicketsStatCard icon={Star} count={exclusiveTipsCount} label="Pro" accentColor="primary" />
              <AllTicketsStatCard icon={Crown} count={premiumTipsCount} label="Premium" accentColor="warning" />
            </>
          ) : (
            <>
              <AllTicketsStatCard icon={Calendar} count={dailyTicketsCount} label="Daily" accentColor="accent" />
              <AllTicketsStatCard icon={Star} count={exclusiveTicketsCount} label="Pro" accentColor="primary" />
              <AllTicketsStatCard icon={Crown} count={premiumTicketsCount} label="Premium" accentColor="warning" />
            </>
          )}
        </div>

        {/* Tier Tabs */}
        <div className="grid grid-cols-3 gap-2">
          {currentTabs.map(tab => {
            const isActive = activeTab === tab.id;
            
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={getTabStyles(tab.id, isActive)}
              >
                <div className="flex flex-col items-center gap-1">
                  <tab.icon className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isActive && "scale-110 drop-shadow-lg"
                  )} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full",
                      isActive ? "bg-background/20" : "bg-muted/50"
                    )}>
                      {tab.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Ad Banner */}
        <SidebarAd />

        {/* Content Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : contentType === "tips" ? (
          /* Tips Content */
          filteredTips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTips.map((tip, index) => {
              const showAdAfter = activeTab !== "premium" && (index + 1) % 3 === 0 && index < filteredTips.length - 1;
              
              return (
                <Fragment key={tip.id}>
                  <Card className="p-4 bg-card border-border hover:border-primary/30 transition-colors border-l-4 border-l-primary flex flex-col gap-2">
                    {/* Header: League & Date */}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 border-muted-foreground/30">
                        {tip.league}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {tip.tip_date && (
                          <span className="text-[9px] text-muted-foreground">
                            {format(parseISO(tip.tip_date), "dd MMM")}
                          </span>
                        )}
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[9px] px-1.5 py-0.5",
                            tip.result === "won" && "bg-green-500/20 border-green-500/40 text-green-400",
                            tip.result === "lost" && "bg-red-500/20 border-red-500/40 text-red-400",
                            tip.result === "pending" && "bg-muted/50 border-muted-foreground/30 text-muted-foreground"
                          )}
                        >
                          {tip.result}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Match */}
                    <p className="text-sm font-medium text-foreground">
                      {tip.home_team} vs {tip.away_team}
                    </p>
                    
                    {/* Prediction & Odds */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Tip:</span>
                        <span className="text-xs font-semibold text-primary">{tip.prediction}</span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">@{tip.odds}</span>
                    </div>
                  </Card>
                  {showAdAfter && <InlineListAd />}
                </Fragment>
              );
            })}
          </div>
        ) : (
          <Card className="empty-state-compact bg-card/50 border-border/50">
            <div className="flex flex-col items-center gap-2 py-6">
              <Lightbulb className="h-6 w-6 text-muted-foreground/40" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">No {getTabLabel(activeTab).toLowerCase()} tips in archive</p>
                <p className="text-[10px] text-muted-foreground/70">Check back soon!</p>
              </div>
            </div>
          </Card>
        )
      ) : (
        /* Tickets Content - All archived tickets are unlocked */
        filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTickets.map((ticket, index) => {
              const showAdAfter = activeTab !== "premium" && (index + 1) % 3 === 0 && index < filteredTickets.length - 1;
              
              return (
                <Fragment key={ticket.id}>
                  <AllTicketsCard 
                    ticket={ticket} 
                    isLocked={false}
                    unlockMethod={{ type: "unlocked" }}
                    onUnlockClick={() => {}} 
                    isUnlocking={false} 
                  />
                  {showAdAfter && <InlineListAd />}
                </Fragment>
              );
            })}
            </div>
          ) : (
            <Card className="empty-state-compact bg-card/50 border-border/50">
              <div className="flex flex-col items-center gap-2 py-6">
                <Ticket className="h-6 w-6 text-muted-foreground/40" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">No {getTabLabel(activeTab).toLowerCase()} tickets in archive</p>
                  <p className="text-[10px] text-muted-foreground/70">Check back soon!</p>
                </div>
              </div>
            </Card>
          )
        )}

        {/* Bottom Ad */}
        <SidebarAd className="mt-4" />

        <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
      </div>
    </>
  );
}
