import { Trophy, Flame, Target, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function GamificationPanel() {
  const stats = { accuracy: 72, streak: 5, monthlyWins: 67, monthlyGoal: 100 };

  const milestones = [
    { wins: 20, label: "Analyst", reached: true, icon: "🏅" },
    { wins: 50, label: "Expert", reached: true, icon: "🎯" },
    { wins: 100, label: "Free Pro Month", reached: false, icon: "🎁" },
  ];

  return (
    <Card className="p-4 bg-card border-border/50 space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Your Arena Stats</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
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
          <Award className="h-4 w-4 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold text-foreground">{stats.monthlyWins}</p>
          <p className="text-[9px] text-muted-foreground">Monthly Wins</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Monthly Progress</span>
          <span className="text-foreground font-medium">{stats.monthlyWins} / {stats.monthlyGoal}</span>
        </div>
        <Progress value={(stats.monthlyWins / stats.monthlyGoal) * 100} className="h-2.5" />
      </div>

      <div className="space-y-2">
        <span className="text-[10px] text-muted-foreground font-medium">Reward Milestones</span>
        <div className="flex gap-2 flex-wrap">
          {milestones.map((m) => (
            <Badge
              key={m.wins}
              variant="outline"
              className={`text-[9px] gap-1 ${m.reached ? "bg-success/10 text-success border-success/30" : "bg-muted/30 text-muted-foreground border-border/50"}`}
            >
              {m.icon} {m.wins}W – {m.label}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
