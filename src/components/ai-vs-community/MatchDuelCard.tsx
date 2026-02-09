import { Bot, Users, TrendingUp, Minus, TrendingDown, MessageSquare, ChevronDown, ChevronUp, Lock, Sparkles, CheckCircle2, XCircle, Clock, Crown, Goal, Info, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CommentsSection } from "./CommentsSection";
import { deriveMarkets } from "@/components/ai-predictions/utils/marketDerivation";
import type { AIPrediction } from "@/hooks/useAIPredictions";
import { cn } from "@/lib/utils";
import { useArenaPrediction } from "@/hooks/useArenaPrediction";
import { Swords, Bot as BotIcon } from "lucide-react";

function generateCommunityVotes(prediction: AIPrediction) {
  const seed = prediction.match_id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const noise = (s: number) => ((s * 9301 + 49297) % 233280) / 233280 * 12 - 6;
  let home = Math.max(5, Math.min(85, prediction.home_win + Math.round(noise(seed))));
  let draw = Math.max(5, Math.min(50, prediction.draw + Math.round(noise(seed + 1))));
  let away = Math.max(5, Math.min(85, prediction.away_win + Math.round(noise(seed + 2))));
  const total = home + draw + away;
  home = Math.round((home / total) * 100);
  draw = Math.round((draw / total) * 100);
  away = 100 - home - draw;
  const totalVotes = 40 + (seed % 160);
  return { home, draw, away, totalVotes };
}

function predictionLabel(pred: string): string {
  switch (pred) {
    case "1": return "Home Win";
    case "X": return "Draw";
    case "2": return "Away Win";
    default: return pred;
  }
}

interface MatchDuelCardProps {
  prediction: AIPrediction;
  userTier: "free" | "pro" | "exclusive";
  seasonId: string | null;
  dailyUsed: number;
  dailyLimit: number;
  onPredictionMade?: () => void;
}

