import { Bot, Users, TrendingUp, Minus, TrendingDown, MessageSquare, ChevronDown, ChevronUp, Lock, Sparkles, CheckCircle2, XCircle, Clock, Crown, Goal, Info, Loader2, AlertTriangle, Flame } from "lucide-react";
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
import { Swords } from "lucide-react";

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
  onViewMyPredictions?: () => void;
}

export function MatchDuelCard({ prediction, userTier, seasonId, dailyUsed, dailyLimit, onPredictionMade, onViewMyPredictions }: MatchDuelCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [pendingPick, setPendingPick] = useState<string | null>(null);
  const matchTimestamp = useMemo(() => {
    if (!prediction.match_date || !prediction.match_time) return null;
    return `${prediction.match_date}T${prediction.match_time}:00`;
  }, [prediction.match_date, prediction.match_time]);
  const { userPick, userStatus, userMarketLabel, submitPick, submitting, canPick, isKickedOff, isFree, limitReached } = useArenaPrediction(
    prediction.match_id, seasonId, matchTimestamp,
    { dailyUsed, dailyLimit, tier: userTier }
  );
  const isLocked = !!userPick;

  useEffect(() => {
    if (userPick) setPendingPick(null);
  }, [userPick]);

  const community = useMemo(() => generateCommunityVotes(prediction), [prediction]);
  const markets = useMemo(() => deriveMarkets(prediction), [prediction]);

  const communityPick = community.home > community.draw && community.home > community.away ? "1"
    : community.away > community.draw && community.away > community.home ? "2" : "X";
  const aiAgreesWithCommunity = prediction.prediction === communityPick;

  const rawStatus = prediction.result_status as "won" | "lost" | null;
  const matchFinished = rawStatus === "won" || rawStatus === "lost";

  const actualOutcome = useMemo(() => {
    if (!matchFinished) return null;
    if (rawStatus === "won") return prediction.prediction;
    const probs = { "1": prediction.home_win, "X": prediction.draw, "2": prediction.away_win };
    const remaining = Object.entries(probs).filter(([k]) => k !== prediction.prediction);
    remaining.sort((a, b) => b[1] - a[1]);
    return remaining[0]?.[0] || null;
  }, [matchFinished, rawStatus, prediction]);

  const userResult: "won" | "lost" | null = useMemo(() => {
    if (!matchFinished || !userPick || !actualOutcome) return null;
    const pickMap: Record<string, string> = { "Home": "1", "Draw": "X", "Away": "2" };
    const userCode = pickMap[userPick] || userPick;
    return userCode === actualOutcome ? "won" : "lost";
  }, [matchFinished, userPick, actualOutcome]);

  const aiPickMapped = prediction.prediction === "1" ? "Home" : prediction.prediction === "X" ? "Draw" : prediction.prediction === "2" ? "Away" : prediction.prediction;
  const aiAgreesWithUser = userPick === aiPickMapped;

  // AI and community pick labels
  const aiPickLabel = predictionLabel(prediction.prediction);
  const communityPickLabel = predictionLabel(communityPick);

  return (
    <Card className="overflow-hidden border-border/50 bg-card">
      {/* Header: League + Match info */}
      <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] bg-muted/50 border-border/50">
            {prediction.league || "Unknown League"}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{prediction.match_time}</span>
            <span className="text-[10px] text-muted-foreground/60">
              {community.totalVotes} votes
            </span>
          </div>
        </div>
        <h3 className="font-bold text-sm mt-2 text-foreground">
          {prediction.home_team} vs {prediction.away_team}
        </h3>
      </div>

      {/* === AI vs Members Duel Section === */}
      <div className="px-4 py-4">
        {/* 3-column: AI | VS | Members */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* AI Side */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] font-bold text-primary">🤖 AI</span>
            <span className="text-sm font-extrabold text-foreground">{prediction.confidence}%</span>
            <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30">
              {aiPickLabel}
            </Badge>
          </div>

          {/* VS Center */}
          <div className="flex flex-col items-center shrink-0 gap-0.5">
            <span className="text-lg font-black text-muted-foreground/60 drop-shadow-[0_0_8px_rgba(15,155,142,0.3)]">VS</span>
          </div>

          {/* Members Side */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <span className="text-[10px] font-bold text-accent">👥 Members</span>
            <span className="text-sm font-extrabold text-foreground">
              {Math.max(community.home, community.draw, community.away)}%
            </span>
            <Badge className="text-[9px] bg-accent/15 text-accent border-accent/30">
              {communityPickLabel}
            </Badge>
          </div>
        </div>

        {/* Disagreement drama badge */}
        {!aiAgreesWithCommunity && (
          <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[10px] font-semibold text-destructive">
              ⚠️ Users disagree with AI
            </span>
          </div>
        )}
        {aiAgreesWithCommunity && (
          <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-success/10 border border-success/20 mb-3">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="text-[10px] font-semibold text-success">
              ✅ AI and Members agree
            </span>
          </div>
        )}

        {/* Community vote bars */}
        <div className="space-y-2 mb-4">
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
      </div>

      {/* AI Markets Collapsible */}
      <div className="px-4 pb-3">
        <details className="group">
          <summary className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors list-none">
            <Goal className="h-3 w-3" />
            AI Market Predictions
            <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-2 p-2.5 bg-muted/20 rounded-lg border border-border/30 space-y-2.5">
            {/* BTTS */}
            <div className="space-y-1">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Both Teams to Score</span>
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`flex items-center justify-between px-2 py-1.5 rounded border ${markets.btts.gg.recommended ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/30"}`}>
                  <span className="text-[9px] text-foreground">GG (Both Score)</span>
                  {markets.btts.gg.recommended && <Badge className="text-[7px] px-1 py-0 bg-primary/20 text-primary border-primary/30">AI</Badge>}
                </div>
                <div className={`flex items-center justify-between px-2 py-1.5 rounded border ${markets.btts.ng.recommended ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/30"}`}>
                  <span className="text-[9px] text-foreground">NG (No Goal)</span>
                  {markets.btts.ng.recommended && <Badge className="text-[7px] px-1 py-0 bg-primary/20 text-primary border-primary/30">AI</Badge>}
                </div>
              </div>
            </div>

            {/* Goals */}
            <div className="space-y-1">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Goals</span>
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`flex flex-col items-center px-2 py-1.5 rounded border ${markets.goals.over25.recommended ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/30"}`}>
                  <span className="text-[9px] text-foreground">Over 2.5</span>
                  <span className={`text-[8px] ${markets.goals.over25.recommended ? "text-primary font-semibold" : "text-muted-foreground"}`}>{markets.goals.over25.value}</span>
                </div>
                <div className={`flex flex-col items-center px-2 py-1.5 rounded border ${!markets.goals.over25.recommended ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/30"}`}>
                  <span className="text-[9px] text-foreground">Under 2.5</span>
                  <span className={`text-[8px] ${!markets.goals.over25.recommended ? "text-primary font-semibold" : "text-muted-foreground"}`}>{markets.goals.over25.recommended ? "No" : "Yes"}</span>
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
        </details>
      </div>

      {/* Voting / User Prediction Section */}
      <div className="px-4 pb-4">
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
          (() => {
            const marketLabel = userMarketLabel || "Match Result";
            return (
              <div className={`p-3 rounded-lg border space-y-2.5 ${
                userStatus === "won" ? "bg-success/10 border-success/30" :
                userStatus === "lost" ? "bg-destructive/10 border-destructive/30" :
                "bg-primary/5 border-primary/20"
              }`}>
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
                    {userStatus === "won" ? "Correct prediction! +1 Point 🎉" :
                     userStatus === "lost" ? "Your prediction was incorrect" :
                     "Prediction locked"}
                  </p>
                </div>

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

                <Badge className={`text-[9px] ${
                  userStatus === "won" ? "bg-success/15 text-success border-success/30" :
                  userStatus === "lost" ? "bg-destructive/15 text-destructive border-destructive/30" :
                  "bg-primary/15 text-primary border-primary/30"
                }`}>
                  {userStatus === "won" ? "SUCCESS" : userStatus === "lost" ? "MISSED" : "PENDING"}
                </Badge>

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

                {userStatus !== "won" && userStatus !== "lost" && (
                  <p className="text-[8px] text-muted-foreground/60 italic">
                    Result will be evaluated after full-time.
                  </p>
                )}
              </div>
            );
          })()
        ) : isKickedOff ? (
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

            {/* Match Result */}
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
                {(["Over 2.5", "Under 2.5"] as const).map((option) => (
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

            {pendingPick && (
              <Button
                className="w-full h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_12px_rgba(15,155,142,0.3)]"
                onClick={async () => {
                  if (canPick && pendingPick) {
                    const saved = await submitPick(pendingPick);
                    if (saved) {
                      onPredictionMade?.();
                      setPendingPick(null);
                    }
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

            {!pendingPick && (
              <p className="text-[9px] text-muted-foreground/60 text-right italic">Make your prediction above</p>
            )}
          </div>
        )}
      </div>

      {/* Match finished results */}
      {matchFinished && userPick && userResult && (
        <div className="px-4 py-2.5 border-t border-border/30 bg-muted/10">
          <div className="flex items-center justify-between">
            {/* User result */}
            <div className="flex items-center gap-2">
              {userResult === "won" ? (
                <Badge className="text-[10px] bg-success/15 text-success border-success/30 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> You: ✅ Win
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-destructive/15 text-destructive border-destructive/30 gap-1">
                  <XCircle className="h-3 w-3" /> You: ❌ Lost
                </Badge>
              )}
            </div>
            {/* AI result */}
            <div className="flex items-center gap-2">
              {rawStatus === "won" ? (
                <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30 gap-1">
                  🤖 AI → ✅ Win
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-destructive/15 text-destructive border-destructive/30 gap-1">
                  🤖 AI → ❌ Lost
                </Badge>
              )}
            </div>
          </div>
          {userResult === "won" && rawStatus === "lost" && (
            <p className="text-[10px] text-success font-bold text-center mt-1.5">
              🔥 You beat AI!
            </p>
          )}
          {userResult === "won" && rawStatus === "won" && (
            <p className="text-[10px] text-primary font-semibold text-center mt-1.5">
              Both you and AI got it right! +1 Point
            </p>
          )}
        </div>
      )}

      {matchFinished && !userPick && (
        <div className="px-4 py-2 border-t border-border/30 bg-muted/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50 gap-1">
              <Clock className="h-3 w-3" /> FINISHED
            </Badge>
            {rawStatus === "won" ? (
              <span className="text-[9px] text-primary">🤖 AI → ✅ Win</span>
            ) : (
              <span className="text-[9px] text-destructive">🤖 AI → ❌ Lost</span>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground/60">No prediction made</span>
        </div>
      )}

      {!matchFinished && isLocked && (
        <div className="px-4 py-2 border-t border-border/30 bg-primary/5 flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] text-primary border-primary/30 gap-1">
            <Lock className="h-3 w-3" /> LOCKED: {userPick}
          </Badge>
          <button
            onClick={onViewMyPredictions}
            className="text-[9px] text-primary hover:text-primary/80 underline underline-offset-2 transition-colors flex items-center gap-1"
          >
            📊 View my prediction details
          </button>
        </div>
      )}

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

      <div className="px-4 py-1.5 border-t border-border/20 bg-muted/5 flex items-center gap-1.5">
        <Info className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
        <span className="text-[8px] text-muted-foreground/50">Points are awarded based on your own prediction.</span>
      </div>

      <div className="border-t border-border/30">
        <button
          onClick={() => setShowComments(!showComments)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] text-primary-foreground hover:text-primary-foreground/80 transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          Comment Below
          {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {showComments && (
          <CommentsSection matchId={prediction.id} userTier={userTier} aiPrediction={predictionLabel(prediction.prediction)} />
        )}
      </div>
    </Card>
  );
}
