import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ChevronRight, Lock, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveScores } from "@/hooks/useLiveScores";
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

      {/* Today's Matches */}
      <section className="px-3 mt-6">
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Today's Matches
        </h2>
        <WCTodayMatches />
      </section>

      {/* Bottom CTA */}
      <section className="px-3 mt-8 mb-6">
        <Card className="bg-gradient-to-br from-primary/20 via-card to-yellow-900/20 border-primary/30 overflow-hidden">
          <div className="p-5 text-center">
            <Lock className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-foreground mb-1">
              Unlock Full AI Predictions
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Get premium World Cup analysis, live predictions, and exclusive
              match insights for every game.
            </p>
            <Button
              onClick={() => navigate("/get-premium")}
              className="bg-gradient-to-r from-yellow-500 to-primary text-white font-semibold"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Go Premium
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

/** Shows today's live/upcoming WC matches or a placeholder */
function WCTodayMatches() {
  const { matches, isLoading } = useLiveScores({ dateMode: "today" });
  
  // Filter for World Cup matches (league name contains "World Cup")
  const wcMatches = matches.filter(
    (m) => m.league?.toLowerCase().includes("world cup")
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (wcMatches.length === 0) {
    return (
      <Card className="bg-card border-border p-6 text-center">
        <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No World Cup matches today. Check back during the tournament!
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          June 11 – July 19, 2026
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {wcMatches.map((m) => (
        <Card key={m.id} className="bg-card border-border p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">
                {m.homeTeam}
              </p>
              <p className="text-xs font-semibold text-foreground">
                {m.awayTeam}
              </p>
            </div>
            <div className="text-center px-3">
              {m.status === "live" || m.status === "halftime" ? (
                <div>
                  <span className="text-sm font-bold text-foreground">
                    {m.homeScore} - {m.awayScore}
                  </span>
                  <Badge className="bg-destructive/20 text-destructive text-[9px] ml-1">
                    {m.status === "halftime" ? "HT" : `${m.minute}'`}
                  </Badge>
                </div>
              ) : m.status === "finished" ? (
                <span className="text-sm font-bold text-muted-foreground">
                  {m.homeScore} - {m.awayScore}
                </span>
              ) : (
                <span className="text-xs text-primary font-semibold">
                  {m.startTime}
                </span>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
