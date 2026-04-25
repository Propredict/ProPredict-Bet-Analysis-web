import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Sparkles, Star, Crown, Loader2, ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useTickets } from "@/hooks/useTickets";
import { useTicketAccuracy } from "@/hooks/useTicketAccuracy";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { usePlatform } from "@/hooks/usePlatform";

import TicketCard, { type BettingTicket } from "./TicketCard";
import { PricingModal } from "@/components/PricingModal";

type TabType = "daily" | "exclusive" | "premium";

function mapDbTicket(db: any): BettingTicket {
  return {
    id: db.id,
    title: db.title,
    matchCount: db.matches?.length ?? 0,
    status: db.result ?? "pending",
    totalOdds: db.total_odds,
    tier: db.tier,
    matches: (db.matches ?? []).map((m: any) => ({
      name: m.match_name ?? "",
      prediction: m.prediction ?? "",
      odds: m.odds ?? 1,
    })),
  };
}

const TAB_ROUTES: Record<TabType, string> = {
  daily: "/daily-predictions",
  exclusive: "/pro-predictions",
  premium: "/premium-predictions"
};

export function BettingTickets() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium">();

  const { tickets: dbTickets = [], isLoading } = useTickets(false);
  const { data: accuracyData = [] } = useTicketAccuracy();
  const { isAndroidApp } = usePlatform();

  // Dashboard shows ONLY today's tickets — older ones go to history pages
  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const todayDbTickets = dbTickets.filter((t: any) => t.ticket_date === todayDate);
  const tickets = todayDbTickets.map(mapDbTicket);
  const filtered = tickets.filter((t) => t.tier === activeTab);
  const displayedTickets = filtered.slice(0, 3);
  const hasMoreTickets = filtered.length > 3;

  // Count only today's tickets per tier (todayDate already defined above)
  const todayTicketCountByTier = (tierId: string) =>
    todayDbTickets.filter((t: any) => t.tier === tierId).length;

  const accuracy = accuracyData.find((a) => a.tier === activeTab)?.accuracy ?? 0;

  const { canAccess, getUnlockMethod } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler({
    onUpgradeBasic: () => {
      setHighlightPlan("basic");
      setShowPricingModal(true);
    },
    onUpgradePremium: () => {
      setHighlightPlan("premium");
      setShowPricingModal(true);
    },
  });

  const tabs = [
    { id: "daily", label: "Daily", subtitle: "Free", icon: Sparkles },
    { id: "exclusive", label: "Pro", subtitle: "Higher Confidence", icon: Star },
    { id: "premium", label: "Premium", subtitle: "Members Only", icon: Crown },
  ];

  const getTabStyles = (tabId: string, isActive: boolean) => {
    const baseStyles = "relative py-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 border-2";
    
    switch (tabId) {
      case "daily":
        return isActive 
          ? cn(baseStyles, "border-primary bg-primary/20 shadow-[0_0_15px_rgba(15,155,142,0.25)]")
          : cn(baseStyles, "border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50");
      case "exclusive":
        return isActive 
          ? cn(baseStyles, "border-amber-500 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.25)]")
          : cn(baseStyles, "border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/15 hover:border-amber-500/50");
      case "premium":
        return isActive 
          ? cn(baseStyles, "border-fuchsia-500 bg-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.25)]")
          : cn(baseStyles, "border-fuchsia-500/30 bg-fuchsia-500/8 hover:bg-fuchsia-500/15 hover:border-fuchsia-500/50");
      default:
        return cn(baseStyles, "border-border");
    }
  };

  const getTextColor = (tabId: string) => {
    switch (tabId) {
      case "daily": return "text-primary";
      case "exclusive": return "text-amber-400";
      case "premium": return "text-fuchsia-400";
      default: return "text-muted-foreground";
    }
  };

  const getSubtitleColor = (tabId: string) => {
    switch (tabId) {
      case "daily": return "text-primary/70";
      case "exclusive": return "text-amber-400/70";
      case "premium": return "text-fuchsia-400/70";
      default: return "text-muted-foreground";
    }
  };

  const getCtaLabel = () => {
    switch (activeTab) {
      case "daily": return "See all Daily Multi-Match";
      case "exclusive": return "See all Pro Multi-Match";
      case "premium": return "See all Premium Multi-Match";
    }
  };

  // ----- Helpers used by both layouts -----
  const renderTicket = (ticket: BettingTicket) => {
    const isLocked = !canAccess(ticket.tier, "ticket", ticket.id);
    const unlockMethod = getUnlockMethod(ticket.tier, "ticket", ticket.id);
    return (
      <TicketCard
        key={ticket.id}
        ticket={ticket}
        isLocked={isLocked}
        unlockMethod={unlockMethod}
        isUnlocking={unlockingId === ticket.id}
        onUnlockClick={() => handleUnlock("ticket", ticket.id, ticket.tier)}
      />
    );
  };

  // --- WEB: vertical sections ---
  if (!isAndroidApp) {
    const dailyTickets = tickets.filter((t) => t.tier === "daily").slice(0, 2);
    const proTickets = tickets.filter((t) => t.tier === "exclusive").slice(0, 2);
    const premiumTickets = tickets.filter((t) => t.tier === "premium").slice(0, 2);

    return (
      <section className="space-y-5">
        {/* Section Header */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/20">
              <Ticket className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Daily Multi-Match Predictions</h2>
              <p className="text-[9px] text-muted-foreground">Multi-match combinations</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <TicketTierSection
              title="Free Daily Picks"
              subtitle="Open access · everyday combos"
              badgeIcon={Sparkles}
              badgeLabel="Free"
              tone="free"
              ctaLabel="See all Free Picks"
              onCta={() => navigate("/daily-predictions")}
              empty="No Daily AI Combos available"
              tickets={dailyTickets}
              renderTicket={renderTicket}
            />

            <TicketTierSection
              title="Pro Picks"
              subtitle="Higher confidence · curated edge"
              badgeIcon={Star}
              badgeLabel="⭐ Pro"
              tone="pro"
              ctaLabel="See all Pro Picks"
              onCta={() => navigate("/pro-predictions")}
              empty="No Pro AI Combos available"
              tickets={proTickets}
              renderTicket={renderTicket}
            />

            <TicketTierSection
              title="Premium Picks"
              subtitle="Best AI predictions · maximum edge"
              badgeIcon={Crown}
              badgeLabel="👑 Premium"
              tone="premium"
              ctaLabel="See all Premium Picks"
              onCta={() => navigate("/premium-predictions")}
              empty="No Premium AI Combos available"
              tickets={premiumTickets}
              renderTicket={renderTicket}
            />
          </>
        )}

        <PricingModal
          open={showPricingModal}
          onOpenChange={setShowPricingModal}
          highlightPlan={highlightPlan}
        />
      </section>
    );
  }

  // --- ANDROID: keep existing tabbed layout ---
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20">
            <Ticket className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Daily Multi-Match Predictions</h2>
            <p className="text-[9px] text-muted-foreground">Multi-match combinations</p>
          </div>
        </div>
        {accuracy > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-[10px] text-muted-foreground">Accuracy</span>
            <span className="text-xs font-bold text-primary">{accuracy}%</span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-2.5 p-1.5 rounded-xl bg-secondary/30">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = todayTicketCountByTier(tab.id);
          const textColor = getTextColor(tab.id);
          const subtitleColor = getSubtitleColor(tab.id);
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={getTabStyles(tab.id, isActive)}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <tab.icon className={cn("h-4 w-4", textColor)} />
                  <span className={cn("font-bold text-sm", textColor)}>{tab.label}</span>
                  <span className={cn(
                    "text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted/50",
                    textColor
                  )}>
                    {count}
                  </span>
                </div>
                <span className={cn("text-[10px] font-medium", subtitleColor)}>{tab.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tickets Content - Limited to 4 */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : displayedTickets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedTickets.map((ticket) => renderTicket(ticket))}
        </div>
      ) : (
        <Card className="empty-state-compact bg-card/50 border-border/50">
          <div className="flex flex-col items-center gap-1">
            {activeTab === "daily" && <Sparkles className="h-5 w-5 text-primary/50" />}
            {activeTab === "exclusive" && <Star className="h-5 w-5 text-amber-500/50" />}
            {activeTab === "premium" && <Crown className="h-5 w-5 text-fuchsia-500/50" />}
            <p className="text-[10px] text-muted-foreground">
              No {activeTab === "exclusive" ? "Pro" : activeTab} AI Combos available
            </p>
          </div>
        </Card>
      )}

      {/* Centered See All CTA */}
      {filtered.length > 0 && (
        <div className="flex justify-center">
          <Button
            className="px-6 group bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white text-xs border-0 rounded-full"
            onClick={() => navigate(TAB_ROUTES[activeTab])}
          >
            <span>{getCtaLabel()}</span>
            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      )}

      <PricingModal
        open={showPricingModal}
        onOpenChange={setShowPricingModal}
        highlightPlan={highlightPlan}
      />
    </section>
  );
}

