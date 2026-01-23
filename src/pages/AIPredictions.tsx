import { Brain, Activity } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { Card } from "@/components/ui/card";

export default function AIPredictions() {
  const { predictions, loading } = useAIPredictions();

  const today = predictions.filter((p) => p.matchDate === "Today");
  const tomorrow = predictions.filter((p) => p.matchDate === "Tomorrow");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <div className="flex items-center gap-3">
            <Brain className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">AI Predictions</h1>
          </div>
          <p className="text-muted-foreground mt-1">AI predictions for today & tomorrow matches</p>
        </div>

        {/* TODAY */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Today</h2>
          </div>

          {loading ? (
            <Card className="p-6 text-center">Loading...</Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {today.map((p) => (
                <AIPredictionCard key={p.id} prediction={p} />
              ))}
            </div>
          )}
        </section>

        {/* TOMORROW */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Tomorrow</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tomorrow.map((p) => (
              <AIPredictionCard key={p.id} prediction={p} />
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
