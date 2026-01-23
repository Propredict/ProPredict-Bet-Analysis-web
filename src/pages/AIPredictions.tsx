import { useEffect, useState } from "react";
import { Brain, RefreshCw, Sparkles, Activity, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/lib/supabase";

/* =========================
   TYPES
========================= */

interface AIPredictionRow {
  id: string;
  match_id: string;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  match_time: string;
}

/* =========================
   PAGE
========================= */

export default function AIPredictions() {
  const [matches, setMatches] = useState<AIPredictionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    setLoading(true);

    const { data, error } = await supabase.from("ai_predictions").select("*").order("match_time", { ascending: true });

    if (!error && data) {
      setMatches(data);
    } else {
      console.error("Failed to load AI predictions", error);
    }

    setLoading(false);
  };

  const handleUnlock = (id: string) => {
    alert("Watch ad flow here 🔒➡️🔓");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Brain className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold">AI Predictions</h1>
            </div>
            <p className="text-muted-foreground mt-1">AI-powered predictions for today's matches</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchPredictions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <Activity className="h-5 w-5 mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Today's Predictions</p>
            <p className="text-2xl font-bold">{matches.length}</p>
          </Card>
        </div>

        {/* Predictions */}
        {loading ? (
          <Card className="p-10 text-center">Loading...</Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((m) => (
              <Card key={m.id} className="relative p-4 overflow-hidden">
                {/* MATCH INFO – ALWAYS VISIBLE */}
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground">{m.league}</p>
                  <p className="font-semibold text-lg">
                    {m.home_team} <span className="text-muted-foreground">vs</span> {m.away_team}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.match_date} • {m.match_time}
                  </p>
                </div>

                {/* LOCKED AI CONTENT */}
                <div className="relative">
                  <div className="blur-sm pointer-events-none space-y-2">
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>

                  {/* OVERLAY */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                    <Lock className="h-6 w-6 mb-2 text-primary" />
                    <p className="font-semibold mb-2">Watch ad to unlock</p>
                    <Button size="sm" onClick={() => handleUnlock(m.id)}>
                      Unlock Prediction
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
