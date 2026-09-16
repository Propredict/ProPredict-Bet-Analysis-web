import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Lock, Loader2, Play, Eye, Users, Flame, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { PricingModal } from "@/components/PricingModal";
import { parseMatchName } from "@/types/admin";

export function TodaysTopTickets() {
  const navigate = useNavigate();
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium">();

  const { canAccess } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler({
    onUpgradeBasic: () => { setHighlightPlan("basic"); setShowPricingModal(true); },
    onUpgradePremium: () => { setHighlightPlan("premium"); setShowPricingModal(true); },
  });

  const { tickets: dbTickets = [], isLoading } = useTickets(false);

  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const todayTickets = dbTickets.filter((t: any) => t.ticket_date === todayDate);

  // Exclude specialized categories from main 3 tiers
  const mainTickets = todayTickets.filter((t: any) => t.category !== "multi_risk" && t.category !== "sure_odds");

  const freeTicket = mainTickets.find((t: any) => t.tier === "daily" || t.tier === "free");
  const proTicket = mainTickets.find((t: any) => t.tier === "exclusive");
  const premiumTicket = mainTickets.find((t: any) => t.tier === "premium");

  const tiers = [
    {
      label: "FREE DAILY", tier: "daily" as const, ticket: freeTicket,
      accent: "text-green-400", border: "border-green-500/40", glow: "shadow-[0_0_15px_rgba(0,148,230,0.2)]",
      bg: "bg-green-500/10", badgeBg: "bg-green-500/20 text-green-400",
      locked: false,
      seeAllLabel: "See all Free Tickets / Pogledaj sve Free Tickets",
      seeAllRoute: "/daily-tickets",
      sectionTitle: "Free Picks",
      ctaGradient: "bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 shadow-[0_0_15px_rgba(0,148,230,0.4)]",
    },
    {
      label: "PRO", tier: "exclusive" as const, ticket: proTicket,
      accent: "text-blue-600", border: "border-blue-700/40", glow: "shadow-[0_0_15px_rgba(0,148,230,0.25)]",
      bg: "bg-blue-700/10", badgeBg: "bg-blue-700/20 text-blue-600",
      locked: true,
      seeAllLabel: "See all Sure Odds 2+ / Pogledaj sve Sure Odds 2+",
      seeAllRoute: "/exclusive-tickets",
      sectionTitle: "Sure Odds 2+ Ticket",
      ctaGradient: "bg-gradient-to-r from-blue-700 to-primary hover:from-blue-800 hover:to-blue-700 shadow-[0_0_15px_rgba(0,148,230,0.4)]",
    },
    {
      label: "PREMIUM", tier: "premium" as const, ticket: premiumTicket,
      accent: "text-primary", border: "border-primary/40", glow: "shadow-[0_0_20px_rgba(0,148,230,0.3)]",
      bg: "bg-primary/10", badgeBg: "bg-primary/20 text-primary",
      locked: true,
      seeAllLabel: "See all Premium Tickets / Pogledaj sve Premium Tickets",
      seeAllRoute: "/premium-tickets",
      sectionTitle: "Premium Picks",
      ctaGradient: "bg-gradient-to-r from-blue-700 to-primary hover:from-blue-800 hover:to-blue-700 shadow-[0_0_15px_rgba(0,148,230,0.4)]",
    },
  ];

  const hasAny = freeTicket || proTicket || premiumTicket;
  if (isLoading || !hasAny) return null;

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-extrabold text-foreground flex items-center justify-center gap-2">
          Daily Tickets <Ticket className="h-5 w-5 text-primary" />
        </h2>
        <p className="text-xs text-muted-foreground">Multi-match combos • Higher returns</p>
      </div>

      {/* Social proof */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary/5 border border-primary/10">
        <Users className="h-3 w-3 text-primary/70" />
        <span className="text-[10px] text-muted-foreground">
          🔥 <span className="text-primary font-semibold">{(18000 + Math.floor(Math.random() * 2500)).toLocaleString()}+</span> users checked tickets today
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-5">
        {tiers.map(({ label, tier, ticket, accent, border, glow, bg, badgeBg, locked, seeAllLabel, seeAllRoute, sectionTitle, ctaGradient }) => {
          if (!ticket) return null;
          const isUnlocked = canAccess(tier as any, "ticket", ticket.id);
          const isLocked = locked && !isUnlocked;
          const isUnlocking = unlockingId === ticket.id;
          const matches = ticket.matches ?? [];
          const previewMatches = matches.slice(0, 3);

          return (
            <div key={tier} className="space-y-2">
              {/* Section title */}
              <h3 className="text-base font-extrabold text-primary-foreground text-center tracking-tight">
                {sectionTitle}
              </h3>

              <Card className={cn("relative p-4 border-2 rounded-xl overflow-hidden", border, glow, bg)}>
              <div className="flex items-center justify-between mb-3">
                <Badge className={cn("text-[10px] font-bold border-0", badgeBg)}>
                  {label}
                </Badge>
              </div>

              <p className="text-xs font-bold text-foreground mb-2">{ticket.title}</p>

              {/* Our Picks header */}
              <div className="flex items-center justify-center gap-2 mb-2.5">
                <Star className={cn("h-3.5 w-3.5 fill-current", accent)} />
                <span className={cn("text-[11px] uppercase tracking-[0.18em] font-bold", accent)}>Our Picks</span>
                <Star className={cn("h-3.5 w-3.5 fill-current", accent)} />
              </div>

              {/* Match previews — web-style cards */}
              <div className="space-y-2.5 mb-3">
                {previewMatches.map((m: any, i: number) => {
                  const parsed = parseMatchName(m.match_name);
                  return (
                    <div key={i} className="space-y-2 rounded-lg border-2 border-primary/50 bg-card p-2.5">
                      {parsed.league && (
                        <p className="text-[9px] text-muted-foreground truncate text-center">{parsed.league}</p>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <span className="flex-1 truncate rounded-md border border-primary/35 bg-card px-2 py-1 text-right text-[12px] font-semibold leading-tight text-foreground">
                          {parsed.homeTeam}
                        </span>
                        <span className="shrink-0 text-muted-foreground text-[10px]">vs</span>
                        <span className="flex-1 truncate rounded-md border border-primary/35 bg-card px-2 py-1 text-left text-[12px] font-semibold leading-tight text-foreground">
                          {parsed.awayTeam}
                        </span>
                      </div>
                      {isLocked ? (
                        <div className={cn("rounded-md border py-1.5 px-3 text-center flex items-center justify-center gap-1.5", border)}>
                          <Lock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground blur-sm select-none">Over 2.5</span>
                        </div>
                      ) : (
                        <div className="rounded-md border border-success/45 bg-success/10 px-3 py-1.5 text-center">
                          <span className="text-[12px] font-extrabold tracking-wide text-success">
                            {m.prediction}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {matches.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    +{matches.length - 3} more matches
                  </p>
                )}
              </div>

              {/* CTA */}
              {isLocked ? (
                <div className="space-y-1.5">
                  {tier === "exclusive" ? (
                    <>
                      <Button
                        size="sm"
                        className="w-full bg-primary hover:bg-blue-700 text-primary-foreground text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(0,148,230,0.3)]"
                        onClick={() => handleUnlock("ticket", ticket.id, tier as any)}
                        disabled={isUnlocking}
                      >
                        {isUnlocking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                        Watch Ad to Unlock / Otključaj posle reklame
                      </Button>
                      <button
                        onClick={() => navigate("/get-premium")}
                        className="block w-full text-center text-[10px] text-blue-600/70 hover:text-blue-600 transition-colors"
                      >
                        or unlock with Pro
                      </button>
                      <button
                        onClick={() => navigate(seeAllRoute)}
                        className="block w-full text-center text-[11px] text-blue-600/80 hover:text-blue-600 font-semibold transition-colors"
                      >
                        {seeAllLabel} →
                      </button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-blue-700 to-primary hover:from-blue-800 hover:to-blue-700 text-primary-foreground text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(0,148,230,0.4)]"
                        onClick={() => navigate("/get-premium")}
                      >
                        Get Premium / Kupi Premium
                      </Button>
                      <button
                        onClick={() => navigate(seeAllRoute)}
                        className="block w-full text-center text-[11px] text-primary/80 hover:text-primary font-semibold transition-colors"
                      >
                        {seeAllLabel} →
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  size="sm"
                  className={cn("w-full text-xs font-bold text-primary-foreground rounded-lg border-0", ctaGradient)}
                  onClick={() => navigate(seeAllRoute)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> {seeAllLabel}
                </Button>
              )}
              </Card>
            </div>
          );
        })}
      </div>

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </section>
  );
}