import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ChevronRight, Zap, Globe, Lock, Brain, Calendar, BarChart3, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import heroImage from "@/assets/world-cup-hero.jpg";
import WorldCupTeamPage from "@/components/world-cup/WorldCupTeamPage";

// World Cup 2026 groups (48 teams, 12 groups)
const GROUPS: Record<string, string[]> = {
  A: ["USA", "Morocco", "Peru", "Jamaica"],
  B: ["Portugal", "Mexico", "Colombia", "Senegal"],
  C: ["France", "Australia", "Saudi Arabia", "Ecuador"],
  D: ["Brazil", "Cameroon", "Japan", "New Zealand"],
  E: ["Argentina", "Canada", "Chile", "Uzbekistan"],
  F: ["Spain", "Nigeria", "South Korea", "Paraguay"],
  G: ["England", "Serbia", "Costa Rica", "Iran"],
  H: ["Germany", "Uruguay", "Ghana", "Tunisia"],
  I: ["Netherlands", "Egypt", "Denmark", "Indonesia"],
  J: ["Italy", "Switzerland", "Ivory Coast", "Panama"],
  K: ["Belgium", "Croatia", "Wales", "Algeria"],
  L: ["Poland", "Sweden", "Turkey", "Bolivia"],
};

const ALL_TEAMS = Object.entries(GROUPS).flatMap(([group, teams]) =>
  teams.map(team => ({ team, group }))
);

const mockStandings = (teams: string[]) =>
  teams.map((t, i) => ({
    team: t, played: 0, won: 0, drawn: 0, lost: 0, gd: 0, pts: 0, rank: i + 1,
  }));

const FEATURED_MATCH = {
  homeTeam: "USA", awayTeam: "England", date: "June 11, 2026", time: "21:00",
  homeWin: 38, draw: 27, awayWin: 35, over25: 62, league: "World Cup 2026 - Group Stage",
};

const KNOCKOUT_ROUNDS = [
  { name: "Round of 16", emoji: "⚔️" },
  { name: "Quarter-finals", emoji: "🏟️" },
  { name: "Semi-finals", emoji: "🔥" },
  { name: "Final", emoji: "🏆" },
];

const MOCK_MATCHES = {
  today: [
    { home: "USA", away: "Morocco", time: "18:00", status: "upcoming", score: "" },
    { home: "Portugal", away: "Mexico", time: "21:00", status: "live", score: "1-0", minute: "34'" },
  ],
  upcoming: [
    { home: "France", away: "Australia", time: "15:00", date: "Jun 12", score: "" },
    { home: "Brazil", away: "Cameroon", time: "18:00", date: "Jun 12", score: "" },
    { home: "Argentina", away: "Canada", time: "21:00", date: "Jun 12", score: "" },
    { home: "Spain", away: "Nigeria", time: "15:00", date: "Jun 13", score: "" },
    { home: "England", away: "Serbia", time: "18:00", date: "Jun 13", score: "" },
    { home: "Germany", away: "Uruguay", time: "21:00", date: "Jun 13", score: "" },
  ],
  finished: [
    { home: "Italy", away: "Switzerland", score: "2-1", date: "Jun 10" },
    { home: "Netherlands", away: "Egypt", score: "3-0", date: "Jun 10" },
  ],
};

const MOCK_AI_PREDICTIONS = [
  { home: "USA", away: "Morocco", homeWin: 45, draw: 28, awayWin: 27, confidence: 72 },
  { home: "Portugal", away: "Mexico", homeWin: 52, draw: 25, awayWin: 23, confidence: 78 },
  { home: "France", away: "Australia", homeWin: 68, draw: 20, awayWin: 12, confidence: 85 },
  { home: "Brazil", away: "Cameroon", homeWin: 60, draw: 22, awayWin: 18, confidence: 80 },
  { home: "Argentina", away: "Canada", homeWin: 65, draw: 20, awayWin: 15, confidence: 82 },
  { home: "England", away: "Serbia", homeWin: 55, draw: 25, awayWin: 20, confidence: 75 },
  { home: "Germany", away: "Uruguay", homeWin: 48, draw: 27, awayWin: 25, confidence: 70 },
  { home: "Spain", away: "Nigeria", homeWin: 62, draw: 22, awayWin: 16, confidence: 79 },
];

