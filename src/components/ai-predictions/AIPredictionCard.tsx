import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Brain, Star, Heart, Radio, Loader2, Crown, Bot, Sparkles, CheckCircle2, Flame } from "lucide-react";

// Top-tier leagues that always deserve a "BIG MATCH" highlight even when confidence is low
const BIG_MATCH_LEAGUES = [
  "Premier League",
  "La Liga",
  "Primera Division",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "UEFA Champions League",
  "Champions League",
  "UEFA Europa League",
  "Europa League",
  "UEFA Europa Conference League",
  "Conference League",
  "FIFA World Cup",
  "European Championship",
  "Euro Championship",
  "Copa America",
  "Copa Libertadores",
];

const BIG_MATCH_TEAMS_HINT = [
  "arsenal", "manchester", "liverpool", "chelsea", "tottenham", "newcastle",
  "real madrid", "barcelona", "atletico madrid",
  "juventus", "inter", "milan", "napoli", "roma",
  "bayern", "dortmund", "leverkusen",
  "psg", "paris saint",
];

function isBigMatch(league: string | null, home: string, away: string): boolean {
  if (!league) return false;
  const leagueLower = league.toLowerCase();
  const inTopLeague = BIG_MATCH_LEAGUES.some((l) => leagueLower.includes(l.toLowerCase()));
  if (!inTopLeague) return false;
  // For "Premier League" name collisions (many countries have one), require a known elite team
  if (leagueLower === "premier league") {
    const h = home.toLowerCase();
    const a = away.toLowerCase();
    return BIG_MATCH_TEAMS_HINT.some((t) => h.includes(t) || a.includes(t));
  }
  return true;
}
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { usePlatform } from "@/hooks/usePlatform";
import { MainMarketTab } from "./MarketTabs/MainMarketTab";
import { GoalsMarketTab } from "./MarketTabs/GoalsMarketTab";
import { BTTSMarketTab } from "./MarketTabs/BTTSMarketTab";
import { DoubleChanceTab } from "./MarketTabs/DoubleChanceTab";
import { CombosMarketTab } from "./MarketTabs/CombosMarketTab";
import { KeyPlayerMissingBadge } from "./KeyPlayerMissingBadge";
import { MarketTrendBadge } from "./MarketTrendBadge";
import { ValueBetBadge } from "./ValueBetBadge";

interface Props {
  prediction: AIPrediction;
  isAdmin?: boolean;
  isPremiumUser?: boolean;
  isProUser?: boolean;
  isFavorite?: boolean;
  isSavingFavorite?: boolean;
  onToggleFavorite?: (matchId: string) => void;
  onGoPremium: () => void;
  overrideTier?: "free" | "pro" | "premium";
  onUnlockClick?: (contentType: "tip", contentId: string, tier: ContentTier) => void;
  isUnlocking?: boolean;
  /** When true, bypass paywall and show full content with all tabs (used by Top AI Picks for promo cards) */
  forceUnlocked?: boolean;
}

