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
      "bg-[#0a1628] border-[#1e3a5f]/40 overflow-hidden",
      prediction.is_live && "ring-1 ring-red-500/50"
    )}>
      <CardContent className="p-0">
        {/* Header - League, Time, Live/Premium badges, Favorite */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
            <span>{prediction.league || "League"}</span>
            <span>•</span>
            <span>{formatDateLabel(prediction.match_day)}, {formatTime(prediction.match_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Favorite Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onToggleFavorite?.(prediction.match_id)}
              disabled={isSavingFavorite}
            >
              {isSavingFavorite ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Heart
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-400"
                  )}
                />
              )}
            </Button>
            {prediction.is_live && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px] px-2 py-0.5 animate-pulse">
                <Radio className="w-3 h-3 mr-1" />
                LIVE
              </Badge>
            )}
            {isPremiumPrediction && (
              <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 text-[10px] px-2.5 py-0.5 font-semibold rounded">
                <Star className="w-3 h-3 mr-1 fill-current" />
                AI PRO
              </Badge>
            )}
          </div>
        </div>

        {/* Match Title - ALWAYS VISIBLE */}
        <div className="px-4 pb-3">
          <h3 className="font-bold text-lg text-white">
            {prediction.home_team} vs {prediction.away_team}
          </h3>
        </div>

        {/* Market Tabs */}
        <div className="px-4 pb-4">
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="w-full grid grid-cols-5 bg-[#1e3a5f]/30 h-9">
              <TabsTrigger value="main" className="text-xs data-[state=active]:bg-[#1e3a5f] px-1">
                Main
              </TabsTrigger>
              <TabsTrigger value="goals" className="text-xs data-[state=active]:bg-[#1e3a5f] px-1">
                Goals
              </TabsTrigger>
              <TabsTrigger value="btts" className="text-xs data-[state=active]:bg-[#1e3a5f] px-1">
                BTTS
              </TabsTrigger>
              <TabsTrigger value="double" className="text-xs data-[state=active]:bg-[#1e3a5f] px-1">
                DC
              </TabsTrigger>
              <TabsTrigger value="combos" className="text-xs data-[state=active]:bg-[#1e3a5f] px-1">
                Combos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="mt-4">
              <MainMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="goals" className="mt-4">
              <GoalsMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="btts" className="mt-4">
              <BTTSMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="double" className="mt-4">
              <DoubleChanceTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>

            <TabsContent value="combos" className="mt-4">
              <CombosMarketTab prediction={prediction} hasAccess={hasAccess} />
            </TabsContent>
          </Tabs>
        </div>

        {/* AI Analysis - Only visible when unlocked */}
        {hasAccess && (
          <div className="px-4 pb-4">
            <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-xs text-muted-foreground hover:text-foreground p-2 h-auto bg-[#1e3a5f]/20 rounded"
                >
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Analysis
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isAnalysisOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 bg-[#1e3a5f]/20 rounded space-y-3">
                  {/* Dynamic AI Explanation */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {generatedAnalysis.explanation}
                  </p>
                  
                  {/* Dynamic Key Factors */}
                  <div className="flex flex-wrap gap-1.5">
                    {generatedAnalysis.keyFactors.map((factor, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className={cn(
                          "text-[10px]",
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
                    <div className="pt-2 border-t border-[#1e3a5f]/30">
                      <p className="text-[10px] text-muted-foreground/70 italic">
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
          <div className="px-4 pb-5">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Unlock full AI analysis and market insights
            </p>
            
            {needsPremiumUpgrade ? (
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 font-medium"
                onClick={onGoPremium}
              >
                <Star className="w-4 h-4 mr-2 fill-current" />
                Get AI Pro Access
              </Button>
            ) : canWatchAd ? (
              <Button
                variant="outline"
                className="w-full border-[#1e3a5f]/60 bg-transparent text-white hover:bg-[#1e3a5f]/30 font-medium"
                onClick={handleWatchAd}
                disabled={isUnlocking}
              >
                <Eye className="w-4 h-4 mr-2" />
                {isUnlocking ? "Unlocking..." : "Watch Ad to Unlock"}
              </Button>
            ) : null}
          </div>
        )}

        {/* Unlocked indicator */}
        {hasAccess && !isAdmin && !isPremiumUser && (
          <div className="px-4 pb-4">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              ✓ Unlocked
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AIPredictionCard;
