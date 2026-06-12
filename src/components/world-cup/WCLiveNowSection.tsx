import { useState } from "react";
import { Radio, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWCTodayFixtures, type WCTodayFixture } from "@/hooks/useWCTodayFixtures";
import { formatMatchTime } from "@/utils/formatMatchTime";
import { MatchCommentsButton } from "@/components/match-comments/MatchCommentsButton";
import { MatchCommentsInline } from "@/components/match-comments/MatchCommentsInline";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { GROUP_MATCHES } from "@/data/worldCup2026";

interface Props {
  onMatchClick?: (fixtureId: string) => void;
}

// ===== Fallback: derive today's WC fixtures from the static schedule
// when the API-Football endpoint hasn't published WC 2026 fixtures yet.
const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseCetToISO(dateStr: string, timeStr: string): string | null {
  // dateStr e.g. "Jun 11", timeStr e.g. "21:00" (CET / CEST = UTC+2 in June)
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const month = MONTHS[parts[0]];
  const day = parseInt(parts[1], 10);
  const [hh, mm] = timeStr.split(":").map((n) => parseInt(n, 10));
  if (month === undefined || isNaN(day) || isNaN(hh)) return null;
  // June is CEST (UTC+2). Build UTC by subtracting 2h.
  const d = new Date(Date.UTC(2026, month, day, hh - 2, mm || 0, 0));
  return d.toISOString();
}

function buildStaticTodayFallback(): WCTodayFixture[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  return GROUP_MATCHES
    .map((gm, idx) => {
      const iso = parseCetToISO(gm.date, gm.time);
      if (!iso) return null;
      const kickoff = new Date(iso);
      // Use the LOCAL day in the user's timezone — matches "today" from their POV.
      if (
        kickoff.getFullYear() !== y ||
        kickoff.getMonth() !== m ||
        kickoff.getDate() !== d
      ) return null;
      const fixture: WCTodayFixture = {
        id: `static-${idx}-${gm.home}-${gm.away}`,
        homeTeam: gm.home,
        awayTeam: gm.away,
        homeLogo: null,
        awayLogo: null,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
        statusShort: "NS",
        minute: null,
        startTime: iso,
        venue: gm.venue,
        round: `Group ${gm.group}`,
      };
      return fixture;
    })
    .filter((f): f is WCTodayFixture => f !== null)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
}

function MatchRow({ f, onClick }: { f: WCTodayFixture; onClick?: () => void }) {
  const isLive = f.status === "live" || f.status === "halftime";
  const isFinished = f.status === "finished";
  const hasScore = f.homeScore !== null && f.awayScore !== null;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const isAndroidApp = getIsAndroidApp();

  return (
    <div
      className={`relative w-full rounded-lg border p-2.5 transition-colors ${
        isLive
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-card"
      }`}
    >
      <button
        onClick={onClick}
        className="w-full text-left"
        aria-label={`Open ${f.homeTeam} vs ${f.awayTeam}`}
      >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">
          {f.round?.replace("Group stage - ", "Group ") ?? "World Cup 2026"}
        </span>
        {isLive ? (
          <Badge className="bg-destructive text-destructive-foreground border-0 text-[9px] px-1.5 py-0 h-4 gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {f.status === "halftime" ? "HT" : `${f.minute ?? 0}'`}
          </Badge>
        ) : isFinished ? (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" /> FT
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary gap-1">
            <Clock className="h-2.5 w-2.5" /> {f.startTime ? formatMatchTime(f.startTime) : "TBD"}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          {f.homeLogo && <img src={f.homeLogo} alt="" className="h-4 w-4 shrink-0 object-contain" />}
          <span className="text-xs font-medium text-foreground truncate">{f.homeTeam}</span>
        </div>
        <span className={`text-sm font-bold tabular-nums shrink-0 px-2 ${isLive ? "text-destructive" : "text-foreground"}`}>
          {hasScore ? `${f.homeScore} - ${f.awayScore}` : "vs"}
        </span>
        <div className="flex-1 flex items-center gap-1.5 min-w-0 justify-end">
          <span className="text-xs font-medium text-foreground truncate text-right">{f.awayTeam}</span>
          {f.awayLogo && <img src={f.awayLogo} alt="" className="h-4 w-4 shrink-0 object-contain" />}
        </div>
      </div>
      </button>

      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-end">
        <MatchCommentsButton
          matchId={f.id}
          homeTeam={f.homeTeam}
          awayTeam={f.awayTeam}
          matchLabel={isLive ? (f.status === "halftime" ? "HT" : `${f.minute ?? 0}'`) : isFinished ? "FT" : f.startTime ? formatMatchTime(f.startTime) : undefined}
          variant="pill"
          expanded={isAndroidApp ? commentsOpen : undefined}
          onToggleExpanded={isAndroidApp ? () => setCommentsOpen((v) => !v) : undefined}
        />
      </div>
      {isAndroidApp && commentsOpen && (
        <div className="-mx-2.5 -mb-2.5 mt-2 overflow-hidden rounded-b-lg">
          <MatchCommentsInline matchId={f.id} enabled={commentsOpen} />
        </div>
      )}
    </div>
  );
}

export default function WCLiveNowSection({ onMatchClick }: Props) {
  const { data, isLoading } = useWCTodayFixtures();
  const apiFixtures = data?.fixtures ?? [];
  // If API has no WC fixtures (e.g. tournament not yet indexed on API-Football),
  // fall back to the static schedule so today's matches still appear.
  const fixtures = apiFixtures.length > 0 ? apiFixtures : buildStaticTodayFallback();

  if (isLoading) {
    return (
      <Card className="border-border p-3">
        <div className="h-10 animate-pulse bg-muted/40 rounded" />
      </Card>
    );
  }

  const live = fixtures.filter((f) => f.status === "live" || f.status === "halftime");
  const upcoming = fixtures.filter((f) => f.status === "upcoming");

  if (live.length === 0 && upcoming.length === 0) {
    return (
      <Card className="border-border bg-card">
        <div className="p-4 text-center">
          <Radio className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No upcoming World Cup matches today</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">Check the full schedule below</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {live.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Radio className="h-3.5 w-3.5 text-destructive animate-pulse" />
            <h3 className="text-xs font-bold text-foreground">Live Now</h3>
            <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[9px] px-1.5 py-0 h-4">
              {live.length}
            </Badge>
            <span className="ml-auto text-[9px] text-muted-foreground">auto-refresh 30s</span>
          </div>
          <div className="space-y-1.5">
            {live.map((f) => (
              <MatchRow key={f.id} f={f} onClick={() => onMatchClick?.(f.id)} />
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-xs font-bold text-foreground">Today · Upcoming</h3>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary">
              {upcoming.length}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {upcoming.map((f) => (
              <MatchRow key={f.id} f={f} onClick={() => onMatchClick?.(f.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}