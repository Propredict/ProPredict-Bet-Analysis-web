import { useState } from "react";
import { ArrowLeft, Trophy, Users, BarChart3, TrendingUp, Brain, Calendar, Shield, ChevronRight, Lock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEAMS, GROUPS, GROUP_MATCHES, type WCTeam } from "@/data/worldCup2026";
import TeamFlag from "@/components/world-cup/TeamFlag";

interface TeamPageProps {
  team: string;
  onBack: () => void;
}

const openPlayStore = () => {
  if (typeof window !== "undefined" && (window as any).Android?.openExternal) {
    (window as any).Android.openExternal("https://play.google.com/store/apps/details?id=com.propredict.app");
  } else {
    window.open("https://play.google.com/store/apps/details?id=com.propredict.app", "_blank");
  }
};

export default function WorldCupTeamPage({ team, onBack }: TeamPageProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const teamData = TEAMS[team];

  // Find group
  const group = Object.entries(GROUPS).find(([, teams]) => teams.includes(team))?.[0] || "?";

  // Find group matches for this team
  const teamMatches = GROUP_MATCHES.filter(m => m.home === team || m.away === team);

  // Group opponents
  const groupTeams = GROUPS[group]?.filter(t => t !== team).map(t => TEAMS[t]).filter(Boolean) || [];

  if (!teamData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Team not found</p>
          <Button variant="outline" onClick={onBack} className="mt-3">Go Back</Button>
        </div>
      </div>
    );
  }

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
              <TeamFlag code={teamData.code} size="md" />
              {teamData.name}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Group {group} · FIFA Rank #{teamData.fifaRank} · {teamData.confederation}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none bg-card border-b border-border h-10 px-2 gap-0 overflow-x-auto">
          {[
            { value: "overview", label: "Overview", icon: Trophy },
            { value: "squad", label: "Squad", icon: Users },
            { value: "matches", label: "Matches", icon: Calendar },
            { value: "group", label: "Group", icon: BarChart3 },
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
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "FIFA Ranking", value: `#${teamData.fifaRank}` },
                { label: "Coach", value: teamData.coach },
                { label: "Group", value: `Group ${group}` },
                { label: "Confederation", value: teamData.confederation },
              ].map(item => (
                <div key={item.label} className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
            {teamData.debut && (
              <Badge className="mt-3 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">
                🌟 World Cup Debut
              </Badge>
            )}
          </Card>

          <Card className="bg-card border-border p-4">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              ⭐ Key Players
            </h3>
            <div className="space-y-1.5">
              {teamData.keyPlayers.map((player, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-muted/20 rounded px-3 py-2">
                  <span className="text-xs font-bold text-primary w-5">{i + 1}</span>
                  <span className="text-xs font-medium text-foreground">{player}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-card border-border p-4">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Group {group} Opponents
            </h3>
            {groupTeams.map((opp) => (
              <div key={opp.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                 <div className="flex items-center gap-2">
                   <TeamFlag code={opp.code} size="sm" />
                  <span className="text-xs font-medium text-foreground">{opp.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">#{opp.fifaRank}</span>
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* Squad (Key Players) */}
        <TabsContent value="squad" className="px-3 mt-3 space-y-3">
          <Card className="bg-card border-border p-4">
             <div className="flex items-center gap-2 mb-3">
               <TeamFlag code={teamData.code} size="md" />
              <div>
                <h3 className="text-sm font-bold text-foreground">{teamData.name} Squad</h3>
                <p className="text-[10px] text-muted-foreground">Coach: {teamData.coach}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {teamData.keyPlayers.map((player, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/20 rounded px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-primary w-5 text-center">{i + 1}</span>
                    <span className="text-xs font-medium text-foreground">{player}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px]">Key Player</Badge>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Full 26-man squad available in app</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Matches */}
        <TabsContent value="matches" className="px-3 mt-3 space-y-2">
          <h2 className="text-sm font-bold text-foreground mb-2">Group Stage Matches</h2>
          {teamMatches.length > 0 ? teamMatches.map((m, i) => (
            <Card key={i} className="bg-card border-border p-3">
              <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {m.venue}, {m.city}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                   <div className="flex items-center gap-1.5 mb-0.5">
                     <TeamFlag code={TEAMS[m.home]?.code || ""} size="sm" />
                    <span className={`text-xs font-semibold ${m.home === team ? "text-primary" : "text-foreground"}`}>{m.home}</span>
                  </div>
                   <div className="flex items-center gap-1.5">
                     <TeamFlag code={TEAMS[m.away]?.code || ""} size="sm" />
                    <span className={`text-xs font-semibold ${m.away === team ? "text-primary" : "text-foreground"}`}>{m.away}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">{m.date}</p>
                  <p className="text-sm font-bold text-primary">{m.time}</p>
                </div>
              </div>
            </Card>
          )) : (
            <p className="text-xs text-muted-foreground text-center py-4">Schedule TBD</p>
          )}
        </TabsContent>

        {/* Group standings */}
        <TabsContent value="group" className="px-3 mt-3">
          <Card className="bg-card border-border overflow-hidden">
            <div className="px-3 py-2 bg-muted/30 border-b border-border">
              <span className="text-xs font-bold text-primary">Group {group}</span>
            </div>
            <div className="p-2">
              <div className="grid grid-cols-8 text-[9px] text-muted-foreground font-medium mb-1 px-1">
                <span className="col-span-4">Team</span>
                <span className="text-center">P</span>
                <span className="text-center">W</span>
                <span className="text-center">GD</span>
                <span className="text-center">Pts</span>
              </div>
              {(GROUPS[group] || []).map((t, idx) => {
                const td = TEAMS[t];
                return (
                  <div key={t} className={`grid grid-cols-8 text-[11px] px-1 py-1.5 rounded ${
                    t === team ? "bg-primary/10 text-primary font-semibold" :
                    idx < 2 ? "text-emerald-400" : idx === 3 ? "text-destructive" : "text-foreground"
                  }`}>
                     <span className="col-span-4 truncate flex items-center gap-1.5">
                       <TeamFlag code={td?.code || ""} size="sm" /> {t}
                    </span>
                    <span className="text-center">0</span>
                    <span className="text-center">0</span>
                    <span className="text-center">0</span>
                    <span className="text-center font-bold">0</span>
                  </div>
                );
              })}
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
               {teamData.name} enters the World Cup ranked #{teamData.fifaRank} by FIFA under coach {teamData.coach}.
              {teamData.debut ? ` This marks their historic World Cup debut.` : ""}
              {" "}Key players include {teamData.keyPlayers.slice(0, 3).join(", ")}.
              {teamData.fifaRank <= 10
                ? " They are among the favorites to go deep in this tournament."
                : teamData.fifaRank <= 25
                ? " Expected to compete strongly in the group stage and potentially advance to the knockout rounds."
                : teamData.fifaRank <= 50
                ? " They'll need strong performances from key players to advance past the group stage."
                : " As underdogs, every point will be crucial in their World Cup campaign."}
            </p>
            <div className="bg-muted/30 rounded-lg p-3 mb-3">
              <p className="text-[10px] text-muted-foreground mb-1">Tournament Prediction</p>
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Full AI prediction available in app</span>
              </div>
            </div>
            <Button size="sm" className="w-full bg-primary text-primary-foreground" onClick={openPlayStore}>
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
