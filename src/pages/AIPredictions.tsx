import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { supabase } from "@/lib/supabase";
import { Brain, Target, Activity, BarChart3, CheckCircle2, XCircle, Clock, TrendingUp, Sparkles, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function AIPredictionsPage() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const { predictions, loading } = useAIPredictions(day);

  // TEMP – later connect to user subscription
  const isPremiumUser = false;

  // AI ACCURACY STATS
  const [stats, setStats] = useState<{
    won: number;
    lost: number;
    pending: number;
  } | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      const { data } = await supabase.from("ai_prediction_stats").select("*").single();
      if (data) setStats(data);
    };
    loadStats();
  }, []);

  const accuracy = stats && stats.won + stats.lost > 0 
    ? Math.round((stats.won / (stats.won + stats.lost)) * 100) 
    : 0;

  const liveCount = predictions.filter(p => p.is_live).length;
  const streak = 0; // Can be calculated from stats if needed

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Predictions</h1>
              <p className="text-muted-foreground text-sm">AI-powered match analysis and predictions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search team or league..." 
                className="pl-9 w-[200px] bg-muted/50 border-border"
              />
            </div>
            <Badge className="bg-primary/20 text-primary border-primary/30 gap-1.5">
              <Sparkles className="h-3 w-3" />
              Powered by ML
            </Badge>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/20 rounded-lg">
                <Activity className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liveCount}</p>
                <p className="text-xs text-muted-foreground">Live Now</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Overall Accuracy</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{predictions.length}</p>
                <p className="text-xs text-muted-foreground">Active Predictions</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats ? stats.won + stats.lost + stats.pending : 0}</p>
                <p className="text-xs text-muted-foreground">Matches Analyzed</p>
              </div>
            </div>
          </Card>
        </div>

        {/* AI ACCURACY SECTION */}
        {stats && (
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-semibold">AI Accuracy</span>
              </div>
              <Badge 
                variant="outline" 
                className={`${accuracy >= 70 ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : accuracy >= 50 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-destructive/20 text-destructive border-destructive/30'}`}
              >
                {accuracy}%
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted h-2 rounded-full mb-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${accuracy}%` }} 
              />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-semibold">{stats.won}</span>
                </div>
                <span className="text-xs text-muted-foreground">Won</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span className="font-semibold">{stats.lost}</span>
                </div>
                <span className="text-xs text-muted-foreground">Lost</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-semibold">{stats.pending}</span>
                </div>
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-primary">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-semibold">{streak}</span>
                </div>
                <span className="text-xs text-muted-foreground">Streak</span>
              </div>
            </div>
          </Card>
        )}

        {/* TODAY/TOMORROW TABS + COUNT */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2">
            {(["today", "tomorrow"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  day === d 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {d === "today" ? "Today" : "Tomorrow"}
              </button>
            ))}
          </div>

          <span className="text-sm text-muted-foreground">
            Total matches ({day === "today" ? "Today" : "Tomorrow"}): <strong className="text-foreground">{predictions.length}</strong>
          </span>
        </div>

        {/* FEATURED PREDICTIONS HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-semibold">Featured Predictions</span>
          </div>
          <span className="text-xs text-muted-foreground">↻ Updated just now</span>
        </div>

        {/* PREDICTIONS GRID */}
        {loading ? (
          <div className="text-muted-foreground text-center py-8">Loading AI predictions…</div>
        ) : predictions.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground border-border">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No AI predictions available yet.</p>
            <p className="text-sm">Matches are currently being analyzed.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((p) => (
              <AIPredictionCard
                key={p.id}
                prediction={p}
                isPremiumUser={isPremiumUser}
                onWatchAd={() => console.log("WATCH AD")}
                onBuyPremium={() => console.log("BUY PREMIUM")}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
