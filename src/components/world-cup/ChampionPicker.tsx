import { useMemo, useState } from "react";
import { Trophy, Lock, Check, ChevronLeft, Sparkles, Users, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChampionPrediction } from "@/hooks/useChampionPrediction";
import { TEAMS } from "@/data/worldCup2026";
import { toast } from "@/hooks/use-toast";

// Build pots from FIFA ranking (lowest = best). 48 teams → 4 pots × 12.
function buildPots() {
  const all = Object.values(TEAMS).sort((a, b) => a.fifaRank - b.fifaRank);
  return {
    1: all.slice(0, 12),
    2: all.slice(12, 24),
    3: all.slice(24, 36),
    4: all.slice(36, 48),
  };
}

const POT_LABELS: Record<number, { title: string; sub: string; color: string }> = {
  1: { title: "Pot 1", sub: "Top contenders", color: "from-amber-500 to-yellow-500" },
  2: { title: "Pot 2", sub: "Strong challengers", color: "from-fuchsia-500 to-violet-500" },
  3: { title: "Pot 3", sub: "Dark horses", color: "from-sky-500 to-cyan-500" },
  4: { title: "Pot 4", sub: "Underdogs", color: "from-emerald-500 to-teal-500" },
};

export default function ChampionPicker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { myPick, leaderboard, loading, submitting, castVote, totalVotes, isLocked } = useChampionPrediction();

  const pots = useMemo(buildPots, []);
  const [step, setStep] = useState<"pot" | "team" | "confirm">("pot");
  const [selectedPot, setSelectedPot] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<typeof TEAMS[string] | null>(null);

  const formatDeadline = (iso?: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleConfirm = async () => {
    if (!selectedTeam) return;
    if (!user) {
      navigate("/login");
      return;
    }
    const res: any = await castVote(selectedTeam.name, selectedTeam.code, selectedTeam.flag);
    if (res?.success) {
      toast({
        title: res.updated ? "Pick updated! 🎯" : "Pick locked in! 🏆",
        description: `You're predicting ${selectedTeam.name} to win the World Cup.`,
      });
      setStep("pot");
      setSelectedPot(null);
      setSelectedTeam(null);
    } else {
      toast({
        title: "Could not save pick",
        description: res?.error === "deadline_passed" ? "Voting deadline has passed." : "Try again later.",
        variant: "destructive",
      });
    }
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="px-3 py-8 text-center text-sm text-muted-foreground">Loading champion picker…</div>
    );
  }

  // ---- Resolved state (final result) ----
  if (myPick?.status === "resolved" && myPick.winner_team) {
    const userWon = myPick.team_name === myPick.winner_team;
    return (
      <div className="px-3 py-4 space-y-4">
        <Card className="overflow-hidden border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card">
          <div className="p-5 text-center">
            <Crown className="h-10 w-10 text-amber-400 mx-auto mb-2" />
            <p className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold mb-1">World Cup 2026 Champion</p>
            <h2 className="text-2xl font-bold text-foreground mb-2">{myPick.winner_team}</h2>
            {myPick.has_vote && (
              <div className={`mt-3 p-3 rounded-lg ${userWon ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-muted/50 border border-border"}`}>
                <p className="text-xs text-muted-foreground mb-1">Your pick</p>
                <p className="text-base font-bold text-foreground">
                  {myPick.team_flag} {myPick.team_name}
                </p>
                {userWon ? (
                  <p className="text-xs text-emerald-400 font-semibold mt-2">🎉 You won 1 month FREE Premium!</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">Better luck next time</p>
                )}
              </div>
            )}
          </div>
        </Card>
        <Leaderboard rows={leaderboard} totalVotes={totalVotes} winnerTeam={myPick.winner_team} />
      </div>
    );
  }

  // ---- User already voted (and still open or closed-not-resolved) ----
  if (myPick?.has_vote && step === "pot") {
    const canChange = myPick.status === "open" && new Date(myPick.deadline) > new Date();
    return (
      <div className="px-3 py-4 space-y-4">
        <Card className="overflow-hidden border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/10 via-card to-card">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-full bg-fuchsia-500/15">
                <Trophy className="h-5 w-5 text-fuchsia-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-fuchsia-400 font-semibold">Your Champion Pick</p>
                <h3 className="text-base font-bold text-foreground">
                  {myPick.team_flag} {myPick.team_name}
                </h3>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-4">
              <div className="flex items-center gap-1.5">
                {isLocked ? <Lock className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-fuchsia-400" />}
                <span>
                  {isLocked
                    ? "Voting closed — awaiting result"
                    : `Lock-in by ${formatDeadline(myPick.deadline)}`}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] border-fuchsia-500/40 text-fuchsia-400">
                <Check className="h-2.5 w-2.5 mr-1" /> Locked in
              </Badge>
            </div>
            {canChange && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setStep("pot"); setSelectedPot(null); setSelectedTeam(null); setStep("pot"); }}
                className="w-full text-xs border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/10"
              >
                Change my pick
              </Button>
            )}
            <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-[11px] text-amber-300/90">
                🏆 If your pick wins the World Cup, you get <strong>1 month FREE Premium</strong>
              </p>
            </div>
          </div>
        </Card>
        <Leaderboard rows={leaderboard} totalVotes={totalVotes} myTeam={myPick.team_name ?? undefined} />
      </div>
    );
  }

  // ---- Locked, no vote ----
  if (isLocked && !myPick?.has_vote) {
    return (
      <div className="px-3 py-4 space-y-4">
        <Card className="border-border">
          <div className="p-5 text-center">
            <Lock className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
            <h3 className="text-sm font-bold text-foreground mb-1">Voting closed</h3>
            <p className="text-[11px] text-muted-foreground">
              The deadline to predict the champion has passed. Check the leaderboard below to see what others picked.
            </p>
          </div>
        </Card>
        <Leaderboard rows={leaderboard} totalVotes={totalVotes} />
      </div>
    );
  }

  // ---- Voting flow ----

  // STEP 1 — choose pot
  if (step === "pot") {
    return (
      <div className="px-3 py-4 space-y-4">
        <HeroBanner deadline={formatDeadline(myPick?.deadline)} />
        <div className="grid grid-cols-2 gap-2.5">
          {[1, 2, 3, 4].map((p) => {
            const meta = POT_LABELS[p];
            return (
              <button
                key={p}
                onClick={() => { setSelectedPot(p); setStep("team"); }}
                className="text-left rounded-xl border border-border bg-card hover:border-primary/40 transition-all p-3.5 group active:scale-[0.98]"
              >
                <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br ${meta.color} mb-2`}>
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-bold text-foreground">{meta.title}</p>
                <p className="text-[10px] text-muted-foreground">{meta.sub}</p>
                <p className="text-[10px] text-primary mt-1.5 font-semibold">12 teams →</p>
              </button>
            );
          })}
        </div>
        <Leaderboard rows={leaderboard} totalVotes={totalVotes} compact />
      </div>
    );
  }

  // STEP 2 — choose team within pot
  if (step === "team" && selectedPot !== null) {
    const teams = pots[selectedPot as 1 | 2 | 3 | 4];
    const meta = POT_LABELS[selectedPot];
    return (
      <div className="px-3 py-4 space-y-3">
        <button onClick={() => setStep("pot")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to pots
        </button>
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
            <Trophy className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{meta.title}</p>
            <p className="text-[10px] text-muted-foreground">Tap a team to predict champion</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {teams.map((t) => (
            <button
              key={t.code}
              onClick={() => { setSelectedTeam(t); setStep("confirm"); }}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl">{t.flag}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.confederation}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground shrink-0">
                #{t.fifaRank}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // STEP 3 — confirm
  if (step === "confirm" && selectedTeam) {
    return (
      <div className="px-3 py-6 space-y-4">
        <button onClick={() => setStep("team")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> Choose another team
        </button>
        <Card className="overflow-hidden border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/15 via-violet-500/5 to-card">
          <div className="p-6 text-center">
            <Crown className="h-9 w-9 text-amber-400 mx-auto mb-3" />
            <p className="text-[10px] uppercase tracking-wider text-fuchsia-400 font-semibold mb-2">Your Champion Pick</p>
            <p className="text-5xl mb-2">{selectedTeam.flag}</p>
            <h2 className="text-xl font-bold text-foreground mb-1">{selectedTeam.name}</h2>
            <p className="text-[11px] text-muted-foreground">FIFA Rank #{selectedTeam.fifaRank} · {selectedTeam.confederation}</p>

            <div className="mt-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-left">
              <p className="text-[11px] text-amber-300 font-semibold mb-1">🏆 If they win:</p>
              <p className="text-[11px] text-amber-200/90">You get <strong>1 month FREE Premium</strong> + Champion Predictor badge</p>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full mt-4 bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600 text-white font-semibold"
            >
              {submitting ? "Locking in…" : myPick?.has_vote ? "Update my pick" : "Lock in my pick"}
            </Button>
            <p className="text-[9px] text-muted-foreground mt-2">
              You can change your pick anytime before {formatDeadline(myPick?.deadline)}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}

// ----------- Sub-components -----------

function HeroBanner({ deadline }: { deadline: string }) {
  return (
    <Card className="overflow-hidden border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-card">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shrink-0">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground leading-tight">Predict the Champion</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pick who will lift the trophy. If you're right, win <span className="text-amber-400 font-semibold">1 month FREE Premium</span>.
            </p>
            {deadline && (
              <p className="text-[10px] text-fuchsia-300 mt-2">⏱️ Pick by {deadline}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Leaderboard({
  rows, totalVotes, myTeam, winnerTeam, compact,
}: {
  rows: { team_name: string; team_flag: string | null; votes: number; percentage: number }[];
  totalVotes: number;
  myTeam?: string;
  winnerTeam?: string;
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Card className="border-border">
        <div className="p-4 text-center">
          <Users className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Be the first to predict the champion!</p>
        </div>
      </Card>
    );
  }
  const display = compact ? rows.slice(0, 5) : rows.slice(0, 12);
  return (
    <Card className="border-border">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" /> Community Picks
          </h3>
          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
            {totalVotes.toLocaleString()} votes
          </Badge>
        </div>
        <div className="space-y-1.5">
          {display.map((r) => {
            const isMine = r.team_name === myTeam;
            const isWinner = r.team_name === winnerTeam;
            return (
              <div
                key={r.team_name}
                className={`relative overflow-hidden rounded-lg border p-2 ${
                  isWinner ? "border-amber-500/50 bg-amber-500/5"
                  : isMine ? "border-fuchsia-500/40 bg-fuchsia-500/5"
                  : "border-border bg-card"
                }`}
              >
                <div
                  className={`absolute inset-y-0 left-0 ${
                    isWinner ? "bg-amber-500/15" : isMine ? "bg-fuchsia-500/15" : "bg-primary/10"
                  }`}
                  style={{ width: `${r.percentage}%` }}
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{r.team_flag ?? "🏳️"}</span>
                    <span className="text-xs font-medium text-foreground truncate">{r.team_name}</span>
                    {isWinner && <Crown className="h-3 w-3 text-amber-400 shrink-0" />}
                    {isMine && <Check className="h-3 w-3 text-fuchsia-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[11px]">
                    <span className="text-muted-foreground">{Number(r.votes).toLocaleString()}</span>
                    <span className="font-bold text-foreground tabular-nums w-10 text-right">
                      {Number(r.percentage).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {compact && rows.length > 5 && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">+{rows.length - 5} more teams</p>
        )}
      </div>
    </Card>
  );
}
