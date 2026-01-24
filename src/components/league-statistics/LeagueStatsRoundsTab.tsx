import { RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface LeagueStatsRoundsTabProps {
  leagueId: string;
  leagueName: string;
}

// Mock data
const MOCK_ROUNDS = [
  {
    round: 22,
    status: "current",
    matches: [
      { home: "Liverpool", away: "Ipswich", score: "—" },
      { home: "Bournemouth", away: "Nottm Forest", score: "—" },
      { home: "Chelsea", away: "Wolves", score: "—" },
    ],
  },
  {
    round: 21,
    status: "completed",
    matches: [
      { home: "Arsenal", away: "Aston Villa", score: "2 - 2" },
      { home: "Man City", away: "Chelsea", score: "3 - 1" },
      { home: "Liverpool", away: "Man United", score: "2 - 2" },
    ],
  },
  {
    round: 20,
    status: "completed",
    matches: [
      { home: "Spurs", away: "Arsenal", score: "1 - 2" },
      { home: "Newcastle", away: "Wolves", score: "3 - 0" },
      { home: "Brighton", away: "Everton", score: "1 - 0" },
    ],
  },
];

export function LeagueStatsRoundsTab({ leagueId, leagueName }: LeagueStatsRoundsTabProps) {
  const [selectedRound, setSelectedRound] = useState(22);

  const currentRoundData = MOCK_ROUNDS.find((r) => r.round === selectedRound);

  return (
    <div className="space-y-4">
      {/* Round Selector */}
      <Card className="bg-[#0E1627] border-white/10 p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <RotateCcw className="h-4 w-4 text-orange-400 flex-shrink-0" />
          <span className="text-sm font-medium mr-2 flex-shrink-0">Round:</span>
          {MOCK_ROUNDS.map((r) => (
            <Button
              key={r.round}
              size="sm"
              variant={selectedRound === r.round ? "default" : "outline"}
              onClick={() => setSelectedRound(r.round)}
              className="flex-shrink-0"
            >
              {r.round}
              {r.status === "current" && (
                <span className="ml-1 h-2 w-2 rounded-full bg-green-500" />
              )}
            </Button>
          ))}
        </div>
      </Card>

      {/* Round Matches */}
      <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <span className="font-semibold">Round {selectedRound}</span>
          <Badge
            variant="outline"
            className={
              currentRoundData?.status === "current"
                ? "text-green-400 border-green-500/30"
                : "text-muted-foreground"
            }
          >
            {currentRoundData?.status === "current" ? "In Progress" : "Completed"}
          </Badge>
        </div>
        <div className="divide-y divide-white/5">
          {currentRoundData?.matches.map((match, idx) => (
            <div
              key={idx}
              className="px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 hover:bg-white/5"
            >
              <span className="text-right text-sm truncate">{match.home}</span>
              <span className="min-w-[60px] text-center px-3 py-1 rounded-full text-sm font-semibold bg-white/10">
                {match.score}
              </span>
              <span className="text-left text-sm truncate">{match.away}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
