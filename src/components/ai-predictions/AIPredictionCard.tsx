import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AIPrediction } from "./types";

export function AIPredictionCard({ prediction }: { prediction: AIPrediction }) {
  const [open, setOpen] = useState(false);

  const riskColor = {
    low: "text-success bg-success/20 border-success/30",
    medium: "text-warning bg-warning/20 border-warning/30",
    high: "text-destructive bg-destructive/20 border-destructive/30",
  }[prediction.riskLevel];

  const riskIcon = {
    low: <TrendingUp className="h-3 w-3" />,
    medium: <Target className="h-3 w-3" />,
    high: <AlertTriangle className="h-3 w-3" />,
  }[prediction.riskLevel];

  return (
    <Card className="overflow-hidden border-border hover:border-primary/30 transition">
      {/* HEADER */}
      <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{prediction.league}</span>
        <Badge variant="outline">
          {prediction.matchDate} • {prediction.matchTime}
        </Badge>
      </div>

      {/* TEAMS */}
      <div className="p-4 text-center">
        <p className="font-semibold">{prediction.homeTeam}</p>
        <span className="text-xs text-muted-foreground">VS</span>
        <p className="font-semibold">{prediction.awayTeam}</p>
      </div>

      {/* AI DATA */}
      <div className="p-4 space-y-3">
        {[
          { l: "1", v: prediction.homeWinProbability },
          { l: "X", v: prediction.drawProbability },
          { l: "2", v: prediction.awayWinProbability },
        ].map((i) => (
          <div key={i.l} className="flex items-center gap-2">
            <span className="w-6 text-xs">{i.l}</span>
            <div className="flex-1 h-2 bg-muted rounded-full">
              <div className="h-full bg-primary" style={{ width: `${i.v}%` }} />
            </div>
            <span className="w-10 text-xs text-right">{i.v}%</span>
          </div>
        ))}

        <div className="grid grid-cols-4 gap-2 bg-muted/50 p-3 rounded-lg">
          <div className="text-center">
            <p className="text-xs">Outcome</p>
            <Badge variant="outline">{prediction.predictedOutcome}</Badge>
          </div>
          <div className="text-center">
            <p className="text-xs">Score</p>
            <p className="font-bold">{prediction.predictedScore}</p>
          </div>
          <div className="text-center">
            <p className="text-xs">Conf</p>
            <p className="font-bold text-primary">{prediction.confidence}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs">Risk</p>
            <Badge className={cn("text-xs", riskColor)}>
              {riskIcon}
              <span className="ml-1 capitalize">{prediction.riskLevel}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* ANALYSIS */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2 flex justify-between text-sm text-muted-foreground hover:bg-muted/40"
      >
        <span className="flex gap-2 items-center">
          <Brain className="h-4 w-4 text-primary" /> AI Analysis
        </span>
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>

      {open && (
        <div className="p-4 text-sm text-muted-foreground">
          <p className="mb-2">{prediction.analysis}</p>
          <div className="flex gap-2 flex-wrap">
            {prediction.keyFactors.map((f, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" /> {f}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
