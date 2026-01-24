import { Swords, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface LeagueStatsH2HTabProps {
  leagueId: string;
  leagueName: string;
}

// Mock team list
const TEAMS = [
  "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton",
  "Chelsea", "Crystal Palace", "Everton", "Fulham", "Ipswich",
  "Leicester", "Liverpool", "Man City", "Man United", "Newcastle",
  "Nottm Forest", "Southampton", "Spurs", "West Ham", "Wolves",
];

// Mock H2H data
const MOCK_H2H = {
  homeWins: 12,
  awayWins: 8,
  draws: 5,
  matches: [
    { date: "Oct 20, 2024", competition: "Premier League", home: "Liverpool", away: "Arsenal", homeScore: 2, awayScore: 2 },
    { date: "Feb 4, 2024", competition: "Premier League", home: "Arsenal", away: "Liverpool", homeScore: 3, awayScore: 1 },
    { date: "Dec 23, 2023", competition: "Premier League", home: "Liverpool", away: "Arsenal", homeScore: 1, awayScore: 1 },
    { date: "Apr 9, 2023", competition: "Premier League", home: "Liverpool", away: "Arsenal", homeScore: 2, awayScore: 2 },
    { date: "Oct 9, 2022", competition: "Premier League", home: "Arsenal", away: "Liverpool", homeScore: 3, awayScore: 2 },
  ],
};

export function LeagueStatsH2HTab({ leagueId, leagueName }: LeagueStatsH2HTabProps) {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [showResults, setShowResults] = useState(false);

  const filteredTeams1 = TEAMS.filter(
    (t) => t.toLowerCase().includes(team1.toLowerCase()) && t !== team2
  );
  const filteredTeams2 = TEAMS.filter(
    (t) => t.toLowerCase().includes(team2.toLowerCase()) && t !== team1
  );

  const handleSearch = () => {
    if (team1 && team2) {
      setShowResults(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Team Selector */}
      <Card className="bg-[#0E1627] border-white/10 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="h-4 w-4 text-orange-400" />
          <span className="font-semibold">Compare Teams</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Team 1</label>
            <Input
              placeholder="Search team..."
              value={team1}
              onChange={(e) => {
                setTeam1(e.target.value);
                setShowResults(false);
              }}
              className="bg-[#0E1627] border-white/10"
              list="team1-list"
            />
            <datalist id="team1-list">
              {filteredTeams1.slice(0, 5).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Team 2</label>
            <Input
              placeholder="Search team..."
              value={team2}
              onChange={(e) => {
                setTeam2(e.target.value);
                setShowResults(false);
              }}
              className="bg-[#0E1627] border-white/10"
              list="team2-list"
            />
            <datalist id="team2-list">
              {filteredTeams2.slice(0, 5).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={!team1 || !team2}
          className="mt-4 w-full py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-white/10 disabled:text-muted-foreground rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Search className="h-4 w-4" />
          Compare
        </button>
      </Card>

      {/* H2H Results */}
      {showResults && (
        <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 bg-white/5">
            <span className="font-semibold">{team1} vs {team2}</span>
          </div>

          {/* Summary */}
          <div className="p-4 border-b border-white/5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-400">{MOCK_H2H.homeWins}</p>
                <p className="text-xs text-muted-foreground">{team1} Wins</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{MOCK_H2H.draws}</p>
                <p className="text-xs text-muted-foreground">Draws</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{MOCK_H2H.awayWins}</p>
                <p className="text-xs text-muted-foreground">{team2} Wins</p>
              </div>
            </div>
          </div>

          {/* Match List */}
          <div className="divide-y divide-white/5">
            {MOCK_H2H.matches.map((match, idx) => (
              <div key={idx} className="px-4 py-3 hover:bg-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{match.date}</span>
                  <Badge variant="outline" className="text-xs">{match.competition}</Badge>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <span className="text-right text-sm truncate">{match.home}</span>
                  <span className="min-w-[60px] text-center px-3 py-1 rounded-full text-sm font-semibold bg-white/10">
                    {match.homeScore} - {match.awayScore}
                  </span>
                  <span className="text-left text-sm truncate">{match.away}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
