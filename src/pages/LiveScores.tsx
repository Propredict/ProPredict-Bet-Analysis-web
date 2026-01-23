import { useState } from "react";
import { useLiveScores, DateMode, Match } from "@/hooks/useLiveScores";

export default function LiveScores() {
  const [dateMode, setDateMode] = useState<DateMode>("today");

  const { matches, isLoading, error, refetch } = useLiveScores(dateMode);

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live Scores</h1>
        <button onClick={refetch} className="px-4 py-2 rounded-md bg-green-500 text-black">
          Refresh
        </button>
      </div>

      {/* DATE FILTER */}
      <div className="flex gap-2">
        {(["yesterday", "today", "tomorrow"] as DateMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setDateMode(mode)}
            className={`px-4 py-2 rounded-md ${
              dateMode === mode ? "bg-green-500 text-black" : "bg-muted text-muted-foreground"
            }`}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      {/* STATES */}
      {isLoading && <p>Loading matches...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* MATCH LIST */}
      <div className="space-y-3">
        {matches.map((match: Match) => (
          <div key={match.id} className="flex items-center justify-between p-4 rounded-lg bg-card">
            <div className="flex items-center gap-3">
              <span className="font-semibold">{match.homeTeam}</span>
              <span className="text-lg font-bold">
                {match.homeScore ?? "-"} : {match.awayScore ?? "-"}
              </span>
              <span className="font-semibold">{match.awayTeam}</span>
            </div>

            <div className="text-sm text-muted-foreground">
              {match.status === "live" && <span className="text-red-500">LIVE {match.minute ?? ""}</span>}
              {match.status === "halftime" && "HT"}
              {match.status === "finished" && "FT"}
              {match.status === "upcoming" && match.startTime}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