const AIPredictionCardInner = ({ 
  prediction, 
  isAdmin = false, 
  isPremiumUser = false,
  isProUser = false,
  isFavorite = false,
  isSavingFavorite = false,
  onToggleFavorite,
  onGoPremium,
  overrideTier,
  onUnlockClick,
  isUnlocking = false,
  forceUnlocked = false,
}: Props) => {
  const navigate = useNavigate();
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const { getUnlockMethod, canAccess } = useUserPlan();
  const { isAndroidApp } = usePlatform();

  const displayTier: "free" | "pro" | "premium" = overrideTier ?? (prediction.is_premium ? "premium" : "free");
  const isPremiumTier = displayTier === "premium";
  const isProTier = displayTier === "pro";
  const isDailyTier = displayTier === "free";

  const contentTier: ContentTier = isPremiumTier ? "premium" : isProTier ? "exclusive" : "daily";
  const hasAccess = forceUnlocked || canAccess(contentTier, "tip", prediction.id!);
  const unlockMethod = getUnlockMethod(contentTier, "tip", prediction.id!);

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.length >= 5 ? time.slice(0, 5) : time;
  };

  return (
    <Card className={cn(
      "bg-[#0a1628] border-[#1e3a5f]/40 overflow-hidden rounded",
      prediction.is_live && "ring-1 ring-red-500/50"
    )}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-2 md:px-3 py-1.5 md:py-2 flex items-center justify-between">
          <div className="flex items-center gap-1 md:gap-1.5 text-[9px] md:text-[10px] text-muted-foreground">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px] md:text-[9px] px-1 md:px-1.5 py-0.5 rounded">
              <Bot className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5" />
              AI
            </Badge>
            <span className="truncate max-w-[70px] md:max-w-none">{prediction.league || "League"}</span>
            <span>•</span>
            <span className="whitespace-nowrap">{formatTime(prediction.match_time)}</span>
          </div>
          <div className="flex items-center gap-0.5 md:gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 md:h-6 md:w-6"
              onClick={() => onToggleFavorite?.(prediction.match_id)}
              disabled={isSavingFavorite}
            >
              {isSavingFavorite ? (
                <Loader2 className="w-2.5 md:w-3 h-2.5 md:h-3 animate-spin text-muted-foreground" />
              ) : (
                <Heart
                  className={cn(
                    "w-2.5 md:w-3 h-2.5 md:h-3 transition-colors",
                    isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-400"
                  )}
                />
              )}
            </Button>
            {prediction.is_live && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[8px] md:text-[9px] px-1 md:px-1.5 py-0.5 animate-pulse rounded">
                <Radio className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5" />
                LIVE
              </Badge>
            )}
            {isPremiumTier && (
              <Badge className="bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white border-0 text-[8px] md:text-[9px] px-1 md:px-2 py-0.5 font-semibold rounded">
                <Crown className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 fill-current" />
                PREMIUM
              </Badge>
            )}
            {isProTier && !isPremiumTier && (
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 text-[8px] md:text-[9px] px-1 md:px-2 py-0.5 font-semibold rounded">
                <Star className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 fill-current" />
                PRO
              </Badge>
            )}
          </div>
        </div>

        {/* Match Title */}
        <div className="px-2 md:px-3 pb-1.5 md:pb-2 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-xs md:text-sm text-white truncate">
            {prediction.home_team} vs {prediction.away_team}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {(() => {
              const pred = (prediction.prediction || "").toLowerCase();
              const sideValue =
                pred.includes("home") || pred === "1" ? prediction.value_home
                  : pred.includes("draw") || pred === "x" ? prediction.value_draw
                  : pred.includes("away") || pred === "2" ? prediction.value_away
                  : null;
              return (
                <ValueBetBadge
                  value={sideValue}
                  isValueBet={prediction.is_value_bet}
                  bookmakersCount={prediction.bookmakers_count}
                  compact
                />
              );
            })()}
            <MarketTrendBadge
              trend={prediction.market_trend}
              strength={prediction.market_trend_strength}
              movementPct={prediction.odds_movement_pct}
              compact
            />
            <KeyPlayerMissingBadge
              homeMissing={prediction.missing_home_players}
              awayMissing={prediction.missing_away_players}
              homeImpact={prediction.injury_impact_home}
              awayImpact={prediction.injury_impact_away}
              homeTeam={prediction.home_team}
              awayTeam={prediction.away_team}
              lineupConfirmed={prediction.lineup_confirmed}
            />
          </div>
        </div>

        {/* Market Tabs */}
        <div className="px-2 md:px-3 pb-2 md:pb-3">
          <Tabs defaultValue="main" className="w-full">
            <TabsList className={cn(
              "w-full bg-[#1e3a5f]/30 h-6 md:h-7 rounded",
              displayTier === "free" ? "grid grid-cols-1" : displayTier === "pro" ? "grid grid-cols-4" : "grid grid-cols-5"
            )}>
              <TabsTrigger value="main" className="text-[9px] md:text-[10px] data-[state=active]:bg-[#1e3a5f] px-0.5 rounded">
                Main
              </TabsTrigger>
              {displayTier !== "free" && (
                <TabsTrigger value="goals" className="text-[9px] md:text-[10px] data-[state=active]:bg-[#1e3a5f] px-0.5 rounded">
                  Goals
                </TabsTrigger>
              )}
              {displayTier !== "free" && (
                <TabsTrigger value="btts" className="text-[9px] md:text-[10px] data-[state=active]:bg-[#1e3a5f] px-0.5 rounded">
                  BTTS
                </TabsTrigger>
              )}
              {displayTier !== "free" && (
                <TabsTrigger value="double" className="text-[9px] md:text-[10px] data-[state=active]:bg-[#1e3a5f] px-0.5 rounded">
                  DC
                </TabsTrigger>
              )}
              {displayTier === "premium" && (
                <TabsTrigger value="combos" className="text-[9px] md:text-[10px] data-[state=active]:bg-[#1e3a5f] px-0.5 rounded">
                  Combo
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="main" className="mt-2 md:mt-3">
              <MainMarketTab prediction={prediction} hasAccess={hasAccess} displayTier={displayTier} />
            </TabsContent>

            {displayTier !== "free" && (
              <TabsContent value="goals" className="mt-2 md:mt-3">
                <GoalsMarketTab prediction={prediction} hasAccess={hasAccess} />
              </TabsContent>
            )}

            {displayTier !== "free" && (
              <TabsContent value="btts" className="mt-2 md:mt-3">
                <BTTSMarketTab prediction={prediction} hasAccess={hasAccess} />
              </TabsContent>
            )}

            {displayTier !== "free" && (
              <TabsContent value="double" className="mt-2 md:mt-3">
                <DoubleChanceTab prediction={prediction} hasAccess={hasAccess} />
              </TabsContent>
            )}

            {displayTier === "premium" && (
              <TabsContent value="combos" className="mt-2 md:mt-3">
                <CombosMarketTab prediction={prediction} hasAccess={hasAccess} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* FREE tier upsell + teaser */}
        {hasAccess && displayTier === "free" && !isPremiumUser && !isProUser && (
          <div className="px-2 md:px-3 pb-2 md:pb-3 space-y-2">
            {/* Teaser text — FOMO */}
            <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-fuchsia-500/5 border border-fuchsia-500/15">
              <Crown className="w-3 h-3 text-fuchsia-400" />
              <span className="text-[9px] md:text-[10px] text-muted-foreground">
                <span className="text-fuchsia-400 font-semibold">+3 stronger picks</span> available in Premium
              </span>
            </div>
            
            <div
              onClick={() => navigate("/get-premium")}
              className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-fuchsia-500/5 to-amber-500/5 p-2.5 cursor-pointer hover:border-amber-500/40 transition-colors group"
            >
              <div className="flex items-start gap-2">
                <Crown className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                 <div className="flex-1 min-w-0 space-y-1.5">
                   <p className="text-[10px] md:text-[11px] font-semibold text-foreground">
                     Upgrade for more predictions
                   </p>
                   <div className="flex flex-wrap gap-1">
                     <Badge className="bg-amber-500/10 text-amber-400/90 border-amber-500/20 text-[7px] md:text-[8px] px-1.5 py-0 rounded">
                       🎯 Pro Picks
                     </Badge>
                     <Badge className="bg-fuchsia-500/10 text-fuchsia-400/90 border-fuchsia-500/20 text-[7px] md:text-[8px] px-1.5 py-0 rounded">
                       👑 Premium Analysis
                     </Badge>
                   </div>
                  <p className="text-[8px] md:text-[9px] text-muted-foreground/70">
                    Pro from €3.99/mo · Premium from €5.99/mo
                  </p>
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground -rotate-90 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1" />
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis - Pro/Premium only */}
        {hasAccess && displayTier !== "free" && prediction.analysis && (
          <div className="px-2 md:px-3 pb-2 md:pb-3">
            <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-[9px] md:text-[10px] text-muted-foreground hover:text-foreground p-1 md:p-1.5 h-auto bg-[#1e3a5f]/20 rounded"
                >
                  <span className="flex items-center gap-1 md:gap-1.5">
                    <Brain className="w-2.5 md:w-3 h-2.5 md:h-3" />
                    AI Analysis
                  </span>
                  <ChevronDown className={cn("w-2.5 md:w-3 h-2.5 md:h-3 transition-transform", isAnalysisOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 md:mt-1.5 p-1.5 md:p-2 bg-[#1e3a5f]/20 rounded space-y-1.5 md:space-y-2">
                  <p className="text-[9px] md:text-[10px] text-muted-foreground leading-relaxed">
                    {prediction.analysis}
                  </p>
                   {prediction.key_factors && prediction.key_factors.length > 0 && (
                     <div className="flex flex-wrap gap-0.5">
                       {prediction.key_factors
                         .filter((f) => !f.startsWith("[TAG]"))
                         .slice(0, displayTier === "premium" ? 5 : 3)
                         .map((factor, i) => (
                         <Badge 
                           key={i} 
                           variant="secondary" 
                           className="text-[8px] md:text-[9px] px-1 py-0.5 rounded bg-[#1e3a5f]/40"
                         >
                           {factor}
                         </Badge>
                       ))}
                     </div>
                   )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Unlock CTA */}
        {!hasAccess && unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="px-2 md:px-3 pb-2 md:pb-3">
            <p className="text-[9px] md:text-[10px] text-muted-foreground text-center mb-1.5 md:mb-2">
              Unlock AI insights
            </p>
            
            {unlockMethod.type === "android_watch_ad_or_pro" ? (
              <div className="flex flex-col gap-1.5">
                <Button
                  className="w-full h-7 md:h-8 text-[10px] md:text-xs bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-medium rounded"
                onClick={() => onUnlockClick?.("tip", prediction.id!, contentTier)}
                  disabled={isUnlocking}
                >
                  {isUnlocking ? (
                    <Loader2 className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5" />
                  )}
                  {unlockMethod.primaryMessage}
                </Button>
                <Button
                  size="sm"
                  className="w-full h-7 text-[9px] md:text-[10px] bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-white border-0 font-medium rounded"
                  onClick={() => navigate("/get-premium")}
                >
                  <Star className="w-2 md:w-2.5 h-2 md:h-2.5 mr-1 fill-current" />
                  {unlockMethod.secondaryMessage}
                </Button>
              </div>
            ) : unlockMethod.type === "android_premium_only" ? (
              <Button
                className="w-full h-7 md:h-8 text-[10px] md:text-xs bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white border-0 font-medium rounded"
                onClick={() => navigate("/get-premium")}
              >
                <Crown className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5 fill-current" />
                {unlockMethod.message}
              </Button>
            ) : unlockMethod.type === "watch_ad" ? (
              <Button
                className="w-full h-7 md:h-8 text-[10px] md:text-xs bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-medium rounded"
                onClick={() => onUnlockClick?.("tip", prediction.id!, contentTier)}
                disabled={isUnlocking}
              >
                {isUnlocking ? (
                  <Loader2 className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5" />
                )}
                Watch Ad to Unlock
              </Button>
            ) : (
              <Button
                className={cn(
                  "w-full h-7 md:h-8 text-[10px] md:text-xs hover:opacity-90 text-white border-0 font-medium rounded",
                  unlockMethod.type === "upgrade_basic" 
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500" 
                    : "bg-gradient-to-r from-fuchsia-500 to-pink-500"
                )}
                onClick={() => navigate("/get-premium")}
              >
                {unlockMethod.type === "upgrade_basic" ? (
                  <Star className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5 fill-current" />
                ) : (
                  <Crown className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5 fill-current" />
                )}
                {unlockMethod.type === "upgrade_basic" ? "Pro Access Required" : "Premium Access Required"}
              </Button>
            )}
          </div>
        )}

        {/* Available indicator */}
        {hasAccess && !isAdmin && (isProTier || isPremiumTier || (isAndroidApp && isDailyTier)) && (
          <div className="px-2 md:px-3 pb-2 md:pb-3">
            <div className="flex items-center justify-center gap-2 py-2 px-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              <span className="text-[10px] md:text-xs font-medium text-green-400">AI Prediction Available</span>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="px-2 md:px-3 pb-2 md:pb-3 pt-1 border-t border-[#1e3a5f]/30">
          <p className="text-[8px] md:text-[9px] text-muted-foreground/60 text-center leading-tight">
            AI-generated prediction. No guarantee of accuracy. For informational purposes only.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export const AIPredictionCard = React.memo(AIPredictionCardInner);
export default AIPredictionCard;