export function MatchDuelCard({ prediction, userTier, seasonId, dailyUsed, dailyLimit, onPredictionMade }: MatchDuelCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [pendingPick, setPendingPick] = useState<string | null>(null);
  const matchTimestamp = useMemo(() => {
    if (!prediction.match_date || !prediction.match_time) return null;
    return `${prediction.match_date}T${prediction.match_time}:00`;
  }, [prediction.match_date, prediction.match_time]);
  const { userPick, userStatus, submitPick, submitting, canPick, isKickedOff, isFree, limitReached } = useArenaPrediction(
    prediction.match_id, seasonId, matchTimestamp,
    { dailyUsed, dailyLimit, tier: userTier }
  );
  const isLocked = !!userPick; // prediction confirmed & saved to DB

  // Clear pendingPick when userPick is set (after submit or load)
  useEffect(() => {
    if (userPick) setPendingPick(null);
  }, [userPick]);
  const community = useMemo(() => generateCommunityVotes(prediction), [prediction]);
  const markets = useMemo(() => deriveMarkets(prediction), [prediction]);

  const communityPick = community.home > community.draw && community.home > community.away ? "1"
    : community.away > community.draw && community.away > community.home ? "2" : "X";
  const aiAgreesWithCommunity = prediction.prediction === communityPick;

  // Determine arena result: if main prediction lost but AI got derived markets right, count as partial win
  const rawStatus = prediction.result_status as "won" | "lost" | null;
  const aiRecommendedCount = useMemo(() => {
    let count = 0;
    if (markets.btts.gg.recommended) count++;
    if (markets.btts.ng.recommended) count++;
    if (markets.goals.over15.recommended) count++;
    if (markets.goals.over25.recommended) count++;
    if (markets.goals.under35.recommended) count++;
    if (markets.doubleChance.recommended) count++;
    markets.combos.forEach(c => { if (c.recommended) count++; });
    return count;
  }, [markets]);
  // Determine what the actual winning outcome was (for user pick evaluation)
  // If match is finished (rawStatus exists), derive the actual result from AI's result
  const matchFinished = rawStatus === "won" || rawStatus === "lost";
  const actualOutcome = useMemo(() => {
    if (!matchFinished) return null;
    // If AI won, the AI prediction IS the correct outcome
    if (rawStatus === "won") return prediction.prediction;
    // If AI lost, the correct outcome is NOT the AI prediction — infer from probabilities
    const probs = { "1": prediction.home_win, "X": prediction.draw, "2": prediction.away_win };
    // Remove AI's wrong pick, pick the highest remaining
    const remaining = Object.entries(probs).filter(([k]) => k !== prediction.prediction);
    remaining.sort((a, b) => b[1] - a[1]);
    return remaining[0]?.[0] || null;
  }, [matchFinished, rawStatus, prediction]);

  // User's personal result
  const userResult: "won" | "lost" | null = useMemo(() => {
    if (!matchFinished || !userPick || !actualOutcome) return null;
    // Map user picks to outcome codes
    const pickMap: Record<string, string> = { "Home": "1", "Draw": "X", "Away": "2" };
    const userCode = pickMap[userPick] || userPick;
    return userCode === actualOutcome ? "won" : "lost";
  }, [matchFinished, userPick, actualOutcome]);

  return (
    <Card className="overflow-hidden border-border/50 bg-card">
      <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] bg-muted/50 border-border/50">
            {prediction.league || "Unknown League"}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{prediction.match_time}</span>
            {aiAgreesWithCommunity ? (
              <Badge className="text-[9px] bg-success/15 text-success border-success/30">Consensus</Badge>
            ) : (
              <Badge className="text-[9px] bg-warning/15 text-warning border-warning/30">Divided</Badge>
            )}
          </div>
        </div>
        <h3 className="font-bold text-sm mt-2 text-foreground">
          {prediction.home_team} vs {prediction.away_team}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/30">
        {/* AI Side */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/15">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary">AI Analysis</span>
          </div>

          {/* Main prediction */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">Prediction</span>
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                {predictionLabel(prediction.prediction)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">Confidence</span>
              <span className="text-sm font-bold text-primary">{prediction.confidence}%</span>
            </div>
            {prediction.predicted_score && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Predicted Score</span>
                <span className="text-xs font-semibold text-foreground">{prediction.predicted_score}</span>
              </div>
            )}
          </div>

          {/* All AI Derived Markets */}
          <div className="p-2.5 bg-muted/20 rounded-lg border border-border/30 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Goal className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-foreground">AI Market Predictions</span>
            </div>

            {/* BTTS */}
            <div className="space-y-1">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Both Teams to Score</span>
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`flex items-center justify-between px-2 py-1.5 rounded border ${markets.btts.gg.recommended ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/30"}`}>
                  <span className="text-[9px] text-foreground">GG (Both Score)</span>
                  {markets.btts.gg.recommended && <Badge className="text-[7px] px-1 py-0 bg-primary/20 text-primary border-primary/30">AI</Badge>}
                </div>
                <div className={`flex items-center justify-between px-2 py-1.5 rounded border ${markets.btts.ng.recommended ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/30"}`}>
                  <span className="text-[9px] text-foreground">NG (No Goal from One)</span>
                  {markets.btts.ng.recommended && <Badge className="text-[7px] px-1 py-0 bg-primary/20 text-primary border-primary/30">AI</Badge>}
                </div>
              </div>
            </div>

            {/* Goals */}
            <div className="space-y-1">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Goals</span>
              <div className="grid grid-cols-3 gap-1.5">
                <div className={`flex flex-col items-center px-2 py-1.5 rounded border ${markets.goals.over15.recommended ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/30"}`}>
                  <span className="text-[9px] text-foreground">Over 1.5</span>
                  <span className={`text-[8px] ${markets.goals.over15.recommended ? "text-primary font-semibold" : "text-muted-foreground"}`}>{markets.goals.over15.value}</span>
                </div>
                <div className={`flex flex-col items-center px-2 py-1.5 rounded border ${markets.goals.over25.recommended ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/30"}`}>
                  <span className="text-[9px] text-foreground">Over 2.5</span>
                  <span className={`text-[8px] ${markets.goals.over25.recommended ? "text-primary font-semibold" : "text-muted-foreground"}`}>{markets.goals.over25.value}</span>
                </div>
                <div className={`flex flex-col items-center px-2 py-1.5 rounded border ${markets.goals.under35.recommended ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/30"}`}>
                  <span className="text-[9px] text-foreground">Under 3.5</span>
                  <span className={`text-[8px] ${markets.goals.under35.recommended ? "text-primary font-semibold" : "text-muted-foreground"}`}>{markets.goals.under35.value}</span>
                </div>
              </div>
            </div>

            {/* Double Chance */}
            <div className="space-y-1">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Double Chance</span>
              <div className="flex gap-1.5">
                <Badge variant="outline" className={`text-[9px] ${markets.doubleChance.recommended ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border/30"}`}>
                  {markets.doubleChance.option}
                  {markets.doubleChance.recommended && " ⭐"}
                </Badge>
              </div>
            </div>

            {/* Combos */}
            {markets.combos.length > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Combo</span>
                <div className="flex gap-1.5 flex-wrap">
                  {markets.combos.map((c, i) => (
                    <Badge key={i} variant="outline" className={`text-[9px] ${c.recommended ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border/30"}`}>
                      {c.label} {c.recommended && "⭐"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Analysis text */}
          <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/10">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {prediction.analysis
                ? prediction.analysis.slice(0, 150) + (prediction.analysis.length > 150 ? "..." : "")
                : `AI model projects ${predictionLabel(prediction.prediction)} based on recent form and statistical trends.`}
            </p>
          </div>
        </div>

        {/* Community Side */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-accent/15">
                <Users className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs font-semibold text-accent">Community</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{community.totalVotes} votes</span>
          </div>
          <div className="space-y-2.5">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground">Home Win</span>
                </div>
                <span className="text-xs font-bold text-foreground">{community.home}%</span>
              </div>
              <Progress value={community.home} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <Minus className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Draw</span>
                </div>
                <span className="text-xs font-bold text-foreground">{community.draw}%</span>
              </div>
              <Progress value={community.draw} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-accent" />
                  <span className="text-[10px] text-muted-foreground">Away Win</span>
                </div>
                <span className="text-xs font-bold text-foreground">{community.away}%</span>
              </div>
              <Progress value={community.away} className="h-2" />
            </div>
          </div>

          {/* Voting / CTA section */}
          {isFree ? (
            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40 text-center space-y-1.5">
              <Lock className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              <p className="text-[10px] font-semibold text-foreground">Challenge the AI</p>
              <p className="text-[9px] text-muted-foreground/70 leading-relaxed">Earn points for correct predictions, track your accuracy, and unlock a free Pro month.</p>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1">
                <Sparkles className="h-3 w-3" /> Get Pro Access
              </Button>
            </div>
          ) : limitReached && !userPick ? (
            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40 text-center space-y-1.5">
              <Info className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              <p className="text-[10px] font-semibold text-foreground">Daily Limit Reached</p>
              <p className="text-[9px] text-muted-foreground/70 leading-relaxed">
                You've used {dailyUsed}/{dailyLimit} predictions today.
                {userTier === "pro" && " Upgrade to Premium for 10 daily predictions."}
              </p>
              {userTier === "pro" && (
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1">
                  <Crown className="h-3 w-3" /> Get Premium
                </Button>
              )}
            </div>
          ) : isLocked ? (
            /* Prediction already confirmed & saved — show user's market + selection */
            (() => {
              // Derive market label from user pick
              const marketLabel = ["Home", "Draw", "Away"].includes(userPick!)
                ? "Match Result"
                : userPick!.startsWith("GG") || userPick!.startsWith("NG")
                ? "Both Teams to Score"
                : "Goals";

              // Check if AI prediction aligns with user pick
              const aiPickMapped = prediction.prediction === "1" ? "Home" : prediction.prediction === "X" ? "Draw" : prediction.prediction === "2" ? "Away" : prediction.prediction;
              const aiAgreesWithUser = userPick === aiPickMapped;

              return (
                <div className={`p-3 rounded-lg border space-y-2.5 ${
                  userStatus === "won" ? "bg-success/10 border-success/30" :
                  userStatus === "lost" ? "bg-destructive/10 border-destructive/30" :
                  "bg-primary/5 border-primary/20"
                }`}>
                  {/* Status icon + headline */}
                  <div className="flex items-center gap-2">
                    {userStatus === "won" ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : userStatus === "lost" ? (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <p className={`text-[10px] font-semibold ${
                      userStatus === "won" ? "text-success" :
                      userStatus === "lost" ? "text-destructive" :
                      "text-primary"
                    }`}>
                      {userStatus === "won" ? "You predicted correctly! +1 Point 🎉" :
                       userStatus === "lost" ? "Your prediction was incorrect" :
                       "Prediction locked"}
                    </p>
                  </div>

                  {/* User's market & selection */}
                  <div className="space-y-1 pl-6">
                    <p className="text-[9px] text-muted-foreground">You have predicted:</p>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] text-foreground">
                        <span className="text-muted-foreground">Market:</span>{" "}
                        <span className="font-semibold">{marketLabel}</span>
                      </p>
                      <p className="text-[10px] text-foreground">
                        <span className="text-muted-foreground">Selection:</span>{" "}
                        <span className="font-semibold">{userPick}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <Badge className={`text-[9px] ${
                    userStatus === "won" ? "bg-success/15 text-success border-success/30" :
                    userStatus === "lost" ? "bg-destructive/15 text-destructive border-destructive/30" :
                    "bg-primary/15 text-primary border-primary/30"
                  }`}>
                    {userStatus === "won" ? "WIN" : userStatus === "lost" ? "LOSS" : "PENDING"}
                  </Badge>

                  {/* AI agreement badge */}
                  {userStatus !== "won" && userStatus !== "lost" && (
                    <div className="pt-0.5">
                      {aiAgreesWithUser ? (
                        <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 gap-1">
                          <Bot className="h-3 w-3" /> AI agrees with your prediction
                        </Badge>
                      ) : (
                        <Badge className="text-[9px] bg-accent/10 text-accent border-accent/20 gap-1">
                          <Swords className="h-3 w-3" /> You challenged the AI
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Evaluation note for pending */}
                  {userStatus !== "won" && userStatus !== "lost" && (
                    <p className="text-[8px] text-muted-foreground/60 italic">
                      Result will be evaluated after full-time.
                    </p>
                  )}
                </div>
              );
            })()
          ) : isKickedOff ? (
            /* Match already started — too late to predict, but comments stay open */
            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40 text-center space-y-1.5">
              <Clock className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              <p className="text-[10px] font-semibold text-foreground">Predictions Locked</p>
              <p className="text-[9px] text-muted-foreground/70 leading-relaxed">Predictions are locked for this match. You can still leave a comment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground font-medium">Your Prediction</p>
                <span className="text-[8px] text-muted-foreground/60 italic">{dailyUsed}/{dailyLimit} used today</span>
              </div>

              {/* All prediction options — radio-group behavior via pendingPick */}
              {/* Match Result 1X2 */}
              <div className="space-y-1">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Match Result</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["Home", "Draw", "Away"] as const).map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant={pendingPick === option ? "default" : "outline"}
                      className={cn(
                        "h-7 text-[10px] transition-all",
                        pendingPick === option && "bg-primary text-primary-foreground ring-2 ring-primary/40 shadow-[0_0_8px_rgba(15,155,142,0.3)]",
                        pendingPick && pendingPick !== option && "opacity-60"
                      )}
                      onClick={() => !isKickedOff && setPendingPick(pendingPick === option ? null : option)}
                      disabled={matchFinished || isKickedOff || submitting}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              {/* BTTS */}
              <div className="space-y-1">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Both Teams to Score</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["GG (Yes)", "NG (No)"] as const).map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant={pendingPick === option ? "default" : "outline"}
                      className={cn(
                        "h-7 text-[10px] transition-all",
                        pendingPick === option && "bg-primary text-primary-foreground ring-2 ring-primary/40 shadow-[0_0_8px_rgba(15,155,142,0.3)]",
                        pendingPick && pendingPick !== option && "opacity-60"
                      )}
                      onClick={() => !isKickedOff && setPendingPick(pendingPick === option ? null : option)}
                      disabled={matchFinished || isKickedOff || submitting}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Goals */}
              <div className="space-y-1">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Goals</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["Over 2.5", "Under 2.5", "Over 1.5", "Under 3.5"] as const).map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant={pendingPick === option ? "default" : "outline"}
                      className={cn(
                        "h-7 text-[10px] transition-all",
                        pendingPick === option && "bg-primary text-primary-foreground ring-2 ring-primary/40 shadow-[0_0_8px_rgba(15,155,142,0.3)]",
                        pendingPick && pendingPick !== option && "opacity-60"
                      )}
                      onClick={() => !isKickedOff && setPendingPick(pendingPick === option ? null : option)}
                      disabled={matchFinished || isKickedOff || submitting}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Confirm Prediction button — only visible when a pick is pending */}
              {pendingPick && (
                <Button
                  className="w-full h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_12px_rgba(15,155,142,0.3)]"
                  onClick={async () => {
                    if (canPick && pendingPick) {
                      await submitPick(pendingPick);
                      onPredictionMade?.();
                      setPendingPick(null);
                    }
                  }}
                  disabled={submitting || !canPick}
                >
                  {submitting ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Confirming...</>
                  ) : (
                    <><CheckCircle2 className="h-3 w-3" /> Confirm Prediction: {pendingPick}</>
                  )}
                </Button>
              )}

              {userTier === "exclusive" && (
                <div className="flex gap-1.5 flex-wrap items-center">
                  <Badge className="text-[9px] bg-accent/15 text-accent border-accent/30 gap-0.5">
                    <Crown className="h-2.5 w-2.5" />
                    {prediction.prediction === communityPick ? "AI agrees with this user" : "User challenges the AI"}
                  </Badge>
                </div>
              )}
              <div className="flex gap-1.5 flex-wrap">
                <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30">🔵 Pro Pick: {predictionLabel(communityPick)}</Badge>
                {userTier === "exclusive" && (
                  <Badge className="text-[9px] bg-accent/15 text-accent border-accent/30 gap-0.5">
                    <Crown className="h-2.5 w-2.5" /> Exclusive
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User-centric result / Points feedback row */}
      {matchFinished && userPick && userResult && (
        <div className="px-4 py-2.5 border-t border-border/30 bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {userResult === "won" ? (
              <Badge className="text-[10px] bg-success/15 text-success border-success/30 gap-1">
                <CheckCircle2 className="h-3 w-3" /> WIN
              </Badge>
            ) : (
              <Badge className="text-[10px] bg-destructive/15 text-destructive border-destructive/30 gap-1">
                <XCircle className="h-3 w-3" /> LOSS
              </Badge>
            )}
          </div>
          <span className={`text-[10px] font-semibold ${userResult === "won" ? "text-success" : "text-muted-foreground"}`}>
            {userResult === "won" ? "You predicted this correctly • +1 Point" : "Your prediction was not correct"}
          </span>
        </div>
      )}

      {/* Match finished but user didn't pick */}
      {matchFinished && !userPick && (
        <div className="px-4 py-2 border-t border-border/30 bg-muted/5 flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50 gap-1">
            <Clock className="h-3 w-3" /> FINISHED
          </Badge>
          <span className="text-[9px] text-muted-foreground/60">No prediction made</span>
        </div>
      )}

      {/* Pending - locked prediction */}
      {!matchFinished && isLocked && (
        <div className="px-4 py-2 border-t border-border/30 bg-primary/5 flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] text-primary border-primary/30 gap-1">
            <Lock className="h-3 w-3" /> LOCKED: {userPick}
          </Badge>
          <span className="text-[9px] text-muted-foreground/60">Points awarded after full-time</span>
        </div>
      )}

      {/* Pending - no pick yet */}
      {!matchFinished && !isLocked && (
        <div className="px-4 py-2 border-t border-border/30 bg-muted/5 flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50 gap-1">
            <Clock className="h-3 w-3" /> PENDING
          </Badge>
          <span className="text-[9px] text-muted-foreground/60">
            {pendingPick ? "Confirm your selection above" : "Make your prediction above"}
          </span>
        </div>
      )}

      {/* Individual results disclaimer */}
      <div className="px-4 py-1.5 border-t border-border/20 bg-muted/5 flex items-center gap-1.5">
        <Info className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
        <span className="text-[8px] text-muted-foreground/50">Points are awarded based on your own prediction. Other users may see a different result for the same match.</span>
      </div>

      <div className="border-t border-border/30">
        <button
          onClick={() => setShowComments(!showComments)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          Leave your AI prediction comment
          {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {showComments && (
          <CommentsSection matchId={prediction.id} userTier={userTier} aiPrediction={predictionLabel(prediction.prediction)} />
        )}
      </div>
    </Card>
  );
}
