import { Trophy, Flame, Target, Brain, Crown, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useArenaStats } from "@/hooks/useArenaStats";
import { Loader2 } from "lucide-react";

export function GamificationPanel() {
  const stats = useArenaStats();

  const monthlyGoal = 1000;
  const pointsLeft = monthlyGoal - stats.points;
  const progressPercent = Math.min((stats.points / monthlyGoal) * 100, 100);

  const milestones = [
    { wins: 500, label: "Analyst", reached: stats.points >= 500, Icon: Target, tooltip: "500 correct predictions – Analyst badge earned!" },
    { wins: 850, label: "Expert", reached: stats.points >= 850, Icon: Brain, tooltip: "850 correct predictions – Expert status achieved!" },
    { wins: 1000, label: "Free Pro Month", reached: stats.points >= 1000, Icon: Crown, tooltip: "1000 Wins in a Month → Free Pro Access (30 days)" },
  ];

  if (stats.loading) {
    return (
      <Card className="p-4 bg-card border-border/50 flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="p-4 bg-card border-border/50 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Your Arena Stats</h3>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2.5 bg-muted/20 rounded-lg">
            <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">
              {stats.wins + stats.losses > 0
                ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
                : 0}%
            </p>
            <p className="text-[9px] text-muted-foreground">Accuracy</p>
          </div>
          <div className="text-center p-2.5 bg-muted/20 rounded-lg">
            <Flame className="h-4 w-4 mx-auto mb-1 text-destructive" />
            <p className="text-lg font-bold text-foreground">{stats.currentStreak}</p>
            <p className="text-[9px] text-muted-foreground">Win Streak</p>
          </div>
          <div className="text-center p-2.5 bg-muted/20 rounded-lg">
            <Trophy className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">{stats.wins}</p>
            <p className="text-[9px] text-muted-foreground">Monthly Wins</p>
          </div>
          <div className="text-center p-2.5 rounded-lg relative bg-amber-500/10 border border-amber-400/20 shadow-[0_0_12px_rgba(251,191,36,0.1)]">
            <div className="flex items-center justify-center gap-0.5 mb-1">
              <span className="text-sm">💎</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-2.5 w-2.5 text-amber-400/50 cursor-help" />
                </TooltipTrigger>
                 <TooltipContent side="top" className="max-w-[220px] text-[10px]">
                   <p>Points reset to 0 after reaching 1000. Each correct prediction earns 1 point. Reach 1000 to unlock 1 free Pro month.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-bold text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]">{stats.points}</p>
            <p className="text-[9px] text-amber-400/70 font-medium">Points</p>
          </div>
        </div>

        {/* Reward reached banner */}
        {stats.points >= 1000 && !stats.rewardGranted && (
          <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-400/30 text-center space-y-1">
            <Crown className="h-5 w-5 mx-auto text-amber-400" />
            <p className="text-xs font-semibold text-amber-400">🎉 You've reached 1000 points!</p>
            <p className="text-[9px] text-muted-foreground">Your free Pro month reward will be applied soon.</p>
          </div>
        )}

        {stats.rewardGranted && (
          <div className="p-2.5 rounded-lg bg-success/10 border border-success/30 text-center">
            <p className="text-[10px] text-success font-medium">✅ Free Pro month reward granted this season!</p>
          </div>
        )}

        {/* Monthly Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Monthly Progress</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                 <TooltipContent side="top" className="max-w-[220px] text-[10px]">
                   <p>🏆 Points reset to 0 after reaching 1000. Each correct prediction earns 1 point. Incorrect = 0 points. Reach 1000 to unlock a free Pro month.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-foreground font-medium">{stats.points} / {monthlyGoal}</span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
          {pointsLeft > 0 && (
            <p className="text-[9px] text-amber-400/80 font-medium leading-relaxed">
              🔥 {pointsLeft} points left to unlock a free Pro month!
            </p>
          )}
          <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
            Points reset to 0 after reaching 1000. Each correct prediction earns 1 point.
          </p>
        </div>

        {/* Reward Milestones */}
        <div className="space-y-2">
          <span className="text-[10px] text-muted-foreground font-medium">Reward Milestones</span>
          <div className="flex gap-2 flex-wrap">
            {milestones.map((m) => (
              <Tooltip key={m.wins}>
                <TooltipTrigger asChild>
                  <div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] gap-1 cursor-help ${
                        m.reached
                          ? "bg-success/10 text-success border-success/30"
                          : "bg-muted/30 text-muted-foreground border-border/50"
                      }`}
                    >
                      <m.Icon className="h-3 w-3" />
                      {m.wins}W – {m.label}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px] max-w-[200px]">
                  <p>{m.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground/60">
            Points reset to 0 after you reach 1000 and claim your reward. Only your own correct predictions count.
          </p>
        </div>
      </Card>
    </TooltipProvider>
  );
}
