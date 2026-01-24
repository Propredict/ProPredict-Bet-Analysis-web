import { H2HMatch } from "@/hooks/useMatchDetails";
import { format } from "date-fns";

interface H2HTabProps {
  h2h: H2HMatch[];
  loading: boolean;
}

export function H2HTab({ h2h, loading }: H2HTabProps) {
  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Loading head-to-head…
      </div>
    );
  }

  if (!h2h || h2h.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Head-to-head data not available
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
      <div className="text-xs text-muted-foreground font-medium mb-2">
        Last {Math.min(h2h.length, 5)} meetings
      </div>

      {h2h.slice(0, 5).map((match, idx) => {
        const homeWon = match.teams.home.winner === true;
        const awayWon = match.teams.away.winner === true;
        const isDraw = match.teams.home.winner === null && match.teams.away.winner === null;

        let formattedDate = "";
        try {
          formattedDate = format(new Date(match.fixture.date), "MMM d, yyyy");
        } catch {
          formattedDate = "-";
        }

        return (
          <div
            key={idx}
            className="bg-muted/30 rounded-lg p-3 border border-white/5"
          >
            <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
              <span>{match.league?.name || "Unknown"}</span>
              <span>{formattedDate}</span>
            </div>

            <div className="flex items-center justify-between">
              {/* Home Team */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {match.teams.home.logo && (
                  <img
                    src={match.teams.home.logo}
                    alt=""
                    className="w-5 h-5 object-contain flex-shrink-0"
                  />
                )}
                <span
                  className={`text-sm truncate ${homeWon ? "font-bold text-green-400" : ""}`}
                >
                  {match.teams.home.name}
                </span>
              </div>

              {/* Score */}
              <div className="px-3 text-center">
                <span className="text-lg font-bold">
                  {match.goals.home ?? "-"} - {match.goals.away ?? "-"}
                </span>
              </div>

              {/* Away Team */}
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span
                  className={`text-sm truncate ${awayWon ? "font-bold text-green-400" : ""}`}
                >
                  {match.teams.away.name}
                </span>
                {match.teams.away.logo && (
                  <img
                    src={match.teams.away.logo}
                    alt=""
                    className="w-5 h-5 object-contain flex-shrink-0"
                  />
                )}
              </div>
            </div>

            {match.fixture.venue?.name && (
              <div className="text-xs text-muted-foreground mt-2 text-center">
                {match.fixture.venue.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
