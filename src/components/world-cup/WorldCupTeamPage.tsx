import { useState } from "react";
import { ArrowLeft, Trophy, Users, BarChart3, TrendingUp, Brain, Calendar, Shield, ChevronRight, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TeamPageProps {
  team: string;
  group: string;
  onBack: () => void;
}

const MOCK_PLAYERS: Record<string, { name: string; pos: string; club: string }[]> = {
  GK: [
    { name: "Goalkeeper 1", pos: "GK", club: "Club A" },
    { name: "Goalkeeper 2", pos: "GK", club: "Club B" },
  ],
  DEF: [
    { name: "Defender 1", pos: "CB", club: "Club C" },
    { name: "Defender 2", pos: "CB", club: "Club D" },
    { name: "Defender 3", pos: "LB", club: "Club E" },
    { name: "Defender 4", pos: "RB", club: "Club F" },
  ],
  MID: [
    { name: "Midfielder 1", pos: "CM", club: "Club G" },
    { name: "Midfielder 2", pos: "CM", club: "Club H" },
    { name: "Midfielder 3", pos: "CAM", club: "Club I" },
  ],
  FWD: [
    { name: "Forward 1", pos: "ST", club: "Club J" },
    { name: "Forward 2", pos: "RW", club: "Club K" },
    { name: "Forward 3", pos: "LW", club: "Club L" },
  ],
};

const MOCK_FORM = [
  { opponent: "Team A", result: "W", score: "2-1" },
  { opponent: "Team B", result: "W", score: "3-0" },
  { opponent: "Team C", result: "D", score: "1-1" },
  { opponent: "Team D", result: "L", score: "0-2" },
  { opponent: "Team E", result: "W", score: "1-0" },
];

const MOCK_STATS = {
  goalsScored: 8,
  goalsConceded: 4,
  possession: 56,
  shotsPerGame: 14.2,
  passAccuracy: 87,
  cleanSheets: 2,
};

export default function WorldCupTeamPage({ team, group, onBack }: TeamPageProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-3 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {team}
            </h1>
            <p className="text-[11px] text-muted-foreground">Group {group} · World Cup 2026</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none bg-card border-b border-border h-10 px-2 gap-0 overflow-x-auto">
          {[
            { value: "overview", label: "Overview", icon: Trophy },
            { value: "squad", label: "Squad", icon: Users },
            { value: "stats", label: "Stats", icon: BarChart3 },
            { value: "form", label: "Form", icon: TrendingUp },
            { value: "ai", label: "AI Insight", icon: Brain },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-[11px] px-3 py-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md gap-1">
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="px-3 mt-3 space-y-3">
          <Card className="bg-card border-border p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">Team Info</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "FIFA Rank", value: "#12" },
                { label: "Coach", value: "Head Coach" },
                { label: "Group", value: `Group ${group}` },
                { label: "Confederation", value: "FIFA" },
              ].map(item => (
                <div key={item.label} className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-card border-border p-4">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Upcoming Matches
            </h3>
            {["Match 1 vs Opponent A", "Match 2 vs Opponent B", "Match 3 vs Opponent C"].map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-xs text-foreground">{m}</span>
                <Badge variant="outline" className="text-[9px]">TBD</Badge>
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* Squad */}
        <TabsContent value="squad" className="px-3 mt-3 space-y-3">
          {Object.entries(MOCK_PLAYERS).map(([pos, players]) => (
            <Card key={pos} className="bg-card border-border p-3">
              <h3 className="text-xs font-bold text-primary mb-2">{
                pos === "GK" ? "Goalkeepers" : pos === "DEF" ? "Defenders" : pos === "MID" ? "Midfielders" : "Forwards"
              }</h3>
              <div className="space-y-1.5">
                {players.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/20 rounded px-2.5 py-1.5">
                    <div>
                      <p className="text-xs font-medium text-foreground">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.club}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px]">{p.pos}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Stats */}
        <TabsContent value="stats" className="px-3 mt-3">
          <Card className="bg-card border-border p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">Team Statistics</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Goals Scored", value: MOCK_STATS.goalsScored, color: "text-emerald-400" },
                { label: "Goals Conceded", value: MOCK_STATS.goalsConceded, color: "text-destructive" },
                { label: "Possession", value: `${MOCK_STATS.possession}%`, color: "text-primary" },
                { label: "Shots/Game", value: MOCK_STATS.shotsPerGame, color: "text-yellow-400" },
                { label: "Pass Accuracy", value: `${MOCK_STATS.passAccuracy}%`, color: "text-blue-400" },
                { label: "Clean Sheets", value: MOCK_STATS.cleanSheets, color: "text-emerald-400" },
              ].map(stat => (
                <div key={stat.label} className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Form */}
        <TabsContent value="form" className="px-3 mt-3">
          <Card className="bg-card border-border p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">Last 5 Matches</h3>
            <div className="flex gap-1.5 mb-4 justify-center">
              {MOCK_FORM.map((m, i) => (
                <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  m.result === "W" ? "bg-emerald-500/20 text-emerald-400" :
                  m.result === "D" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-destructive/20 text-destructive"
                }`}>
                  {m.result}
                </span>
              ))}
            </div>
            <div className="space-y-1.5">
              {MOCK_FORM.map((m, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/20 rounded px-3 py-2">
                  <span className="text-xs text-foreground">vs {m.opponent}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{m.score}</span>
                    <span className={`text-[10px] font-bold ${
                      m.result === "W" ? "text-emerald-400" :
                      m.result === "D" ? "text-yellow-400" : "text-destructive"
                    }`}>{m.result}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* AI Insight */}
        <TabsContent value="ai" className="px-3 mt-3 space-y-3">
          <Card className="bg-card border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">AI Analysis</h3>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed mb-3">
              {team} shows strong offensive capability with {MOCK_STATS.goalsScored} goals in recent qualifiers. 
              Their {MOCK_STATS.possession}% possession indicates a dominant play style. Key strengths include 
              high pass accuracy ({MOCK_STATS.passAccuracy}%) and consistent defensive organization with {MOCK_STATS.cleanSheets} clean sheets.
            </p>
            <div className="bg-muted/30 rounded-lg p-3 mb-3">
              <p className="text-[10px] text-muted-foreground mb-1">Tournament Prediction</p>
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Full prediction available in app</span>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full bg-primary text-primary-foreground"
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).Android?.openExternal) {
                  (window as any).Android.openExternal("https://play.google.com/store/apps/details?id=com.propredict.app");
                } else {
                  window.open("https://play.google.com/store/apps/details?id=com.propredict.app", "_blank");
                }
              }}
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Unlock Full AI Insight
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
