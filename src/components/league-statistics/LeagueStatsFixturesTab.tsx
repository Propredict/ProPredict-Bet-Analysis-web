import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LeagueStatsFixturesTabProps {
  leagueId: string;
  leagueName: string;
}

// Mock data
const MOCK_FIXTURES = [
  { id: 1, date: "Sat, Jan 25", time: "15:00", home: "Liverpool", away: "Ipswich", venue: "Anfield" },
  { id: 2, date: "Sat, Jan 25", time: "15:00", home: "Bournemouth", away: "Nottm Forest", venue: "Vitality Stadium" },
  { id: 3, date: "Sat, Jan 25", time: "17:30", home: "Chelsea", away: "Wolves", venue: "Stamford Bridge" },
  { id: 4, date: "Sun, Jan 26", time: "14:00", home: "Man City", away: "Arsenal", venue: "Etihad Stadium" },
  { id: 5, date: "Sun, Jan 26", time: "16:30", home: "Newcastle", away: "Brighton", venue: "St James' Park" },
];

export function LeagueStatsFixturesTab({ leagueId, leagueName }: LeagueStatsFixturesTabProps) {
  return (
    <Card className="bg-[#0E1627] border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-orange-400" />
        <span className="font-semibold">{leagueName} Upcoming Fixtures</span>
      </div>
      <div className="divide-y divide-white/5">
        {MOCK_FIXTURES.map((fixture) => (
          <div key={fixture.id} className="px-4 py-3 flex items-center justify-between hover:bg-white/5">
            <div className="flex items-center gap-4">
              <div className="text-center min-w-[80px]">
                <p className="text-xs text-muted-foreground">{fixture.date}</p>
                <p className="text-sm font-semibold text-orange-400">{fixture.time}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{fixture.home} vs {fixture.away}</p>
                <p className="text-xs text-muted-foreground">{fixture.venue}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Upcoming
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
