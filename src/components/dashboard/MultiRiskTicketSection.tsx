import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, Lock, Loader2, Play, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTickets } from "@/hooks/useTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUnlockHandler } from "@/hooks/useUnlockHandler";
import { PricingModal } from "@/components/PricingModal";

export function MultiRiskTicketSection() {
  const navigate = useNavigate();
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [highlightPlan, setHighlightPlan] = useState<"basic" | "premium">();

  const { canAccess } = useUserPlan();
  const { unlockingId, handleUnlock } = useUnlockHandler({
    onUpgradeBasic: () => { setHighlightPlan("basic"); setShowPricingModal(true); },
    onUpgradePremium: () => { setHighlightPlan("premium"); setShowPricingModal(true); },
  });

  const { tickets: dbTickets = [] } = useTickets(false);

  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const multiRisk = dbTickets.find((t: any) => t.ticket_date === todayDate && t.category === "multi_risk");

  if (!multiRisk) return null;

  const matches = multiRisk.matches ?? [];
  const previewMatches = matches.slice(0, 3);
  const isUnlocked = canAccess(multiRisk.tier as any, "ticket", multiRisk.id);
  const isUnlocking = unlockingId === multiRisk.id;

  return (
    <section className="space-y-3">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-extrabold text-foreground flex items-center justify-center gap-2">
          Multi Risk Picks <Target className="h-5 w-5 text-red-500" />
        </h2>
        <p className="text-xs text-muted-foreground">High odds combo • High reward</p>
      </div>

      <Card className="relative p-4 border-2 border-red-500/40 rounded-xl bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent shadow-[0_0_20px_rgba(239,68,68,0.2)] overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <Badge className="text-[10px] font-bold border-0 bg-red-500/20 text-red-400">
            HIGH RISK
          </Badge>
          <span className="text-xs font-bold text-red-400">
            Total Odds: {multiRisk.total_odds ?? "—"}
          </span>
        </div>

        <p className="text-xs font-bold text-foreground mb-2">{multiRisk.title}</p>

        <div className="space-y-2 mb-3">
          {previewMatches.map((m: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-background/40">
              <span className="text-foreground font-medium truncate flex-1">{m.match_name}</span>
              {!isUnlocked ? (
                <span className="text-muted-foreground blur-sm select-none ml-2">Over 2.5</span>
              ) : (
                <span className="text-red-400 font-semibold ml-2">{m.prediction}</span>
              )}
            </div>
          ))}
          {matches.length > 3 && (
            <p className="text-[10px] text-muted-foreground text-center">
              +{matches.length - 3} more matches
            </p>
          )}
        </div>

        {!isUnlocked ? (
          <Button
            size="sm"
            className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(20,184,166,0.3)]"
            onClick={() => handleUnlock("ticket", multiRisk.id, multiRisk.tier as any)}
            disabled={isUnlocking}
          >
            {isUnlocking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
            Watch Ad to Unlock
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs border border-red-500/40 text-red-400"
            onClick={() => navigate("/multi-risk-matches")}
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> See all Multi Risk
          </Button>
        )}
      </Card>

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} highlightPlan={highlightPlan} />
    </section>
  );
}