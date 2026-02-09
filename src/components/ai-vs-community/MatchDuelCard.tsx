import { Bot, Users, TrendingUp, Minus, TrendingDown, MessageSquare, ChevronDown, ChevronUp, Lock, Sparkles, CheckCircle2, XCircle, Clock, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CommentsSection } from "./CommentsSection";
import type { AIPrediction } from "@/hooks/useAIPredictions";

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
}

export function MatchDuelCard({ prediction, userTier }: MatchDuelCardProps) {
  const [showComments, setShowComments] = useState(false);
  const community = useMemo(() => generateCommunityVotes(prediction), [prediction]);

  const communityPick = community.home > community.draw && community.home > community.away ? "1"
    : community.away > community.draw && community.away > community.home ? "2" : "X";
  const aiAgreesWithCommunity = prediction.prediction === communityPick;

  // Mock result status based on prediction's result_status field
  const resultStatus = prediction.result_status as "won" | "lost" | null;

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
          {userTier === "free" ? (
            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40 text-center space-y-1.5">
              <Lock className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">Upgrade to Pro to challenge the AI</p>
              <p className="text-[9px] text-muted-foreground/70">Earn points, track your accuracy, and unlock free Pro access.</p>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1">
                <Sparkles className="h-3 w-3" /> Get Pro Access
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium">Your Prediction:</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["Home", "Draw", "Away"] as const).map((option) => (
                  <Button key={option} size="sm" variant="outline" className="h-7 text-[10px]">
                    {option}
                  </Button>
                ))}
              </div>
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

      {/* Result badge row (shown when match is resolved) */}
      {resultStatus && (
        <div className="px-4 py-2.5 border-t border-border/30 bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {resultStatus === "won" ? (
              <Badge className="text-[10px] bg-success/15 text-success border-success/30 gap-1">
                <CheckCircle2 className="h-3 w-3" /> WIN
              </Badge>
            ) : (
              <Badge className="text-[10px] bg-destructive/15 text-destructive border-destructive/30 gap-1">
                <XCircle className="h-3 w-3" /> LOSS
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">Result: FT</span>
          </div>
          {resultStatus === "won" && (
            <span className="text-[10px] font-semibold text-success">Points earned: +1</span>
          )}
        </div>
      )}

      {/* Pending badge for unresolved matches */}
      {!resultStatus && (
        <div className="px-4 py-2 border-t border-border/30 bg-muted/5 flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50 gap-1">
            <Clock className="h-3 w-3" /> PENDING
          </Badge>
        </div>
      )}

      <div className="border-t border-border/30">
        <button
          onClick={() => setShowComments(!showComments)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          Discussion
          {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {showComments && (
          <CommentsSection matchId={prediction.id} userTier={userTier} aiPrediction={predictionLabel(prediction.prediction)} />
        )}
      </div>
    </Card>
  );
}