/* =======================
   Ticket Tier Section (web)
======================= */

type TicketTone = "free" | "pro" | "premium";

const TICKET_TONE: Record<TicketTone, {
  border: string;
  bg: string;
  badge: string;
  text: string;
  cta: string;
}> = {
  free: {
    border: "border-primary/30",
    bg: "from-primary/10 via-primary/5 to-transparent",
    badge: "bg-primary/15 text-primary border-primary/30",
    text: "text-primary",
    cta: "from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600",
  },
  pro: {
    border: "border-amber-500/30",
    bg: "from-amber-500/10 via-amber-500/5 to-transparent",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    text: "text-amber-400",
    cta: "from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600",
  },
  premium: {
    border: "border-fuchsia-500/30",
    bg: "from-fuchsia-500/10 via-fuchsia-500/5 to-transparent",
    badge: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
    text: "text-fuchsia-400",
    cta: "from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600",
  },
};

function TicketTierSection({
  title,
  subtitle,
  badgeIcon: BadgeIcon,
  badgeLabel,
  tone,
  ctaLabel,
  onCta,
  empty,
  tickets,
  renderTicket,
}: {
  title: string;
  subtitle: string;
  badgeIcon: any;
  badgeLabel: string;
  tone: TicketTone;
  ctaLabel: string;
  onCta: () => void;
  empty: string;
  tickets: BettingTicket[];
  renderTicket: (t: BettingTicket) => JSX.Element;
}) {
  const styles = TICKET_TONE[tone];

  return (
    <div className={cn("rounded-2xl border p-3 sm:p-4 space-y-3 bg-gradient-to-br", styles.border, styles.bg)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge variant="outline" className={cn("gap-1 text-[10px] px-2 py-0.5", styles.badge)}>
              <BadgeIcon className="h-3 w-3" />
              {badgeLabel}
            </Badge>
            <h3 className="text-sm font-bold text-foreground truncate">{title}</h3>
          </div>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {tickets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tickets.map(renderTicket)}
        </div>
      ) : (
        <Card className="empty-state-compact bg-card/40 border-border/40">
          <div className="flex flex-col items-center gap-1">
            <BadgeIcon className={cn("h-5 w-5 opacity-50", styles.text)} />
            <p className="text-[10px] text-muted-foreground">{empty}</p>
          </div>
        </Card>
      )}

      <div className="flex justify-center pt-1">
        <Button
          size="sm"
          className={cn("px-5 group text-white text-xs border-0 rounded-full bg-gradient-to-r", styles.cta)}
          onClick={onCta}
        >
          <span>{ctaLabel}</span>
          <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}