import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Trophy, Sparkles, Zap, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIPredictionCard } from "./AIPredictionCard";
import type { RankedPick } from "./utils/topPicksRanking";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import type { ContentTier } from "@/hooks/useUserPlan";

interface Props {
  picks: RankedPick[];
  isAdmin: boolean;
  isPremiumUser: boolean;
  isProUser: boolean;
  isAuthenticated: boolean;
  isFavorite: (matchId: string) => boolean;
  isSaving: (matchId: string) => boolean;
  onToggleFavorite: (matchId: string) => void;
  onUnlock?: (contentType: "tip", contentId: string, tier: ContentTier) => void;
  unlockingId?: string | null;
  getPredictionTier: (p: AIPrediction) => "free" | "pro" | "premium";
}

export function TopAIPicksSection({
  picks,
  isAdmin,
  isPremiumUser,
  isProUser,
  isAuthenticated,
  isFavorite,
  isSaving,
  onToggleFavorite,
  onUnlock,
  unlockingId,
  getPredictionTier,
}: Props) {
  const navigate = useNavigate();

  if (picks.length === 0) return null;

  // Unlocked count per tier:
  // - Premium/Admin: all 5 unlocked
  // - Pro: 3 unlocked, 2 locked (visible)
  // - Free: 1 unlocked, 4 locked (visible)
  const unlockedCount = isPremiumUser || isAdmin ? picks.length : isProUser ? 3 : 1;
  // Free users: render only the unlocked pick(s); locked teasers are removed.
  // Pro users still see locked teasers (unchanged).
  const isFreeViewer = !isPremiumUser && !isProUser && !isAdmin;
  const visiblePicks = isFreeViewer ? picks.slice(0, unlockedCount) : picks;
  const lockedCount = Math.max(0, picks.length - unlockedCount);
  const showUpsell = !isPremiumUser && !isAdmin && lockedCount > 0;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2",
        "bg-gradient-to-br from-amber-500/10 via-fuchsia-500/5 to-violet-600/10",
        "border-amber-500/40",
        "shadow-[0_0_40px_rgba(245,158,11,0.15)]",
      )}
    >
      {/* Decorative glow orbs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />

      <div className="relative p-3 md:p-5">
        {/* Centered premium section header */}
        <div className="flex flex-col items-center text-center mb-4 md:mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-px w-8 md:w-12 bg-gradient-to-r from-transparent to-amber-500/60" />
            <div className="p-2 md:p-2.5 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-fuchsia-600 shadow-lg shadow-amber-500/40 ring-1 ring-amber-300/30">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 text-white drop-shadow" />
            </div>
            <div className="h-px w-8 md:w-12 bg-gradient-to-l from-transparent to-fuchsia-500/60" />
          </div>
          <h2 className="text-base md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-400 bg-clip-text text-transparent">
            Top AI Picks Today
          </h2>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 max-w-md">
            Highest-scoring predictions, ranked by AI confidence + value
          </p>
          <Badge
            variant="outline"
            className="mt-2 inline-flex border-amber-500/40 bg-amber-500/10 text-amber-300 text-[9px] md:text-[10px]"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            🏆 Elite AI Selection
          </Badge>
        </div>

        {/* Picks grid */}
        <div className="grid gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visiblePicks.map((rp, idx) => {
            // Use the prediction's REAL tier so all market tabs (BTTS, Combo, etc.) show.
            const realTier = getPredictionTier(rp.prediction);
            // Cards within unlockedCount → bypass paywall (forceUnlocked).
            // Cards beyond unlockedCount → respect paywall (locked teaser).
            const isUnlockedSlot = idx < unlockedCount;
            return (
              <div key={rp.prediction.id} className="relative">
                {/* Label badge floating top-right */}
                <div className="absolute -top-2 left-2 z-10">
                  {rp.label === "elite" ? (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-md shadow-amber-500/40 text-[9px] md:text-[10px] font-semibold px-2 py-0.5">
                      <Crown className="w-2.5 h-2.5 mr-1 fill-current" />
                      Elite Pick
                    </Badge>
                  ) : (
                    <Badge className="bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white border-0 shadow-md shadow-fuchsia-500/40 text-[9px] md:text-[10px] font-semibold px-2 py-0.5">
                      <Zap className="w-2.5 h-2.5 mr-1" />
                      Strong AI Signal
                    </Badge>
                  )}
                </div>
                <div className="pt-2">
                  <AIPredictionCard
                    overrideTier={realTier}
                    forceUnlocked={isUnlockedSlot}
                    prediction={rp.prediction}
                    isAdmin={isAdmin}
                    isPremiumUser={isPremiumUser}
                    isProUser={isProUser}
                    isFavorite={isFavorite(rp.prediction.match_id)}
                    isSavingFavorite={isSaving(rp.prediction.match_id)}
                    onToggleFavorite={onToggleFavorite}
                    onGoPremium={() => navigate("/get-premium")}
                    onUnlockClick={onUnlock}
                    isUnlocking={unlockingId === rp.prediction.id}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Free user upsell */}
        {showUpsell && (
          <div className="mt-3 md:mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 p-3 rounded-lg bg-gradient-to-r from-violet-600/15 to-fuchsia-600/15 border border-fuchsia-500/30">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <Lock className="w-4 h-4 text-fuchsia-400 shrink-0" />
              <p className="text-xs md:text-sm text-foreground">
                <span className="font-semibold text-fuchsia-300">
                  +{lockedCount} more elite picks
                </span>{" "}
                available with Pro & Premium
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(isAuthenticated ? "/get-premium" : "/login")}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-md shadow-fuchsia-500/30 h-8 text-xs"
            >
              <Crown className="w-3 h-3 mr-1 fill-current" />
              Upgrade for {lockedCount} more
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
