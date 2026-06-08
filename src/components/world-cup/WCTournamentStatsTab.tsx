import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Target, Shield, TrendingUp, Goal, Flame, Users, BarChart3, Calendar, Lock, Zap } from "lucide-react";
import { useWCStandings } from "@/hooks/useWCStandings";
import { useWCTopPlayers } from "@/hooks/useWCTopPlayers";
import { usePlatform } from "@/hooks/usePlatform";
import { useUserPlan } from "@/hooks/useUserPlan";
import AppLockOverlay from "@/components/world-cup/AppLockOverlay";

interface StatTile {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tone: "primary" | "amber" | "emerald" | "fuchsia" | "sky";
}

const toneClass: Record<StatTile["tone"], string> = {
  primary: "text-primary",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  fuchsia: "text-fuchsia-400",
  sky: "text-sky-400",
};

export default function WCTournamentStatsTab() {
  const navigate = useNavigate();
  const { isAndroidApp } = usePlatform();
  const { plan } = useUserPlan();

  const { data: standingsData, isLoading: standingsLoading } = useWCStandings();
  const { data: scorers } = useWCTopPlayers("scorers");
  const { data: assists } = useWCTopPlayers("assists");

  const stats = useMemo(() => {
    const groups = standingsData?.standings ?? {};
    const allTeams = Object.values(groups).flat();

    if (allTeams.length === 0) return null;

    const totalMatches = allTeams.reduce((s, t) => s + t.played, 0) / 2;
    const totalGoals = allTeams.reduce((s, t) => s + t.goalsFor, 0);
    const totalWins = allTeams.reduce((s, t) => s + t.win, 0);
    const totalDraws = allTeams.reduce((s, t) => s + t.draw, 0) / 2;

    const sortedByGoals = [...allTeams].sort((a, b) => b.goalsFor - a.goalsFor);
    const topScoringTeam = sortedByGoals[0];

    const sortedByDefense = [...allTeams]
      .filter(t => t.played > 0)
      .sort((a, b) => a.goalsAgainst - b.goalsAgainst || b.played - a.played);
    const bestDefense = sortedByDefense[0];

    const sortedByDiff = [...allTeams].sort((a, b) => b.goalsDiff - a.goalsDiff);
    const bestDiff = sortedByDiff[0];

    const sortedByWins = [...allTeams].sort((a, b) => b.win - a.win);
    const mostWins = sortedByWins[0];

    // Most goals per group
    const groupGoals = Object.entries(groups).map(([name, teams]) => ({
      name,
      goals: teams.reduce((s, t) => s + t.goalsFor, 0),
      played: teams.reduce((s, t) => s + t.played, 0) / 2,
    }));
    const topGroup = [...groupGoals].sort((a, b) => b.goals - a.goals)[0];

    const avgGoals = totalMatches > 0 ? totalGoals / totalMatches : 0;

    return {
      totalMatches,
      totalGoals,
      totalDraws,
      totalWins,
      avgGoals,
      topScoringTeam,
      bestDefense,
      bestDiff,
      mostWins,
      topGroup,
      groupGoals,
    };
  }, [standingsData]);

  const topScorer = scorers?.players?.[0];
  const topAssist = assists?.players?.[0];

  /* =============== PLATFORM GATING =============== */
  // Web: locked for everyone — drive to app
  if (!isAndroidApp) {
    return (
      <div className="mt-4">
        <AppLockOverlay
          message="Tournament stats are exclusively available in the ProPredict app. Download now for full World Cup insights, live tracking, and arena points."
          buttonText="Open ProPredict App"
        />
      </div>
    );
  }

  // App: locked for free users — upgrade required
  if (plan === "free") {
    return (
      <div className="mt-4">
        <Card className="bg-card border-border p-6 text-center">
          <div className="p-2 rounded-full bg-primary/10 mb-2 inline-flex">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Tournament Stats Locked</p>
          <p className="text-xs text-muted-foreground mb-3 max-w-[280px] mx-auto">
            Upgrade to Pro or Premium to unlock live tournament statistics, top scorers, group insights, and arena rewards.
          </p>
          <div className="flex flex-col gap-2 max-w-[260px] mx-auto">
            <Button
              size="sm"
              onClick={() => navigate("/get-premium")}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" /> Get Pro — €3.99/mo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/get-premium")}
              className="text-xs border-fuchsia-500/40 text-fuchsia-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-300 gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" /> Get Premium — €5.99/mo
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (standingsLoading) {
    return (
      <div className="mt-4 grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-card border-border p-3 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats || stats.totalMatches === 0) {
    return (
      <Card className="mt-4 bg-card border-border p-6 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground mb-1">Stats Available Soon</p>
        <p className="text-xs text-muted-foreground">
          Tournament stats will appear once the first matches are played on June 11.
        </p>
      </Card>
    );
  }

  const tiles: StatTile[] = [
    { icon: Calendar, label: "Matches Played", value: String(stats.totalMatches), tone: "primary" },
    { icon: Goal, label: "Total Goals", value: String(stats.totalGoals), tone: "amber" },
    { icon: TrendingUp, label: "Goals / Match", value: stats.avgGoals.toFixed(2), tone: "fuchsia" },
    { icon: Users, label: "Draws", value: String(stats.totalDraws), tone: "sky" },
  ];

  return (
    <div className="mt-4 space-y-4">
      {/* Top stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tiles.map((t) => (
          <Card key={t.label} className="bg-card border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <t.icon className={`h-3.5 w-3.5 ${toneClass[t.tone]}`} />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.label}</span>
            </div>
            <p className={`text-xl font-bold ${toneClass[t.tone]}`}>{t.value}</p>
          </Card>
        ))}
      </div>

      {/* Leaders */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-yellow-400" /> Team Leaders
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <LeaderCard
            icon={Target}
            tone="amber"
            label="Most Goals"
            team={stats.topScoringTeam?.team}
            value={`${stats.topScoringTeam?.goalsFor} goals`}
            sub={`${stats.topScoringTeam?.played} played`}
          />
          <LeaderCard
            icon={Shield}
            tone="emerald"
            label="Best Defense"
            team={stats.bestDefense?.team}
            value={`${stats.bestDefense?.goalsAgainst} conceded`}
            sub={`${stats.bestDefense?.played} played`}
          />
          <LeaderCard
            icon={TrendingUp}
            tone="primary"
            label="Best Goal Diff."
            team={stats.bestDiff?.team}
            value={`${stats.bestDiff?.goalsDiff > 0 ? "+" : ""}${stats.bestDiff?.goalsDiff}`}
            sub={`${stats.bestDiff?.goalsFor}:${stats.bestDiff?.goalsAgainst}`}
          />
          <LeaderCard
            icon={Flame}
            tone="fuchsia"
            label="Most Wins"
            team={stats.mostWins?.team}
            value={`${stats.mostWins?.win} wins`}
            sub={`${stats.mostWins?.points} pts`}
          />
        </div>
      </div>

      {/* Player leaders */}
      {(topScorer || topAssist) && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
            <Goal className="h-4 w-4 text-amber-400" /> Player Leaders
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topScorer && (
              <PlayerCard label="Top Scorer" player={topScorer} statValue={topScorer.goals} statLabel="goals" tone="amber" />
            )}
            {topAssist && (
              <PlayerCard label="Top Assists" player={topAssist} statValue={topAssist.assists} statLabel="assists" tone="sky" />
            )}
          </div>
        </div>
      )}

      {/* Group goals */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-primary" /> Goals by Group
        </h3>
        <Card className="bg-card border-border overflow-hidden">
          <div className="divide-y divide-border">
            {stats.groupGoals
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((g) => {
                const isTop = g.name === stats.topGroup?.name;
                return (
                  <div key={g.name} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary w-12">Group {g.name}</span>
                      {isTop && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0">
                          🔥 Top
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-muted-foreground">{g.played} M</span>
                      <span className="font-mono font-bold text-foreground">{g.goals} G</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function LeaderCard({
  icon: Icon,
  tone,
  label,
  team,
  value,
  sub,
}: {
  icon: any;
  tone: StatTile["tone"];
  label: string;
  team?: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="bg-card border-border p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`h-3.5 w-3.5 ${toneClass[tone]}`} />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-bold text-foreground truncate">{team || "—"}</p>
      <p className={`text-xs font-semibold ${toneClass[tone]}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function PlayerCard({
  label,
  player,
  statValue,
  statLabel,
  tone,
}: {
  label: string;
  player: { name: string; photo: string | null; team: string | null; teamLogo: string | null };
  statValue: number;
  statLabel: string;
  tone: StatTile["tone"];
}) {
  return (
    <Card className="bg-card border-border p-3 flex items-center gap-3">
      {player.photo ? (
        <img src={player.photo} alt={player.name} className="h-12 w-12 rounded-full object-cover border border-border" />
      ) : (
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <Users className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground truncate">{player.name}</p>
        <div className="flex items-center gap-1.5">
          {player.teamLogo && <img src={player.teamLogo} alt="" className="h-3 w-3" />}
          <span className="text-[10px] text-muted-foreground truncate">{player.team}</span>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-xl font-bold ${toneClass[tone]}`}>{statValue}</p>
        <p className="text-[9px] uppercase text-muted-foreground">{statLabel}</p>
      </div>
    </Card>
  );
}
