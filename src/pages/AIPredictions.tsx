import { useState } from "react";
import { Brain, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const { predictions, loading } = useAIPredictions(day);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">AI Predictions</h1>
            </div>
            <p className="text-muted-foreground text-sm">AI-powered predictions for upcoming matches</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/30">AI Powered</Badge>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* TABS */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setDay("today")} className={day === "today" ? "bg-primary" : "bg-muted"}>
            Today
          </Button>
          <Button onClick={() => setDay("tomorrow")} className={day === "tomorrow" ? "bg-primary" : "bg-muted"}>
            Tomorrow
          </Button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <Card className="p-10 text-center text-muted-foreground">Loading AI predictions…</Card>
        ) : predictions.length === 0 ? (
          <Card className="p-10 text-center">No matches available</Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((p) => (
              <AIPredictionCard key={p.id} prediction={p} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
