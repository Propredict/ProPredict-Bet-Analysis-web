import { Radio, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWCTodayFixtures, type WCTodayFixture } from "@/hooks/useWCTodayFixtures";
import { formatMatchTime } from "@/utils/formatMatchTime";
import { MatchCommentsButton } from "@/components/match-comments/MatchCommentsButton";

interface Props {
  onMatchClick?: (fixtureId: string) => void;
}

function MatchRow({ f, onClick }: { f: WCTodayFixture; onClick?: () => void }) {
  const isLive = f.status === "live" || f.status === "halftime";
  const isFinished = f.status === "finished";
  const hasScore = f.homeScore !== null && f.awayScore !== null;

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
        />
      </div>
    </div>
  );
}

export default function WCLiveNowSection({ onMatchClick }: Props) {
  const { data, isLoading } = useWCTodayFixtures();
  const fixtures = data?.fixtures ?? [];

  if (isLoading) {
    return (
      <Card className="border-border p-3">
        <div className="h-10 animate-pulse bg-muted/40 rounded" />
      </Card>
    );
  }

  const live = fixtures.filter((f) => f.status === "live" || f.status === "halftime");
  const upcoming = fixtures.filter((f) => f.status === "upcoming");
  const finished = fixtures.filter((f) => f.status === "finished");

  if (fixtures.length === 0) {
    return (
      <Card className="border-border bg-card">
        <div className="p-4 text-center">
          <Radio className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No World Cup matches today</p>
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

      {finished.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-bold text-foreground">Today · Finished</h3>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground">
              {finished.length}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {finished.map((f) => (
              <MatchRow key={f.id} f={f} onClick={() => onMatchClick?.(f.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}