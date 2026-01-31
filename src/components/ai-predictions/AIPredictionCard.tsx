import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Brain, Star, Heart, Radio, Loader2, Crown, Bot, Sparkles, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { useUserPlan, type ContentTier } from "@/hooks/useUserPlan";
import { MainMarketTab } from "./MarketTabs/MainMarketTab";
import { GoalsMarketTab } from "./MarketTabs/GoalsMarketTab";
import { BTTSMarketTab } from "./MarketTabs/BTTSMarketTab";
import { DoubleChanceTab } from "./MarketTabs/DoubleChanceTab";
import { CombosMarketTab } from "./MarketTabs/CombosMarketTab";
import { generateAIAnalysis } from "./utils/aiExplanationGenerator";
// AdModal kept for future Android AdMob use - disabled on web
// import { AdModal } from "@/components/AdModal";

interface Props {
  prediction: AIPrediction;
  isAdmin?: boolean;
  isPremiumUser?: boolean;
  isProUser?: boolean;
  isFavorite?: boolean;
  isSavingFavorite?: boolean;
  onToggleFavorite?: (matchId: string) => void;
  onWatchAd: () => void; // Kept for future Android use
  onGoPremium: () => void;
}

export function AIPredictionCard({ 
  prediction, 
  isAdmin = false, 
  isPremiumUser = false,
  isProUser = false,
  isFavorite = false,
  isSavingFavorite = false,
  onToggleFavorite,
  onWatchAd, // Kept for future Android use
  onGoPremium 
}: Props) {
  const navigate = useNavigate();
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const { getUnlockMethod, canAccess } = useUserPlan();

  // Determine prediction tier based on confidence and is_premium flag
  // Premium: is_premium = true AND confidence > 80
  // Pro/Exclusive: is_premium = true OR confidence > 70
  // Daily: everything else (open for all)
  const isPremiumTier = prediction.is_premium && prediction.confidence > 80;
  const isProTier = (prediction.is_premium || prediction.confidence > 70) && !isPremiumTier;
  const isDailyTier = !isPremiumTier && !isProTier;

  // Map to content tier for useUserPlan
  const contentTier: ContentTier = isPremiumTier ? "premium" : isProTier ? "exclusive" : "daily";

  // Use centralized access logic from useUserPlan
  const hasAccess = canAccess(contentTier);
  const unlockMethod = getUnlockMethod(contentTier);

  // Generate dynamic AI analysis
  const generatedAnalysis = useMemo(() => generateAIAnalysis(prediction), [prediction]);

  // Format time as HH:mm
  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.length >= 5 ? time.slice(0, 5) : time;
  };

  // Format date label from match_day
  const formatDateLabel = (matchDay: string | null) => {
    if (matchDay === "today") return "Today";
    if (matchDay === "tomorrow") return "Tomorrow";
    return matchDay || "";
  };

  // Determine badge type for display
  const showProBadge = isProTier || isPremiumTier;

  return (
    <Card className={cn(
      "bg-[#0a1628] border-[#1e3a5f]/40 overflow-hidden rounded",
      prediction.is_live && "ring-1 ring-red-500/50"
    )}>
      <CardContent className="p-0">
        {/* Header - League, Time, AI/Live/Premium badges, Favorite */}
        <div className="px-2 md:px-3 py-1.5 md:py-2 flex items-center justify-between">
          <div className="flex items-center gap-1 md:gap-1.5 text-[9px] md:text-[10px] text-muted-foreground">
            {/* AI Badge - Always visible */}
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px] md:text-[9px] px-1 md:px-1.5 py-0.5 rounded">
              <Bot className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5" />
              AI
            </Badge>
            <span className="truncate max-w-[70px] md:max-w-none">{prediction.league || "League"}</span>
            <span>•</span>
            <span className="whitespace-nowrap">{formatTime(prediction.match_time)}</span>
          </div>
          <div className="flex items-center gap-0.5 md:gap-1">
            {/* Favorite Button */}
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
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 text-[8px] md:text-[9px] px-1 md:px-2 py-0.5 font-semibold rounded">
                <Crown className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 fill-current" />
                PREMIUM
              </Badge>
            )}
            {isProTier && !isPremiumTier && (
              <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 text-[8px] md:text-[9px] px-1 md:px-2 py-0.5 font-semibold rounded">
                <Star className="w-2 md:w-2.5 h-2 md:h-2.5 mr-0.5 fill-current" />
                PRO
              </Badge>
            )}
          </div>
        </div>

        {/* Match Title - ALWAYS VISIBLE */}
        <div className="px-2 md:px-3 pb-1.5 md:pb-2">
          <h3 className="font-semibold text-xs md:text-sm text-white">
            {prediction.home_team} vs {prediction.away_team}
          </h3>
        </div>

        {/* Market Tabs */}
        <div className="px-2 md:px-3 pb-2 md:pb-3">
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="w-full grid grid-cols-5 bg-[#1e3a5f]/30 h-6 md:h-7 rounded">
              <TabsTrigger value="main" className="text-[9px] md:text-[10px] data-[state=active]:bg-[#1e3a5f] px-0.5 rounded">
                Main
              </TabsTrigger>
              <TabsTrigger value="goals" className="text-[9px] md:text-[10px] data-[state=active]:bg-[#1e3a5f] px-0.5 rounded">
                Goals
              </TabsTrigger>
              <TabsTrigger value="btts" className="text-[9px] md:text-[10px] data-[state=active]:bg-[#1e3a5f] px-0.5 rounded">
                BTTS
              </TabsTrigger>
              <TabsTrigger value="double" className="text-[9px] md:text-[10px] data-[state=active]:bg-[#1e3a5f] px-0.5 rounded">
                DC
              </TabsTrigger>
              <TabsTrigger value="combos" className="text-[9px] md:text-[10px] data-[state=active]:bg-[#1e3a5f] px-0.5 rounded">
                Combo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="mt-2 md:mt-3">
              <MainMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="goals" className="mt-2 md:mt-3">
              <GoalsMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="btts" className="mt-2 md:mt-3">
              <BTTSMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="double" className="mt-2 md:mt-3">
              <DoubleChanceTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="combos" className="mt-2 md:mt-3">
              <CombosMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>
          </Tabs>
        </div>

        {/* AI Analysis - Only visible when unlocked */}
        {hasAccess && (
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
                  {/* Dynamic AI Explanation */}
                  <p className="text-[9px] md:text-[10px] text-muted-foreground leading-relaxed">
                    {generatedAnalysis.explanation}
                  </p>
                  
                  {/* Dynamic Key Factors */}
                  <div className="flex flex-wrap gap-0.5">
                    {generatedAnalysis.keyFactors.slice(0, 3).map((factor, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className={cn(
                          "text-[8px] md:text-[9px] px-1 py-0.5 rounded",
                          i === 0 
                            ? "bg-green-500/20 text-green-400 border-green-500/30" 
                            : "bg-[#1e3a5f]/40"
                        )}
                      >
                        {factor}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Original analysis from DB if available */}
                  {prediction.analysis && (
                    <div className="pt-1 md:pt-1.5 border-t border-[#1e3a5f]/30">
                      <p className="text-[8px] md:text-[9px] text-muted-foreground/70 italic line-clamp-2">
                        {prediction.analysis}
                      </p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Unlock CTA - Only show when locked */}
        {!hasAccess && unlockMethod && unlockMethod.type !== "unlocked" && (
          <div className="px-2 md:px-3 pb-2 md:pb-3">
            <p className="text-[9px] md:text-[10px] text-muted-foreground text-center mb-1.5 md:mb-2">
              Unlock AI insights
            </p>
            
            {/* Android dual-button layout for Pro/Exclusive content */}
            {unlockMethod.type === "android_watch_ad_or_pro" ? (
              <div className="flex flex-col gap-1.5">
                <Button
                  className="w-full h-7 md:h-8 text-[10px] md:text-xs bg-primary hover:bg-primary/90 text-white border-0 font-medium rounded"
                  onClick={onWatchAd}
                >
                  <Sparkles className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5" />
                  {unlockMethod.primaryMessage}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-6 text-[9px] md:text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/get-premium")}
                >
                  <ShoppingCart className="w-2 md:w-2.5 h-2 md:h-2.5 mr-1" />
                  {unlockMethod.secondaryMessage}
                </Button>
              </div>
            ) : unlockMethod.type === "android_premium_only" ? (
              <Button
                className="w-full h-7 md:h-8 text-[10px] md:text-xs bg-gradient-to-r from-warning via-accent to-primary hover:opacity-90 text-white border-0 font-medium rounded"
                onClick={() => navigate("/get-premium")}
              >
                <Crown className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5 fill-current" />
                {unlockMethod.message}
              </Button>
            ) : unlockMethod.type === "watch_ad" ? (
              <Button
                className="w-full h-7 md:h-8 text-[10px] md:text-xs bg-primary hover:bg-primary/90 text-white border-0 font-medium rounded"
                onClick={onWatchAd}
              >
                <Sparkles className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5" />
                Watch Ad to Unlock
              </Button>
            ) : (
              <Button
                className="w-full h-7 md:h-8 text-[10px] md:text-xs bg-gradient-to-r from-warning via-accent to-primary hover:opacity-90 text-white border-0 font-medium rounded"
                onClick={() => navigate("/get-premium")}
              >
                {unlockMethod.type === "upgrade_basic" ? (
                  <Star className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5 fill-current" />
                ) : (
                  <Crown className="w-2.5 md:w-3 h-2.5 md:h-3 mr-1 md:mr-1.5 fill-current" />
                )}
                {unlockMethod.type === "upgrade_basic" ? "Get Pro to unlock" : "Get Premium to unlock"}
              </Button>
            )}
          </div>
        )}

        {/* Unlocked indicator for Pro/Premium tiers when user has access */}
        {hasAccess && (isProTier || isPremiumTier) && !isAdmin && (
          <div className="px-2 md:px-3 pb-2 md:pb-3">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px] md:text-[10px] rounded">
              ✓ Unlocked
            </Badge>
          </div>
        )}

        {/* Mandatory AI Disclaimer - Always visible */}
        <div className="px-2 md:px-3 pb-2 md:pb-3 pt-1 border-t border-[#1e3a5f]/30">
          <p className="text-[8px] md:text-[9px] text-muted-foreground/60 text-center leading-tight">
            AI-generated prediction. No guarantee of accuracy. For informational purposes only.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default AIPredictionCard;
