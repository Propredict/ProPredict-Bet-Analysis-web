import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ChevronRight, Lock, Zap, Globe, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NationalTeamForm from "@/components/world-cup/NationalTeamForm";
import heroImage from "@/assets/world-cup-hero.jpg";

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

// Mock standings (placeholder until API data is available)
const mockStandings = (teams: string[]) =>
  teams.map((t, i) => ({
    team: t,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gd: 0,
    pts: 0,
    rank: i + 1,
  }));

// Featured match mock
const FEATURED_MATCH = {
  homeTeam: "USA",
  awayTeam: "England",
  date: "June 11, 2026",
  time: "21:00",
  homeWin: 38,
  draw: 27,
  awayWin: 35,
  over25: 62,
  league: "World Cup 2026 - Group Stage",
};

export default function WorldCup2026() {
  const navigate = useNavigate();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="World Cup 2026"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-end text-center px-4 pt-24 pb-8 min-h-[280px]">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-7 w-7 text-yellow-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              World Cup 2026
            </h1>
          </div>
          <p className="text-sm text-white/80 max-w-md leading-relaxed">
            The most watched event in the world is here. Join now and stay ahead
            with AI match analysis, predictions, and live scores.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-[10px]">
              <Globe className="h-3 w-3 mr-1" /> USA · Mexico · Canada
            </Badge>
            <Badge variant="outline" className="border-primary/50 text-primary text-[10px]">
              48 Teams
            </Badge>
          </div>
        </div>
      </section>

      {/* Group Stage Overview */}
      <section className="px-3 mt-6">
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Group Stage
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(GROUPS).map(([group, teams]) => {
            const isExpanded = expandedGroup === group;
            const standings = mockStandings(teams);
            return (
              <Card
                key={group}
                className="bg-card border-border cursor-pointer hover:border-primary/40 transition-colors overflow-hidden"
                onClick={() =>
                  setExpandedGroup(isExpanded ? null : group)
                }
              >
                <div className="p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-primary">
                      Group {group}
                    </span>
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    {standings.map((s, idx) => (
                      <div
                        key={s.team}
                        className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                          idx < 2
                            ? "bg-emerald-500/10 text-emerald-400"
                            : idx === teams.length - 1
                            ? "bg-destructive/10 text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span className="truncate">{s.team}</span>
                        <span className="font-mono font-semibold">{s.pts}</span>
                      </div>
                    ))}
                  </div>
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="grid grid-cols-5 text-[9px] text-muted-foreground font-medium mb-1 px-1">
                        <span className="col-span-2">Team</span>
                        <span className="text-center">P</span>
                        <span className="text-center">GD</span>
                        <span className="text-center">Pts</span>
                      </div>
                      {standings.map((s) => (
                        <div
                          key={s.team}
                          className="grid grid-cols-5 text-[10px] text-foreground px-1 py-0.5"
                        >
                          <span className="col-span-2 truncate">
                            {s.team}
                          </span>
                          <span className="text-center text-muted-foreground">
                            {s.played}
                          </span>
                          <span className="text-center text-muted-foreground">
                            {s.gd > 0 ? `+${s.gd}` : s.gd}
                          </span>
                          <span className="text-center font-bold">
                            {s.pts}
                          </span>
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

      {/* Featured Match */}
      <section className="px-3 mt-6">
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-400" />
          Featured Match
        </h2>
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-4">
            <div className="text-[10px] text-muted-foreground mb-2 text-center">
              {FEATURED_MATCH.league}
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 text-center">
                <p className="text-base font-bold text-foreground">
                  {FEATURED_MATCH.homeTeam}
                </p>
              </div>
              <div className="flex flex-col items-center px-4">
                <span className="text-xs text-muted-foreground">
                  {FEATURED_MATCH.date}
                </span>
                <span className="text-lg font-bold text-primary">
                  {FEATURED_MATCH.time}
                </span>
              </div>
              <div className="flex-1 text-center">
                <p className="text-base font-bold text-foreground">
                  {FEATURED_MATCH.awayTeam}
                </p>
              </div>
            </div>

            {/* AI Predictions */}
            <div className="bg-muted/50 rounded-lg p-3 mb-3">
              <div className="text-[10px] font-semibold text-primary mb-2 text-center">
                🤖 AI PREDICTION
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-2">
                <div>
                  <span className="text-lg font-bold text-emerald-400">
                    {FEATURED_MATCH.homeWin}%
                  </span>
                  <p className="text-[10px] text-muted-foreground">Home</p>
                </div>
                <div>
                  <span className="text-lg font-bold text-yellow-400">
                    {FEATURED_MATCH.draw}%
                  </span>
                  <p className="text-[10px] text-muted-foreground">Draw</p>
                </div>
                <div>
                  <span className="text-lg font-bold text-blue-400">
                    {FEATURED_MATCH.awayWin}%
                  </span>
                  <p className="text-[10px] text-muted-foreground">Away</p>
                </div>
              </div>
              <div className="text-center">
                <Badge className="bg-primary/20 text-primary text-[10px]">
                  Over 2.5: {FEATURED_MATCH.over25}%
                </Badge>
              </div>
            </div>

            <Button
              onClick={() => navigate("/ai-predictions")}
              className="w-full bg-primary text-primary-foreground"
              size="sm"
            >
              View Full Analysis
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      </section>

      {/* National Teams Form */}
      <section className="px-3 mt-6">
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          National Teams Form
        </h2>
        <NationalTeamForm />
      </section>

      {/* CTA Section */}
      <section className="px-3 mt-8 mb-6">
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-5 text-center">
            <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-foreground mb-1">
              World Cup AI Predictions
            </h3>
            <p className="text-xs text-foreground/80 mb-1">
              Get AI insights for every World Cup match
            </p>
            <p className="text-[10px] text-muted-foreground mb-4">
              Full analysis & live tracking available only in the app
            </p>
            <Button
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).Android?.openExternal) {
                  (window as any).Android.openExternal("https://play.google.com/store/apps/details?id=com.propredict.app");
                } else {
                  navigate("/ai-predictions");
                }
              }}
              className="bg-primary text-primary-foreground font-semibold"
            >
              <Zap className="h-4 w-4 mr-2" />
              Open App & Unlock
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
