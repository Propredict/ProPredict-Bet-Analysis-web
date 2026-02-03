import { useState, useMemo } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import type { Match } from "@/hooks/useFixtures";

interface MatchPreviewSelectorProps {
  matches: Match[];
  selectedMatch: Match | null;
  onMatchSelect: (match: Match | null) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
}

export function MatchPreviewSelector({
  matches,
  selectedMatch,
  onMatchSelect,
  onGenerate,
  isGenerating,
  canGenerate,
}: MatchPreviewSelectorProps) {
  const [selectedLeague, setSelectedLeague] = useState<string>("");

  // Get unique leagues
  const leagues = useMemo(() => {
    const leagueSet = new Set<string>();
    matches.forEach((match) => {
      if (match.league) leagueSet.add(match.league);
    });
    return Array.from(leagueSet).sort();
  }, [matches]);

  // Filter matches by selected league
  const filteredMatches = useMemo(() => {
    if (!selectedLeague) return [];
    return matches.filter((match) => match.league === selectedLeague);
  }, [matches, selectedLeague]);

  const handleLeagueChange = (league: string) => {
    setSelectedLeague(league);
    onMatchSelect(null);
  };

  const handleMatchChange = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId) || null;
    onMatchSelect(match);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Select Match</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* League Selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">League</label>
          <Select value={selectedLeague} onValueChange={handleLeagueChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select league..." />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((league) => (
                <SelectItem key={league} value={league}>
                  {league}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Match Selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Match</label>
          <Select
            value={selectedMatch?.id || ""}
            onValueChange={handleMatchChange}
            disabled={!selectedLeague}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={selectedLeague ? "Select match..." : "Select league first"} />
            </SelectTrigger>
            <SelectContent>
              {filteredMatches.map((match) => (
                <SelectItem key={match.id} value={match.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{match.startTime}</span>
                    <span>{match.homeTeam} vs {match.awayTeam}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={onGenerate}
        disabled={!selectedMatch || isGenerating || !canGenerate}
        className="w-full bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600"
      >
        {isGenerating ? (
          <>
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            Generating Preview...
          </>
        ) : (
          "Generate Match Preview"
        )}
      </Button>

      {!canGenerate && selectedMatch && (
        <p className="text-xs text-center text-amber-400">
          You've reached your free preview limit. Upgrade to Pro for unlimited previews.
        </p>
      )}
    </Card>
  );
}
