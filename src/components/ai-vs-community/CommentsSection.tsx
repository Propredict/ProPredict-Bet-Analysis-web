import { ThumbsUp, ThumbsDown, Pin, Crown, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface Comment {
  id: string;
  user: string;
  tier: "free" | "pro" | "exclusive" | "ai";
  text: string;
  upvotes: number;
  downvotes: number;
  pinned: boolean;
}

interface CommentsSectionProps {
  matchId: string;
  userTier: "free" | "pro" | "exclusive";
  aiPrediction: string;
}

export function CommentsSection({ matchId, userTier, aiPrediction }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");

  const comments: Comment[] = [
    {
      id: "ai-auto",
      user: "AI Model",
      tier: "ai",
      text: `Based on statistical analysis, I project ${aiPrediction}. Key factors include recent form trends and historical performance metrics.`,
      upvotes: 24,
      downvotes: 3,
      pinned: true,
    },
    {
      id: "c1",
      user: "ProAnalyst",
      tier: "exclusive",
      text: "I agree with the AI here. The home side has been dominant in recent fixtures.",
      upvotes: 12,
      downvotes: 1,
      pinned: true,
    },
    {
      id: "c2",
      user: "MatchFan99",
      tier: "pro",
      text: "Interesting analysis. I think the away team has a real chance here though.",
      upvotes: 8,
      downvotes: 2,
      pinned: false,
    },
  ];

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "ai":
        return <Badge className="text-[8px] bg-primary/15 text-primary border-primary/30">🤖 AI</Badge>;
      case "exclusive":
        return <Badge className="text-[8px] bg-accent/15 text-accent border-accent/30"><Crown className="h-2.5 w-2.5 mr-0.5" />Exclusive</Badge>;
      case "pro":
        return <Badge className="text-[8px] bg-primary/15 text-primary border-primary/30"><Star className="h-2.5 w-2.5 mr-0.5" />Pro</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="px-4 pb-4 space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className={`p-3 rounded-lg border ${comment.pinned ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border/30"}`}>
          <div className="flex items-center gap-2 mb-1.5">
            {comment.pinned && <Pin className="h-3 w-3 text-primary" />}
            <span className="text-[11px] font-semibold text-foreground">{comment.user}</span>
            {getTierBadge(comment.tier)}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{comment.text}</p>
          {userTier !== "free" && (
            <div className="flex items-center gap-3 mt-2">
              <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-success transition-colors">
                <ThumbsUp className="h-3 w-3" /> {comment.upvotes}
              </button>
              <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                <ThumbsDown className="h-3 w-3" /> {comment.downvotes}
              </button>
            </div>
          )}
        </div>
      ))}

      {userTier !== "free" ? (
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="What do you think about this AI prediction?"
            className="text-xs min-h-[60px] resize-none"
          />
          <Button size="sm" className="text-xs h-7" disabled={!newComment.trim()}>
            Post Comment
          </Button>
        </div>
      ) : (
        <p className="text-center text-[10px] text-muted-foreground py-2">
          Upgrade to Pro to join the discussion
        </p>
      )}
    </div>
  );
}
