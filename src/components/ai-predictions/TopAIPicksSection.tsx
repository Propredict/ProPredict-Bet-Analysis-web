import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Trophy, Sparkles, Zap, Lock, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIPredictionCard } from "./AIPredictionCard";
import type { RankedPick } from "./utils/topPicksRanking";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import type { ContentTier } from "@/hooks/useUserPlan";
import { getMarketColors } from "./utils/marketColors";

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

/** Short market tag for visual scanning (BTTS, Over, 1X2, etc.) */
function getMarketTag(prediction: string | null | undefined): string {
  const p = (prediction ?? "").toLowerCase();
  if (p.includes("btts")) return p.includes("no") ? "BTTS No" : "BTTS";
  if (p.includes("over 1.5")) return "Over 1.5";
  if (p.includes("over 2.5")) return "Over 2.5";
  if (p.includes("over 3.5")) return "Over 3.5";
  if (p.includes("under 2.5")) return "Under 2.5";
  if (p.includes("under 3.5")) return "Under 3.5";
  if (p.includes("double chance") || /\b(1x|x2|12)\b/.test(p)) {
    if (p.includes("1x")) return "1X";
    if (p.includes("x2")) return "X2";
    if (p.includes("12")) return "12";
    return "Double Chance";
  }
  if (prediction === "1") return "Home Win";
  if (prediction === "2") return "Away Win";
  if (prediction === "X") return "Draw";
  return prediction ?? "Pick";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Hide swipe hint after user starts scrolling + track scroll edges for arrow visibility
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateEdges = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    const onScroll = () => {
      if (el.scrollLeft > 20) setShowHint(false);
      updateEdges();
    };
    updateEdges();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateEdges);
    const t = setTimeout(() => setShowHint(false), 6000);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateEdges);
      clearTimeout(t);
    };
  }, []);

  const scrollByCard = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    // First card width as the step (matches snap-start cards: ~88vw + 12px gap).
    const firstCard = el.querySelector<HTMLElement>(":scope > div");
    const step = firstCard ? firstCard.getBoundingClientRect().width + 12 : el.clientWidth * 0.9;
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
    setShowHint(false);
  };

  if (picks.length === 0) return null;

  // Unlocked count per tier:
  // - Premium/Admin: all picks unlocked
  // - Pro: 3 unlocked, rest locked (visible teasers)
  // - Free: 1 unlocked, rest locked (visible teasers — swipe to see all 5)
  const unlockedCount = isPremiumUser || isAdmin ? picks.length : isProUser ? 3 : 1;
  // All viewers see all picks (locked teasers visible for FOMO + swipe UX).
  const visiblePicks = picks;
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

        {/* Trust line */}
        <p className="text-center text-[9px] md:text-[10px] text-muted-foreground/80 mb-3 -mt-1">
          AI Confidence based on xG &amp; team form
        </p>

        {/* Picks horizontal scroll (mobile-first) → grid on desktop */}
        <div className="relative">
          <div
            ref={scrollRef}
            className={cn(
              "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1",
              "[scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-500/40",
              "lg:grid lg:grid-cols-3 lg:gap-3 lg:overflow-visible lg:snap-none lg:pb-0 lg:mx-0 lg:px-0",
            )}
          >
          {visiblePicks.map((rp, idx) => {
            // Use the prediction's REAL tier so all market tabs (BTTS, Combo, etc.) show.
            const realTier = getPredictionTier(rp.prediction);
            // Cards within unlockedCount → bypass paywall (forceUnlocked).
            // Cards beyond unlockedCount → respect paywall (locked teaser).
            const isUnlockedSlot = idx < unlockedCount;
            // For LOCKED slots: force "premium" tier so user sees ALL tabs (Goals, BTTS, DC, Combo)
            // with blurred content — maximizes FOMO and shows full value of upgrade.
            const effectiveTier = isUnlockedSlot ? realTier : "premium";
            return (
              <div
                key={rp.prediction.id}
                className="relative shrink-0 w-[88vw] max-w-[340px] snap-start lg:w-auto lg:max-w-none lg:shrink pt-3"
              >
                {/* Label badge floating top-right */}
                <div className="absolute top-0 left-2 z-10">
                  {rp.label === "elite" ? (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-md shadow-amber-500/40 text-[9px] md:text-[10px] font-semibold px-2 py-0.5">
                      <Sparkles className="w-2.5 h-2.5 mr-1 fill-current" />
                      ⭐ Elite
                    </Badge>
                  ) : (
                    <Badge className="bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white border-0 shadow-md shadow-fuchsia-500/40 text-[9px] md:text-[10px] font-semibold px-2 py-0.5">
                      <Zap className="w-2.5 h-2.5 mr-1" />
                      Strong AI Signal
                    </Badge>
                  )}
                </div>
                {/* Market + league quick-scan chips */}
                <div className="absolute top-0 right-2 z-10 flex items-center gap-1">
                  {(() => {
                    const tag = getMarketTag(rp.prediction.prediction);
                    const tokens = getMarketColors(rp.prediction.prediction);
                    return (
                      <Badge
                        variant="outline"
                        className={cn(
                          "backdrop-blur text-[8px] md:text-[9px] font-semibold px-1.5 py-0.5 border",
                          tokens.chipClass,
                        )}
                      >
                        {tag}
                      </Badge>
                    );
                  })()}
                  {rp.prediction.league && (
                    <Badge
                      variant="outline"
                      className="hidden sm:inline-flex bg-background/90 backdrop-blur border-border/60 text-muted-foreground text-[8px] md:text-[9px] px-1.5 py-0.5 max-w-[110px] truncate"
                      title={rp.prediction.league}
                    >
                      {rp.prediction.league}
                    </Badge>
                  )}
                </div>
                <div className="pt-1">
                  <AIPredictionCard
                    overrideTier={effectiveTier}
                    forceUnlocked={isUnlockedSlot}
                    forceLocked={!isUnlockedSlot}
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

          {/* Swipe hint — only visible on mobile when there are 2+ picks and user hasn't scrolled yet */}
          {showHint && visiblePicks.length > 1 && (
            <div className="lg:hidden pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center">
              {/* Soft fade gradient on the right edge */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[85%] w-12 bg-gradient-to-l from-background via-background/60 to-transparent rounded-r" />
              {/* Animated chevron pill */}
              <div className="relative mr-1 flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500 to-fuchsia-600 text-white shadow-lg shadow-amber-500/40 animate-pulse">
                <span className="text-[9px] font-bold tracking-wide">Swipe</span>
                <ChevronRight className="w-3.5 h-3.5 animate-[slide-in-right_1s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {/* Prev arrow — mobile only, visible when scrollable to the left */}
          {visiblePicks.length > 1 && canScrollLeft && (
            <button
              type="button"
              aria-label="Previous pick"
              onClick={() => scrollByCard("left")}
              className="lg:hidden absolute left-1 top-1/2 -translate-y-1/2 z-30 h-9 w-9 rounded-full bg-background/90 backdrop-blur border border-amber-500/40 shadow-lg shadow-black/40 flex items-center justify-center text-amber-300 active:scale-95 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Next arrow — mobile only, visible when scrollable to the right */}
          {visiblePicks.length > 1 && canScrollRight && (
            <button
              type="button"
              aria-label="Next pick"
              onClick={() => scrollByCard("right")}
              className="lg:hidden absolute right-1 top-1/2 -translate-y-1/2 z-30 h-9 w-9 rounded-full bg-background/90 backdrop-blur border border-amber-500/40 shadow-lg shadow-black/40 flex items-center justify-center text-amber-300 active:scale-95 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Pagination dots — mobile only */}
          {visiblePicks.length > 1 && (
            <div className="lg:hidden flex justify-center gap-1 mt-1.5">
              {visiblePicks.map((_, i) => (
                <span
                  key={i}
                  className="h-1 w-1 rounded-full bg-amber-500/40"
                />
              ))}
            </div>
          )}
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
