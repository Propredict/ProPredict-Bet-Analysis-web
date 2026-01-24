import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Eye, ChevronDown, Brain, Star, Heart, Radio, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { MainMarketTab } from "./MarketTabs/MainMarketTab";
import { GoalsMarketTab } from "./MarketTabs/GoalsMarketTab";
import { BTTSMarketTab } from "./MarketTabs/BTTSMarketTab";
import { DoubleChanceTab } from "./MarketTabs/DoubleChanceTab";
import { CombosMarketTab } from "./MarketTabs/CombosMarketTab";
import { generateAIAnalysis } from "./utils/aiExplanationGenerator";

interface Props {
  prediction: AIPrediction;
  isAdmin?: boolean;
  isPremiumUser?: boolean;
  isFavorite?: boolean;
  isSavingFavorite?: boolean;
  onToggleFavorite?: (matchId: string) => void;
  onWatchAd: () => void;
  onGoPremium: () => void;
}

export function AIPredictionCard({ 
  prediction, 
  isAdmin = false, 
  isPremiumUser = false,
  isFavorite = false,
  isSavingFavorite = false,
  onToggleFavorite,
  onWatchAd, 
  onGoPremium 
}: Props) {
  const navigate = useNavigate();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Premium if is_premium flag is true OR confidence > 70
  const isPremiumPrediction = prediction.is_premium || (prediction.confidence > 70);
  
  // Access logic: admin or premium user always has access, free users can unlock non-premium via ads
  const hasAccess = isAdmin || isPremiumUser || isUnlocked;

  // Free users cannot unlock premium predictions via ads
  const canWatchAd = !isPremiumPrediction && !hasAccess;
  const needsPremiumUpgrade = isPremiumPrediction && !isAdmin && !isPremiumUser;

  // Generate dynamic AI analysis
  const generatedAnalysis = useMemo(() => generateAIAnalysis(prediction), [prediction]);

  const handleWatchAd = async () => {
    if (isPremiumPrediction) return;
    setIsUnlocking(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsUnlocked(true);
    setIsUnlocking(false);
    onWatchAd();
  };

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

  return (
    <Card className={cn(
      "bg-[#0a1628] border-[#1e3a5f]/40 overflow-hidden rounded-lg",
      prediction.is_live && "ring-1 ring-red-500/50"
    )}>
      <CardContent className="p-0">
        {/* Header - League, Time, Live/Premium badges, Favorite */}
        <div className="px-2.5 md:px-4 py-2 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
            <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-muted-foreground/60" />
            <span className="truncate max-w-[100px] md:max-w-none">{prediction.league || "League"}</span>
            <span>•</span>
            <span className="whitespace-nowrap">{formatTime(prediction.match_time)}</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {/* Favorite Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 md:h-7 md:w-7"
              onClick={() => onToggleFavorite?.(prediction.match_id)}
              disabled={isSavingFavorite}
            >
              {isSavingFavorite ? (
                <Loader2 className="w-3 md:w-4 h-3 md:h-4 animate-spin text-muted-foreground" />
              ) : (
                <Heart
                  className={cn(
                    "w-3 md:w-4 h-3 md:h-4 transition-colors",
                    isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-400"
                  )}
                />
              )}
            </Button>
            {prediction.is_live && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 animate-pulse rounded-lg">
                <Radio className="w-2.5 md:w-3 h-2.5 md:h-3 mr-0.5 md:mr-1" />
                LIVE
              </Badge>
            )}
            {isPremiumPrediction && (
              <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 text-[9px] md:text-[10px] px-1.5 md:px-2.5 py-0.5 font-semibold rounded-lg">
                <Star className="w-2.5 md:w-3 h-2.5 md:h-3 mr-0.5 md:mr-1 fill-current" />
                PRO
              </Badge>
            )}
          </div>
        </div>

        {/* Match Title - ALWAYS VISIBLE */}
        <div className="px-2.5 md:px-4 pb-2 md:pb-3">
          <h3 className="font-semibold text-sm md:text-lg text-white">
            {prediction.home_team} vs {prediction.away_team}
          </h3>
        </div>

        {/* Market Tabs */}
        <div className="px-2.5 md:px-4 pb-2.5 md:pb-4">
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="w-full grid grid-cols-5 bg-[#1e3a5f]/30 h-7 md:h-9 rounded-lg">
              <TabsTrigger value="main" className="text-[10px] md:text-xs data-[state=active]:bg-[#1e3a5f] px-0.5 md:px-1 rounded-lg">
                Main
              </TabsTrigger>
              <TabsTrigger value="goals" className="text-[10px] md:text-xs data-[state=active]:bg-[#1e3a5f] px-0.5 md:px-1 rounded-lg">
                Goals
              </TabsTrigger>
              <TabsTrigger value="btts" className="text-[10px] md:text-xs data-[state=active]:bg-[#1e3a5f] px-0.5 md:px-1 rounded-lg">
                BTTS
              </TabsTrigger>
              <TabsTrigger value="double" className="text-[10px] md:text-xs data-[state=active]:bg-[#1e3a5f] px-0.5 md:px-1 rounded-lg">
                DC
              </TabsTrigger>
              <TabsTrigger value="combos" className="text-[10px] md:text-xs data-[state=active]:bg-[#1e3a5f] px-0.5 md:px-1 rounded-lg">
                Combo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="mt-2.5 md:mt-4">
              <MainMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="goals" className="mt-2.5 md:mt-4">
              <GoalsMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="btts" className="mt-2.5 md:mt-4">
              <BTTSMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="double" className="mt-2.5 md:mt-4">
              <DoubleChanceTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="combos" className="mt-2.5 md:mt-4">
              <CombosMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>
          </Tabs>
        </div>

        {/* AI Analysis - Only visible when unlocked */}
        {hasAccess && (
          <div className="px-2.5 md:px-4 pb-2.5 md:pb-4">
            <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-[10px] md:text-xs text-muted-foreground hover:text-foreground p-1.5 md:p-2 h-auto bg-[#1e3a5f]/20 rounded-lg"
                >
                  <span className="flex items-center gap-1.5 md:gap-2">
                    <Brain className="w-3 md:w-4 h-3 md:h-4" />
                    AI Analysis
                  </span>
                  <ChevronDown className={cn("w-3 md:w-4 h-3 md:h-4 transition-transform", isAnalysisOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1.5 md:mt-2 p-2 md:p-3 bg-[#1e3a5f]/20 rounded-lg space-y-2 md:space-y-3">
                  {/* Dynamic AI Explanation */}
                  <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
                    {generatedAnalysis.explanation}
                  </p>
                  
                  {/* Dynamic Key Factors */}
                  <div className="flex flex-wrap gap-1">
                    {generatedAnalysis.keyFactors.slice(0, 3).map((factor, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className={cn(
                          "text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-lg",
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
                    <div className="pt-1.5 md:pt-2 border-t border-[#1e3a5f]/30">
                      <p className="text-[9px] md:text-[10px] text-muted-foreground/70 italic line-clamp-2">
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
        {!hasAccess && (
          <div className="px-2.5 md:px-4 pb-3 md:pb-5">
            <p className="text-[10px] md:text-xs text-muted-foreground text-center mb-2 md:mb-3">
              Unlock AI insights
            </p>
            
            {needsPremiumUpgrade ? (
              <Button
                className="w-full h-8 md:h-10 text-xs md:text-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 font-medium rounded-lg"
                onClick={onGoPremium}
              >
                <Star className="w-3 md:w-4 h-3 md:h-4 mr-1.5 md:mr-2 fill-current" />
                Get AI Pro
              </Button>
            ) : canWatchAd ? (
              <Button
                variant="outline"
                className="w-full h-8 md:h-10 text-xs md:text-sm border-[#1e3a5f]/60 bg-transparent text-white hover:bg-[#1e3a5f]/30 font-medium rounded-lg"
                onClick={handleWatchAd}
                disabled={isUnlocking}
              >
                <Eye className="w-3 md:w-4 h-3 md:h-4 mr-1.5 md:mr-2" />
                {isUnlocking ? "Unlocking..." : "Watch Ad"}
              </Button>
            ) : null}
          </div>
        )}

        {/* Unlocked indicator */}
        {hasAccess && !isAdmin && !isPremiumUser && (
          <div className="px-2.5 md:px-4 pb-2.5 md:pb-4">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] md:text-xs rounded-lg">
              ✓ Unlocked
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIPredictionCard;
