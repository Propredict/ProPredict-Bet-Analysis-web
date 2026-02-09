import { Trophy, Flame, Target, Brain, Crown, Info, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GamificationPanel() {
  const stats = { accuracy: 72, streak: 5, monthlyWins: 67, monthlyGoal: 100 };

  const milestones = [
    { wins: 20, label: "Analyst", reached: true, Icon: Target, tooltip: "20 correct predictions – Analyst badge earned!" },
    { wins: 50, label: "Expert", reached: true, Icon: Brain, tooltip: "50 correct predictions – Expert status achieved!" },
    { wins: 100, label: "Free Pro Month", reached: false, Icon: Crown, tooltip: "100 Wins in a Month → Free Pro Access (30 days)" },
  ];

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
            <p className="text-lg font-bold text-foreground">{stats.accuracy}%</p>
            <p className="text-[9px] text-muted-foreground">Accuracy</p>
          </div>
          <div className="text-center p-2.5 bg-muted/20 rounded-lg">
            <Flame className="h-4 w-4 mx-auto mb-1 text-destructive" />
            <p className="text-lg font-bold text-foreground">{stats.streak}</p>
            <p className="text-[9px] text-muted-foreground">Win Streak</p>
          </div>
          <div className="text-center p-2.5 bg-muted/20 rounded-lg">
            <Trophy className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">{stats.monthlyWins}</p>
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
                   <p>Points reset every month. Each correct prediction earns 1 point. Reach 100 to unlock 1 free Pro month.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-bold text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]">{stats.monthlyWins}</p>
            <p className="text-[9px] text-amber-400/70 font-medium">Points</p>
          </div>
        </div>

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
                   <p>🏆 Points reset every month. Each correct prediction earns 1 point. Incorrect = 0 points. Based only on your own prediction.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-foreground font-medium">{stats.monthlyWins} / {stats.monthlyGoal}</span>
          </div>
          <Progress value={(stats.monthlyWins / stats.monthlyGoal) * 100} className="h-2.5" />
          <p className="text-[9px] text-amber-400/80 font-medium leading-relaxed">
            🔥 {stats.monthlyGoal - stats.monthlyWins} points left to unlock a free Pro month!
          </p>
          <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
            Points reset every month. Each correct prediction earns 1 point.
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
            All users start each month at 0 points. Only your own correct predictions count toward rewards.
          </p>
        </div>
      </Card>
    </TooltipProvider>
  );
}
