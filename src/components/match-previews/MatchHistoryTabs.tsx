import { useQuery } from "@tanstack/react-query";
import { BarChart3, ClipboardList, Goal, Lightbulb, Swords, Trophy } from "lucide-react";
import { useH2H, type H2HMatch } from "@/hooks/useH2H";
import { useMatchDetails } from "@/hooks/useMatchDetails";
import { cn } from "@/lib/utils";

type RecentFixture = {
  id: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  startTime: string;
};

type Props = {
  tab: "h2h" | "results";
  fixtureId: string;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  homeId: number | null;
  awayId: number | null;
  homeLogo: string | null;
  awayLogo: string | null;
};

const completed = new Set(["FT", "AET", "PEN", "finished"]);

async function fetchRecent(teamId: number): Promise<RecentFixture[]> {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-fixtures?team=${teamId}&last=10`);
  if (!response.ok) throw new Error("Recent results unavailable");
  const payload = await response.json();
  if (payload.unavailable) throw new Error("Recent results unavailable");
  return Array.isArray(payload.fixtures) ? payload.fixtures : [];
}

function HistoryPanel({ title, icon, children, right }: { title: string; icon: React.ReactNode; children: React.ReactNode; right?: string }) {
  return (
    <section className="overflow-hidden rounded-lg border border-stadium-line bg-stadium text-stadium-foreground">
      <div className="flex items-center gap-2 border-b border-stadium-line px-4 py-3">
        <span className="text-stadium-blue">{icon}</span>
        <h2 className="text-sm font-extrabold uppercase text-stadium-blue">{title}</h2>
        {right && <span className="ml-auto text-xs text-stadium-muted">{right}</span>}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

function Logo({ src, name }: { src: string | null | undefined; name: string }) {
  return src ? <img src={src} alt="" className="h-5 w-5 shrink-0 object-contain" /> : <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stadium-line text-[9px] font-bold">{name.slice(0, 1)}</span>;
}

function Bar({ value, tone }: { value: number; tone: "green" | "blue" | "red" }) {
  return <div className="h-2 overflow-hidden rounded-full bg-stadium-raised"><div className={cn("h-full rounded-full", tone === "green" ? "bg-stadium-green" : tone === "red" ? "bg-stadium-red" : "bg-stadium-blue")} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-stadium-muted">{children}</p>;
}

function ResultLetter({ result }: { result: "W" | "D" | "L" }) {
  return <span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black text-stadium", result === "W" ? "bg-stadium-green" : result === "L" ? "bg-stadium-red" : "bg-warning")}>{result}</span>;
}

function teamResults(fixtures: RecentFixture[], id: number, before: string) {
  const beforeMs = Date.parse(before);
  return fixtures.filter(f => completed.has(f.status) && f.homeScore != null && f.awayScore != null && (!Number.isFinite(beforeMs) || Date.parse(f.startTime) < beforeMs))
    .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime)).slice(0, 5)
    .map(f => {
      const own = f.homeTeamId === id ? f.homeScore ?? 0 : f.awayScore ?? 0;
      const against = f.homeTeamId === id ? f.awayScore ?? 0 : f.homeScore ?? 0;
      return { ...f, own, against, result: (own > against ? "W" : own < against ? "L" : "D") as "W" | "D" | "L" };
    });
}

export function MatchHistoryTabs({ tab, fixtureId, matchDate, homeTeam, awayTeam, homeId, awayId, homeLogo, awayLogo }: Props) {
  // Today's fixture may not be in the live feed; resolve its real team IDs from match details.
  const { data: details, loading: detailLoading } = useMatchDetails(!homeId || !awayId ? fixtureId : null);
  const firstId = homeId || details?.teams?.home?.id || null;
  const secondId = awayId || details?.teams?.away?.id || null;
  const firstLogo = homeLogo || details?.teams?.home?.logo;
  const secondLogo = awayLogo || details?.teams?.away?.logo;
  const { data: h2h, isLoading: h2hLoading, isError: h2hError } = useH2H(tab === "h2h" ? firstId : null, tab === "h2h" ? secondId : null);
  const { data: recent, isLoading: resultsLoading, isError: resultsError } = useQuery({
    queryKey: ["preview-recent-results", firstId, secondId],
    queryFn: async () => {
      if (!firstId || !secondId) return [[], []] as RecentFixture[][];
      return Promise.all([fetchRecent(firstId), fetchRecent(secondId)]);
    },
    enabled: tab === "results" && !!firstId && !!secondId,
    staleTime: 10 * 60 * 1000,
  });

  if (detailLoading || (tab === "h2h" ? h2hLoading : resultsLoading)) return <div className="rounded-lg border border-stadium-line bg-stadium p-8 text-center text-stadium-muted">Loading match history…</div>;
  if (!firstId || !secondId) return <div className="rounded-lg border border-stadium-line bg-stadium p-8 text-center text-stadium-muted">Team history is not available for this match.</div>;
  if (tab === "h2h") {
    const matches = (h2h?.seasons?.flatMap(s => s.matches) || []).filter(m => m.goals.home != null && m.goals.away != null && completed.has(m.fixture.status?.short))
      .sort((a, b) => Date.parse(b.fixture.date) - Date.parse(a.fixture.date)).slice(0, 10);
    if (h2hError) return <Empty>Head-to-head results are temporarily unavailable.</Empty>;
    if (!matches.length) return <HistoryPanel title="Head to Head" icon={<Swords className="h-4 w-4" />}><Empty>No previous meetings available.</Empty></HistoryPanel>;
    const wins = matches.reduce((acc, m) => {
      const home = m.goals.home ?? 0, away = m.goals.away ?? 0;
      if (home === away) acc[1]++;
      else if ((home > away ? m.teams.home.id : m.teams.away.id) === firstId) acc[0]++;
      else acc[2]++;
      return acc;
    }, [0, 0, 0]);
    const totalGoals = matches.reduce((n, m) => n + (m.goals.home ?? 0) + (m.goals.away ?? 0), 0);
    const btts = matches.filter(m => (m.goals.home ?? 0) > 0 && (m.goals.away ?? 0) > 0).length;
    const over = matches.filter(m => (m.goals.home ?? 0) + (m.goals.away ?? 0) > 2).length;
    return <div className="space-y-3">
      <HistoryPanel title="Head to Head" icon={<Swords className="h-4 w-4" />} right={`Last ${matches.length} meetings`}>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[{ label: `${homeTeam} Wins`, number: wins[0], tone: "green" as const }, { label: "Draws", number: wins[1], tone: "blue" as const }, { label: `${awayTeam} Wins`, number: wins[2], tone: "red" as const }].map(s => <div key={s.label} className="min-w-0 rounded-md border border-stadium-line bg-stadium-raised p-2 sm:p-3">
            <div className="min-h-8 text-[10px] font-bold text-stadium-muted break-words">{s.label}</div>
            <div className={cn("text-2xl font-black", s.tone === "green" ? "text-stadium-green" : s.tone === "red" ? "text-stadium-red" : "text-stadium-foreground")}>{s.number}</div>
            <Bar value={s.number / matches.length * 100} tone={s.tone} />
          </div>)}
        </div>
      </HistoryPanel>
      <HistoryPanel title="Last Head to Head Matches" icon={<Swords className="h-4 w-4" />}>
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-xs"><thead className="text-stadium-muted"><tr className="border-b border-stadium-line"><th className="p-2 text-left font-medium">Date</th><th className="p-2 text-right font-medium">Home</th><th className="p-2 text-center font-medium">Score</th><th className="p-2 text-left font-medium">Away</th><th className="p-2 text-left font-medium">Competition</th></tr></thead><tbody>{matches.map((m: H2HMatch) => <tr key={m.fixture.id} className="border-b border-stadium-line/50 odd:bg-stadium-raised/50 last:border-0"><td className="whitespace-nowrap p-2 text-stadium-muted">{new Date(m.fixture.date).toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" })}</td><td className="p-2 text-right">{m.teams.home.name}</td><td className="p-2 text-center"><span className={cn("inline-block min-w-12 rounded px-2 py-1 font-black text-stadium", m.goals.home === m.goals.away ? "bg-stadium-blue" : "bg-stadium-green")}>{m.goals.home} - {m.goals.away}</span></td><td className="p-2">{m.teams.away.name}</td><td className="p-2 text-stadium-muted">{m.league.name}</td></tr>)}</tbody></table></div>
      </HistoryPanel>
      <HistoryPanel title="H2H Goals Stats" icon={<Goal className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ label: "Matches", value: matches.length }, { label: "Total Goals", value: totalGoals, detail: `${(totalGoals / matches.length).toFixed(1)} per match` }, { label: "Both Teams Scored", value: `${btts}/${matches.length}`, detail: `${Math.round(btts / matches.length * 100)}%` }, { label: "Over 2.5 Goals", value: `${over}/${matches.length}`, detail: `${Math.round(over / matches.length * 100)}%` }].map(s => <div key={s.label} className="rounded-md border border-stadium-line bg-stadium-raised p-3 text-center"><div className="text-xs text-stadium-muted">{s.label}</div><div className="text-xl font-black">{s.value}</div>{s.detail && <div className="text-[10px] text-stadium-green">{s.detail}</div>}</div>)}</div>
      </HistoryPanel>
      <HistoryPanel title="Goals Distribution (H2H)" icon={<BarChart3 className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-3">{[{ name: homeTeam, logo: firstLogo, id: firstId, tone: "green" as const }, { name: awayTeam, logo: secondLogo, id: secondId, tone: "blue" as const }].map(t => { const goals = matches.reduce((n, m) => n + (m.teams.home.id === t.id ? m.goals.home ?? 0 : m.goals.away ?? 0), 0); return <div key={t.id} className="min-w-0 rounded-md border border-stadium-line bg-stadium-raised p-3"><div className="flex items-center gap-2 text-xs font-bold"><Logo src={t.logo} name={t.name} /><span className="truncate">{t.name}</span></div><div className="mt-2 text-xl font-black">{(goals / matches.length).toFixed(1)} <span className="text-xs font-normal text-stadium-muted">goals per match</span></div><Bar value={totalGoals ? goals / totalGoals * 100 : 0} tone={t.tone} /><div className="mt-1 text-xs text-stadium-muted">{goals} total goals</div></div>; })}</div>
      </HistoryPanel>
      <HistoryPanel title="H2H Summary" icon={<ClipboardList className="h-4 w-4" />}><p className="text-sm leading-relaxed text-stadium-muted">In the last {matches.length} meetings, {homeTeam} won {wins[0]}, {awayTeam} won {wins[2]}, and {wins[1]} ended in a draw. The teams scored {totalGoals} goals in total.</p></HistoryPanel>
    </div>;
  }

  if (resultsError) return <Empty>Recent results are temporarily unavailable.</Empty>;
  const home = teamResults(recent?.[0] || [], firstId, matchDate);
  const away = teamResults(recent?.[1] || [], secondId, matchDate);
  const teams = [{ name: homeTeam, logo: firstLogo, games: home, id: firstId }, { name: awayTeam, logo: secondLogo, games: away, id: secondId }];
  return <div className="space-y-3">
    <HistoryPanel title="Recent Results" icon={<Trophy className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">{teams.map(team => <div key={team.id} className="min-w-0 overflow-hidden rounded-md border border-stadium-line bg-stadium-raised">
        <div className="flex min-w-0 items-center gap-2 border-b border-stadium-line px-2 py-2 text-xs font-bold sm:px-3"><Logo src={team.logo} name={team.name} /><span className="min-w-0 flex-1 truncate">{team.name} · Last {team.games.length}</span></div>
        {team.games.length ? team.games.map(game => <div key={game.id} className="flex items-center gap-1 border-b border-stadium-line/50 px-1.5 py-2 text-[10px] last:border-0 sm:gap-2 sm:px-3 sm:text-xs"><span className="hidden shrink-0 text-stadium-muted sm:inline">{new Date(game.startTime).toLocaleDateString("en-GB", { month: "2-digit", day: "2-digit" })}</span><span className="min-w-0 flex-1 truncate">{game.homeTeamId === team.id ? game.awayTeam : game.homeTeam}</span><span className="shrink-0 font-bold">{game.own} - {game.against}</span><ResultLetter result={game.result} /></div>) : <Empty>No completed matches available.</Empty>}
      </div>)}</div>
    </HistoryPanel>
    <HistoryPanel title="Form (Last 5 Matches)" icon={<BarChart3 className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">{teams.map(team => { const wins = team.games.filter(g => g.result === "W").length; const draws = team.games.filter(g => g.result === "D").length; const losses = team.games.filter(g => g.result === "L").length; const scored = team.games.reduce((n, g) => n + g.own, 0); const conceded = team.games.reduce((n, g) => n + g.against, 0); return <div key={team.id} className="min-w-0 rounded-md border border-stadium-line bg-stadium-raised p-2 sm:p-3"><div className="flex min-w-0 items-center gap-2 text-xs font-bold"><Logo src={team.logo} name={team.name} /><span className="truncate">{team.name}</span></div>{team.games.length ? <><div className="my-3 flex flex-wrap gap-1">{team.games.map(g => <ResultLetter key={g.id} result={g.result} />)}</div><div className="text-xs text-stadium-muted">{wins} Wins · {draws} Draws · {losses} Losses</div><div className="mt-2 flex h-2 overflow-hidden rounded-full bg-stadium"><div className="bg-stadium-green" style={{ width: `${wins / team.games.length * 100}%` }} /><div className="bg-warning" style={{ width: `${draws / team.games.length * 100}%` }} /><div className="bg-stadium-red" style={{ width: `${losses / team.games.length * 100}%` }} /></div><div className="mt-2 text-xs text-stadium-muted">{scored} Goals Scored · {conceded} Conceded</div></> : <Empty>No form data available.</Empty>}</div>; })}</div>
    </HistoryPanel>
    <HistoryPanel title="Results Statistics" icon={<BarChart3 className="h-4 w-4" />}>
      <div className="space-y-3">{[{ label: "Goals Scored", value: (g: typeof home) => g.reduce((n, m) => n + m.own, 0) / (g.length || 1), max: 4 }, { label: "Goals Conceded", value: (g: typeof home) => g.reduce((n, m) => n + m.against, 0) / (g.length || 1), max: 4 }, { label: "Both Teams Scored", value: (g: typeof home) => g.filter(m => m.own > 0 && m.against > 0).length / (g.length || 1) * 100, max: 100 }, { label: "Over 2.5 Goals", value: (g: typeof home) => g.filter(m => m.own + m.against > 2).length / (g.length || 1) * 100, max: 100 }, { label: "Clean Sheets", value: (g: typeof home) => g.filter(m => m.against === 0).length / (g.length || 1) * 100, max: 100 }].map(s => <div key={s.label} className="grid grid-cols-[minmax(80px,1fr)_minmax(0,2fr)_minmax(0,2fr)] items-center gap-2 text-[10px] sm:text-xs"><span className="text-stadium-muted">{s.label}</span>{[home, away].map((games, index) => <div key={index} className="flex min-w-0 items-center gap-1"><span className="w-7 shrink-0 text-right">{games.length ? (s.max === 4 ? s.value(games).toFixed(1) : `${Math.round(s.value(games))}%`) : "—"}</span><div className="min-w-0 flex-1"><Bar value={games.length ? s.value(games) / s.max * 100 : 0} tone={index === 0 ? "green" : "blue"} /></div></div>)}</div>)}</div>
    </HistoryPanel>
    {home.length > 0 && away.length > 0 && <HistoryPanel title="Results Summary" icon={<Lightbulb className="h-4 w-4" />}><p className="text-sm text-stadium-muted">{homeTeam}: {home.filter(g => g.result === "W").length} wins in {home.length} recent matches. {awayTeam}: {away.filter(g => g.result === "W").length} wins in {away.length} recent matches.</p></HistoryPanel>}
  </div>;
}