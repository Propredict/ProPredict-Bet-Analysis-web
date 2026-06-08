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

  // Exclude specialized categories (Risk Tickets, etc.) from main 3 tiers
  const mainTickets = todayTickets.filter((t: any) => t.category !== "multi_risk");

  const freeTicket = mainTickets.find((t: any) => t.tier === "daily" || t.tier === "free");
  const proTicket = mainTickets.find((t: any) => t.tier === "exclusive");
  const premiumTicket = mainTickets.find((t: any) => t.tier === "premium");

  const tiers = [
    {
      label: "FREE DAILY", tier: "daily" as const, ticket: freeTicket,
      accent: "text-green-400", border: "border-green-500/40", glow: "shadow-[0_0_15px_rgba(34,197,94,0.2)]",
      bg: "bg-green-500/10", badgeBg: "bg-green-500/20 text-green-400",
      locked: false,
      seeAllLabel: "See all Free Tickets",
      seeAllRoute: "/daily-tickets",
      sectionTitle: "Free Picks",
      ctaGradient: "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-[0_0_15px_rgba(34,197,94,0.4)]",
    },
    {
      label: "PRO", tier: "exclusive" as const, ticket: proTicket,
      accent: "text-amber-400", border: "border-amber-500/40", glow: "shadow-[0_0_15px_rgba(245,158,11,0.25)]",
      bg: "bg-amber-500/10", badgeBg: "bg-amber-500/20 text-amber-400",
      locked: true,
      seeAllLabel: "See all Pro Tickets",
      seeAllRoute: "/exclusive-tickets",
      sectionTitle: "Pro Picks",
      ctaGradient: "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-[0_0_15px_rgba(245,158,11,0.4)]",
    },
    {
      label: "PREMIUM", tier: "premium" as const, ticket: premiumTicket,
      accent: "text-purple-400", border: "border-purple-500/40", glow: "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
      bg: "bg-purple-500/10", badgeBg: "bg-purple-500/20 text-purple-400",
      locked: true,
      seeAllLabel: "See all Premium Tickets",
      seeAllRoute: "/premium-tickets",
      sectionTitle: "Premium Picks",
      ctaGradient: "bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 shadow-[0_0_15px_rgba(168,85,247,0.4)]",
    },
  ];

  const hasAny = freeTicket || proTicket || premiumTicket;
  if (isLoading || !hasAny) return null;

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-extrabold text-foreground flex items-center justify-center gap-2">
          Daily Tickets <Ticket className="h-5 w-5 text-orange-500" />
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
              <h3 className="text-base font-extrabold text-white text-center tracking-tight">
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
                    <div key={i} className="rounded-lg border border-border/40 bg-background/40 p-2.5 space-y-2">
                      {parsed.league && (
                        <p className="text-[9px] text-muted-foreground truncate text-center">{parsed.league}</p>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <span className="flex-1 text-right text-[12px] font-semibold text-foreground leading-tight truncate px-2 py-1 rounded-md border border-border/50 bg-muted/20">
                          {parsed.homeTeam}
                        </span>
                        <span className="shrink-0 text-muted-foreground text-[10px]">vs</span>
                        <span className="flex-1 text-left text-[12px] font-semibold text-foreground leading-tight truncate px-2 py-1 rounded-md border border-border/50 bg-muted/20">
                          {parsed.awayTeam}
                        </span>
                      </div>
                      {isLocked ? (
                        <div className={cn("rounded-md border py-1.5 px-3 text-center flex items-center justify-center gap-1.5", border)}>
                          <Lock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground blur-sm select-none">Over 2.5</span>
                        </div>
                      ) : (
                        <div className={cn("rounded-md border py-1.5 px-3 text-center", border, bg)}>
                          <span className={cn("text-[12px] font-bold tracking-wide", accent)}>
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
                        className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                        onClick={() => handleUnlock("ticket", ticket.id, tier as any)}
                        disabled={isUnlocking}
                      >
                        {isUnlocking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                        Watch Ad to Unlock
                      </Button>
                      <button
                        onClick={() => navigate("/get-premium")}
                        className="block w-full text-center text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors"
                      >
                        or unlock with Pro
                      </button>
                      <button
                        onClick={() => navigate(seeAllRoute)}
                        className="block w-full text-center text-[11px] text-amber-400/80 hover:text-amber-400 font-semibold transition-colors"
                      >
                        {seeAllLabel} →
                      </button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                        onClick={() => navigate("/get-premium")}
                      >
                        Get Premium
                      </Button>
                      <button
                        onClick={() => navigate(seeAllRoute)}
                        className="block w-full text-center text-[11px] text-purple-400/80 hover:text-purple-400 font-semibold transition-colors"
                      >
                        {seeAllLabel} →
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  size="sm"
                  className={cn("w-full text-xs font-bold text-white rounded-lg border-0", ctaGradient)}
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