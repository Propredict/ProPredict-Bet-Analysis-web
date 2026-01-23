import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AIPredictionCard } from "@/components/ai-predictions/AIPredictionCard";
import { useAIPredictions } from "@/hooks/useAIPredictions";
import { useAIPredictionStats } from "@/hooks/useAIPredictionStats";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Activity, Target, Brain, BarChart3, Sparkles, TrendingUp } from "lucide-react";

export default function AIPredictions() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [searchQuery, setSearchQuery] = useState("");
  const { predictions, loading } = useAIPredictions(day);
  const { stats, loading: statsLoading } = useAIPredictionStats();
  const { isAdmin, plan } = useUserPlan();
  const navigate = useNavigate();

  const isPremiumUser = plan === "premium";

  // Filter predictions by search (frontend only)
  const filteredPredictions = useMemo(() => {
    if (!searchQuery.trim()) return predictions;
    const q = searchQuery.toLowerCase();
    return predictions.filter(
      (p) =>
        p.home_team.toLowerCase().includes(q) ||
        p.away_team.toLowerCase().includes(q) ||
        (p.league && p.league.toLowerCase().includes(q))
    );
  }, [predictions, searchQuery]);

  // Calculate live count from predictions
  const liveCount = useMemo(() => {
    return predictions.filter((p) => p.is_live).length;
  }, [predictions]);

  // Total matches analyzed
  const totalAnalyzed = stats.won + stats.lost + stats.pending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">AI Predictions</h1>
            <p className="text-muted-foreground mt-1">AI-powered match analysis and predictions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search team or league"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full md:w-64 bg-[#0a1628]/60 border-[#1e3a5f]/50"
              />
            </div>
            <Badge className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border-purple-500/30 px-3 py-1.5 hidden sm:flex">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Powered by ML
            </Badge>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-[#0a1628]/80 border-[#1e3a5f]/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/15">
                <Activity className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Live Now</p>
                <p className="text-xl font-bold text-foreground">{liveCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0a1628]/80 border-[#1e3a5f]/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/15">
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overall Accuracy</p>
                <p className="text-xl font-bold text-green-400">
                  {statsLoading ? "..." : `${stats.accuracy}%`}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0a1628]/80 border-[#1e3a5f]/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/15">
                <Brain className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Predictions</p>
                <p className="text-xl font-bold text-foreground">
                  {statsLoading ? "..." : stats.pending}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0a1628]/80 border-[#1e3a5f]/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/15">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Matches Analyzed</p>
                <p className="text-xl font-bold text-foreground">
                  {statsLoading ? "..." : totalAnalyzed}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Accuracy Section */}
        <Card className="bg-[#0a1628]/80 border-[#1e3a5f]/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">AI Accuracy</span>
              </div>
              <Badge className="bg-green-500/15 text-green-400 border-green-500/30">
                {stats.accuracy}% Accuracy
              </Badge>
            </div>
            
            {/* Stats indicators */}
            <div className="flex items-center gap-6 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Won</span>
                <span className="text-sm font-semibold text-green-400">{stats.won}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">Lost</span>
                <span className="text-sm font-semibold text-red-400">{stats.lost}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs text-muted-foreground">Pending</span>
                <span className="text-sm font-semibold text-yellow-400">{stats.pending}</span>
              </div>
            </div>

            {/* Visual accuracy bar */}
            {totalAnalyzed > 0 && (
              <div className="h-2 bg-[#1e3a5f]/30 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(stats.won / totalAnalyzed) * 100}%` }}
                />
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(stats.lost / totalAnalyzed) * 100}%` }}
                />
                <div
                  className="h-full bg-yellow-500"
                  style={{ width: `${(stats.pending / totalAnalyzed) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs: Today / Tomorrow */}
        <Tabs value={day} onValueChange={(v) => setDay(v as "today" | "tomorrow")}>
          <TabsList className="bg-[#0a1628]/80 border border-[#1e3a5f]/40">
            <TabsTrigger 
              value="today" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Today
            </TabsTrigger>
            <TabsTrigger 
              value="tomorrow" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Tomorrow
            </TabsTrigger>
          </TabsList>

          <TabsContent value={day} className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading predictions...</p>
              </div>
            ) : filteredPredictions.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No predictions available for {day === "today" ? "today" : "tomorrow"}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredPredictions.map((prediction) => (
                  <AIPredictionCard
                    key={prediction.id}
                    prediction={prediction}
                    isAdmin={isAdmin}
                    isPremiumUser={isPremiumUser}
                    onWatchAd={() => {}}
                    onGoPremium={() => navigate("/get-premium")}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
