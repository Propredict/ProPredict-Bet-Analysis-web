import { OddsBet } from "@/hooks/useMatchDetails";

interface OddsTabProps {
  odds: OddsBet[];
  loading: boolean;
}

export function OddsTab({ odds, loading }: OddsTabProps) {
  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Loading odds…
      </div>
    );
  }

  if (!odds || odds.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Odds not available for this match
      </div>
    );
  }

  // Find Match Winner (1X2) odds
  const matchWinner = odds.find(
    (o) => o.name?.toLowerCase().includes("winner") || o.name?.toLowerCase() === "match winner"
  );

  // Use the first available bet type if Match Winner not found
  const primaryOdds = matchWinner || odds[0];

  return (
    <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
      {/* Primary odds display */}
      {primaryOdds && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">
            {primaryOdds.name}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {primaryOdds.values?.map((val, idx) => (
              <div
                key={idx}
                className="bg-muted/50 rounded-lg p-3 text-center border border-white/5"
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {val.value}
                </div>
                <div className="text-lg font-bold text-primary">
                  {val.odd}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional markets */}
      {odds
        .filter((o) => o.id !== primaryOdds?.id)
        .slice(0, 4)
        .map((bet, idx) => (
          <div key={idx} className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">
              {bet.name}
            </div>
            <div className="flex flex-wrap gap-2">
              {bet.values?.slice(0, 6).map((val, vidx) => (
                <div
                  key={vidx}
                  className="bg-muted/30 rounded px-3 py-1.5 text-center border border-white/5"
                >
                  <div className="text-xs text-muted-foreground">
                    {val.value}
                  </div>
                  <div className="text-sm font-semibold">
                    {val.odd}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