const openPlayStore = () => {
  if (typeof window !== "undefined" && (window as any).Android?.openExternal) {
    (window as any).Android.openExternal("https://play.google.com/store/apps/details?id=com.propredict.app");
  } else {
    window.open("https://play.google.com/store/apps/details?id=com.propredict.app", "_blank");
  }
};

export default function WorldCup2026() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [matchesFilter, setMatchesFilter] = useState<"today" | "upcoming" | "finished">("today");
  const [selectedTeam, setSelectedTeam] = useState<{ team: string; group: string } | null>(null);
  const [teamsSearch, setTeamsSearch] = useState("");

  if (selectedTeam) {
    return <WorldCupTeamPage team={selectedTeam.team} group={selectedTeam.group} onBack={() => setSelectedTeam(null)} />;
  }

  const filteredTeams = ALL_TEAMS.filter(t => t.team.toLowerCase().includes(teamsSearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="World Cup 2026" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-end text-center px-4 pt-24 pb-6 min-h-[240px]">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-7 w-7 text-yellow-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">World Cup 2026</h1>
          </div>
          <p className="text-sm text-white/80 max-w-md leading-relaxed">
            The most watched event in the world is here.
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-[10px]">
              <Globe className="h-3 w-3 mr-1" /> USA · Mexico · Canada
            </Badge>
            <Badge variant="outline" className="border-primary/50 text-primary text-[10px]">48 Teams</Badge>
            <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
              🔥 Live Updates + AI Predictions
            </Badge>
          </div>
        </div>
      </section>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none bg-card border-b border-border h-11 px-1 gap-0 overflow-x-auto flex-nowrap">
          {[
            { value: "overview", label: "Overview", icon: Trophy },
            { value: "predictions", label: "AI Picks", icon: Brain },
            { value: "matches", label: "Matches", icon: Calendar },
            { value: "standings", label: "Standings", icon: BarChart3 },
            { value: "teams", label: "Teams", icon: Users },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-[11px] px-2.5 py-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md gap-1 whitespace-nowrap">
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ==================== OVERVIEW TAB ==================== */}
        <TabsContent value="overview" className="mt-0">
          {/* Groups */}
          <section className="px-3 mt-4">
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" /> Group Stage
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(GROUPS).map(([group, teams]) => {
                const isExpanded = expandedGroup === group;
                const standings = mockStandings(teams);
                return (
                  <Card key={group} className="bg-card border-border cursor-pointer hover:border-primary/40 transition-colors overflow-hidden"
                    onClick={() => setExpandedGroup(isExpanded ? null : group)}>
                    <div className="p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-primary">Group {group}</span>
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                      <div className="space-y-1">
                        {standings.map((s, idx) => (
                          <div key={s.team} className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                            idx < 2 ? "bg-emerald-500/10 text-emerald-400" : idx === teams.length - 1 ? "bg-destructive/10 text-destructive" : "text-muted-foreground"
                          }`}>
                            <span className="truncate">{s.team}</span>
                            <span className="font-mono font-semibold">{s.pts}</span>
                          </div>
                        ))}
                      </div>
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <div className="grid grid-cols-5 text-[9px] text-muted-foreground font-medium mb-1 px-1">
                            <span className="col-span-2">Team</span><span className="text-center">P</span><span className="text-center">GD</span><span className="text-center">Pts</span>
                          </div>
                          {standings.map(s => (
                            <div key={s.team} className="grid grid-cols-5 text-[10px] text-foreground px-1 py-0.5">
                              <span className="col-span-2 truncate">{s.team}</span>
                              <span className="text-center text-muted-foreground">{s.played}</span>
                              <span className="text-center text-muted-foreground">{s.gd > 0 ? `+${s.gd}` : s.gd}</span>
                              <span className="text-center font-bold">{s.pts}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Tournament Progress */}
          <section className="px-3 mt-5">
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Tournament Progress
            </h2>
            <Card className="bg-card border-border overflow-hidden">
              <div className="divide-y divide-border">
                {KNOCKOUT_ROUNDS.map(round => (
                  <div key={round.name} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{round.emoji}</span>
                      <span className="text-sm font-medium text-foreground">{round.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Locked</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-muted/30 border-t border-border">
                <p className="text-[11px] text-muted-foreground text-center">Follow the full tournament in the app</p>
              </div>
            </Card>
          </section>

          {/* Featured Match */}
          <section className="px-3 mt-5">
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" /> Featured Match
            </h2>
            <Card className="bg-card border-border overflow-hidden">
              <div className="p-4">
                <div className="text-[10px] text-muted-foreground mb-2 text-center">{FEATURED_MATCH.league}</div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1 text-center"><p className="text-base font-bold text-foreground">{FEATURED_MATCH.homeTeam}</p></div>
                  <div className="flex flex-col items-center px-4">
                    <span className="text-xs text-muted-foreground">{FEATURED_MATCH.date}</span>
                    <span className="text-lg font-bold text-primary">{FEATURED_MATCH.time}</span>
                  </div>
                  <div className="flex-1 text-center"><p className="text-base font-bold text-foreground">{FEATURED_MATCH.awayTeam}</p></div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Badge className="bg-destructive/20 text-destructive text-[10px] border-destructive/30">🔥 AI Prediction</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center mb-2">AI sees this before kickoff</p>
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div><span className="text-lg font-bold text-emerald-400">{FEATURED_MATCH.homeWin}%</span><p className="text-[10px] text-muted-foreground">Home</p></div>
                    <div><span className="text-lg font-bold text-yellow-400">{FEATURED_MATCH.draw}%</span><p className="text-[10px] text-muted-foreground">Draw</p></div>
                    <div><span className="text-lg font-bold text-blue-400">{FEATURED_MATCH.awayWin}%</span><p className="text-[10px] text-muted-foreground">Away</p></div>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-primary/20 text-primary text-[10px]">Over 2.5: {FEATURED_MATCH.over25}%</Badge>
                  </div>
                </div>
                <Button onClick={openPlayStore} className="w-full bg-primary text-primary-foreground" size="sm">
                  View Full Analysis <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>
          </section>

          {/* CTA */}
          <section className="px-3 mt-6 mb-4">
            <Card className="bg-card border-border overflow-hidden">
              <div className="p-5 text-center">
                <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                <h3 className="text-base font-bold text-foreground mb-1">World Cup AI Predictions</h3>
                <p className="text-xs text-foreground/80 mb-1">Get AI insights before every match</p>
                <p className="text-[10px] text-muted-foreground mb-4">Full predictions & live tracking only in the app</p>
                <Button onClick={() => {
                  if (typeof window !== "undefined" && (window as any).Android?.openExternal) {
                    (window as any).Android.openExternal("https://play.google.com/store/apps/details?id=com.propredict.app");
                  } else { navigate("/ai-predictions"); }
                }} className="bg-primary text-primary-foreground font-semibold">
                  <Lock className="h-4 w-4 mr-2" /> Unlock in App
                </Button>
              </div>
            </Card>
          </section>
        </TabsContent>

        {/* ==================== AI PREDICTIONS TAB ==================== */}
        <TabsContent value="predictions" className="mt-0 px-3">
          <div className="mt-4 space-y-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> AI Match Predictions
            </h2>
            {MOCK_AI_PREDICTIONS.map((pred, i) => (
              <Card key={i} className="bg-card border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">{pred.home} vs {pred.away}</span>
                  <Badge variant="outline" className="text-[9px]">{pred.confidence}% conf</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  <div className="bg-muted/30 rounded p-1.5">
                    <p className="text-sm font-bold text-emerald-400">{pred.homeWin}%</p>
                    <p className="text-[9px] text-muted-foreground">Home</p>
                  </div>
                  <div className="bg-muted/30 rounded p-1.5">
                    <p className="text-sm font-bold text-yellow-400">{pred.draw}%</p>
                    <p className="text-[9px] text-muted-foreground">Draw</p>
                  </div>
                  <div className="bg-muted/30 rounded p-1.5">
                    <p className="text-sm font-bold text-blue-400">{pred.awayWin}%</p>
                    <p className="text-[9px] text-muted-foreground">Away</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span className="text-[10px]">Full analysis locked</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary text-[10px] h-6 px-2" onClick={openPlayStore}>
                    Unlock <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ==================== MATCHES TAB ==================== */}
        <TabsContent value="matches" className="mt-0 px-3">
          <div className="mt-4">
            <div className="flex gap-2 mb-3">
              {(["today", "upcoming", "finished"] as const).map(f => (
                <Button key={f} size="sm" variant={matchesFilter === f ? "default" : "outline"}
                  className="text-[11px] h-7 px-3 capitalize" onClick={() => setMatchesFilter(f)}>
                  {f}
                </Button>
              ))}
            </div>

            {matchesFilter === "today" && (
              <div className="space-y-2">
                {MOCK_MATCHES.today.map((m, i) => (
                  <Card key={i} className="bg-card border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">{m.home}</p>
                        <p className="text-xs font-semibold text-foreground">{m.away}</p>
                      </div>
                      <div className="text-right">
                        {m.status === "live" ? (
                          <>
                            <Badge className="bg-destructive/20 text-destructive text-[9px] mb-0.5">● LIVE {m.minute}</Badge>
                            <p className="text-sm font-bold text-foreground">{m.score}</p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-primary">{m.time}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {matchesFilter === "upcoming" && (
              <div className="space-y-2">
                {MOCK_MATCHES.upcoming.map((m, i) => (
                  <Card key={i} className="bg-card border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">{m.home} vs {m.away}</p>
                        <p className="text-[10px] text-muted-foreground">{m.date}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">{m.time}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {matchesFilter === "finished" && (
              <div className="space-y-2">
                {MOCK_MATCHES.finished.map((m, i) => (
                  <Card key={i} className="bg-card border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">{m.home} vs {m.away}</p>
                        <p className="text-[10px] text-muted-foreground">{m.date}</p>
                      </div>
                      <span className="text-sm font-bold text-foreground">{m.score}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ==================== STANDINGS TAB ==================== */}
        <TabsContent value="standings" className="mt-0 px-3">
          <div className="mt-4 space-y-3">
            {Object.entries(GROUPS).map(([group, teams]) => {
              const standings = mockStandings(teams);
              return (
                <Card key={group} className="bg-card border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/30 border-b border-border">
                    <span className="text-xs font-bold text-primary">Group {group}</span>
                  </div>
                  <div className="p-2">
                    <div className="grid grid-cols-7 text-[9px] text-muted-foreground font-medium mb-1 px-1">
                      <span className="col-span-3">Team</span>
                      <span className="text-center">P</span>
                      <span className="text-center">W</span>
                      <span className="text-center">GD</span>
                      <span className="text-center">Pts</span>
                    </div>
                    {standings.map((s, idx) => (
                      <div key={s.team}
                        className={`grid grid-cols-7 text-[11px] px-1 py-1.5 rounded cursor-pointer hover:bg-muted/30 ${
                          idx < 2 ? "text-emerald-400" : idx === teams.length - 1 ? "text-destructive" : "text-foreground"
                        }`}
                        onClick={() => setSelectedTeam({ team: s.team, group })}
                      >
                        <span className="col-span-3 truncate font-medium">{s.team}</span>
                        <span className="text-center">{s.played}</span>
                        <span className="text-center">{s.won}</span>
                        <span className="text-center">{s.gd > 0 ? `+${s.gd}` : s.gd}</span>
                        <span className="text-center font-bold">{s.pts}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ==================== TEAMS TAB ==================== */}
        <TabsContent value="teams" className="mt-0 px-3">
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search teams..."
              value={teamsSearch}
              onChange={e => setTeamsSearch(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground mb-3 outline-none focus:border-primary/50"
            />
            <div className="space-y-1.5">
              {filteredTeams.map(({ team, group }) => (
                <Card key={team} className="bg-card border-border p-3 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setSelectedTeam({ team, group })}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Shield className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">{team}</p>
                        <p className="text-[10px] text-muted-foreground">Group {group}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
