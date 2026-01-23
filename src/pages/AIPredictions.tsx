import { useState } from "react";
import { Brain } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { Button } from "@/components/ui/button";

export default function AIPredictions() {
  const [tab, setTab] = useState<"today" | "tomorrow">("today");

  const { predictions, loading } = useAIPredictions(tab);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="text-primary" />
              <h1 className="text-2xl font-bold">AI Predictions</h1>
            </div>
            <p className="text-muted-foreground">AI predictions for today & tomorrow matches</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button variant={tab === "today" ? "default" : "outline"} onClick={() => setTab("today")}>
            Today
          </Button>
          <Button variant={tab === "tomorrow" ? "default" : "outline"} onClick={() => setTab("tomorrow")}>
            Tomorrow
          </Button>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-muted-foreground">Loading AI predictions…</p>
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
