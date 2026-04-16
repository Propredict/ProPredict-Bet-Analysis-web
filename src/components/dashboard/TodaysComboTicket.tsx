import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Lock, Loader2, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { PricingModal } from "@/components/PricingModal";

export function TodaysComboTicket() {
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

  // Priority: Premium combo first, then Pro
  const combo = todayTickets.find((t: any) => t.tier === "premium")
    || todayTickets.find((t: any) => t.tier === "exclusive")
    || todayTickets.find((t: any) => t.tier === "daily");

  if (!combo || isLoading) return null;

  const matches = combo.matches ?? [];
  const previewMatches = matches.slice(0, 3);
  const isUnlocked = canAccess(combo.tier as any, "ticket", combo.id);
  const isUnlocking = unlockingId === combo.id;
  const isPremium = combo.tier === "premium";

  return (
    <section className="space-y-3">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-extrabold text-foreground flex items-center justify-center gap-2">
          Today's Combo Prediction <Ticket className="h-5 w-5 text-orange-500" />
        </h2>
        <p className="text-xs text-muted-foreground">Multi-match combination • Higher returns</p>
      </div>

      <Card className="relative p-4 border-2 border-orange-500/40 rounded-xl bg-gradient-to-br from-orange-500/15 via-red-500/10 to-transparent shadow-[0_0_20px_rgba(249,115,22,0.25)] overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-500/20 to-transparent rounded-bl-full" />

        <div className="flex items-center justify-between mb-3">
          <Badge className={cn(
            "text-[10px] font-bold border-0",
            isPremium ? "bg-purple-500/20 text-purple-400" : "bg-amber-500/20 text-amber-400"
          )}>
            {isPremium ? "PREMIUM COMBO" : combo.tier === "exclusive" ? "PRO COMBO" : "DAILY COMBO"}
          </Badge>
          <span className="text-xs font-bold text-orange-400">
            Total Odds: {combo.total_odds ?? "—"}
          </span>
        </div>

        {/* Match previews */}
        <div className="space-y-2 mb-3">
          {previewMatches.map((m: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-background/40">
              <span className="text-foreground font-medium truncate flex-1">{m.match_name}</span>
              {!isUnlocked ? (
                <span className="text-muted-foreground blur-sm select-none ml-2">Over 2.5</span>
              ) : (
                <span className="text-primary font-semibold ml-2">{m.prediction}</span>
              )}
            </div>
          ))}
          {matches.length > 3 && (
            <p className="text-[10px] text-muted-foreground text-center">
              +{matches.length - 3} more matches
            </p>
          )}
        </div>

        {/* CTA */}
        {!isUnlocked && (
          <div className="space-y-1.5">
            {isPremium ? (
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                onClick={() => navigate("/get-premium")}
              >
                Get Premium
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                  onClick={() => handleUnlock("ticket", combo.id, combo.tier as any)}
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
              </>
            )}
          </div>
        )}
      </Card>

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </section>
  );
}
