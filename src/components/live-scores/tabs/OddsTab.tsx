import { OddsBet, OddsValue } from "@/hooks/useMatchDetails";
import { cn } from "@/lib/utils";
import { TrendingUp, DollarSign } from "lucide-react";

interface OddsTabProps {
  odds: OddsBet[];
  loading: boolean;
}

function OddsChip({ label, value, variant = "default" }: { label: string; value: string; variant?: "positive" | "negative" | "default" }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-muted/40 border border-border/40 rounded px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className={cn(
        "text-xs font-bold",
        variant === "positive" ? "text-emerald-400" : 
        variant === "negative" ? "text-primary" : 
        "text-primary"
      )}>
        {value}
      </span>
    </div>
  );
}

function OddsMarketGroup({ title, values }: { title: string; values: OddsValue[] }) {
  if (!values || values.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="flex flex-wrap gap-2">
        {values.slice(0, 8).map((val, idx) => {
          const isOver = val.value?.toLowerCase().includes("over") || val.value?.toLowerCase().includes("yes");
          const isUnder = val.value?.toLowerCase().includes("under") || val.value?.toLowerCase().includes("no");
          return (
            <OddsChip
              key={idx}
              label={val.value}
              value={val.odd}
              variant={isOver ? "positive" : isUnder ? "negative" : "default"}
            />
          );
        })}
      </div>
    </div>
  );
}

export function OddsTab({ odds, loading }: OddsTabProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-10 w-24 bg-muted rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!odds || odds.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
           <DollarSign className="w-7 h-7 text-muted-foreground" />
         </div>
         <p className="text-sm font-medium text-foreground mb-1">Probability data not available</p>
         <p className="text-xs text-muted-foreground">Probability data is not available for this match</p>
      </div>
    );
  }

  // Categorize odds
  const liveOdds = odds.filter(o =>
    o.name?.toLowerCase().includes("goal") ||
    o.name?.toLowerCase().includes("interval") ||
    o.name?.toLowerCase().includes("shots") ||
    o.name?.toLowerCase().includes("total")
  );

  const matchWinner = odds.find(o =>
    o.name?.toLowerCase().includes("winner") ||
    o.name?.toLowerCase() === "match winner" ||
    o.name?.toLowerCase().includes("1x2") ||
    o.name?.toLowerCase() === "home/away"
  );

  const otherOdds = odds.filter(o =>
    o !== matchWinner && !liveOdds.includes(o)
  ).slice(0, 4);

  const hasLiveOdds = liveOdds.length > 0;
  const hasPreMatchOdds = matchWinner || otherOdds.length > 0;

  return (
    <div className="max-h-[450px] overflow-y-auto">
      {/* Live Odds Section */}
      {hasLiveOdds && (
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center gap-2 text-sm font-medium text-primary mb-4">
            <TrendingUp className="w-4 h-4" />
             Live Probabilities
          </div>
          <div className="space-y-4">
            {liveOdds.slice(0, 4).map((bet, idx) => (
              <OddsMarketGroup key={idx} title={bet.name} values={bet.values || []} />
            ))}
          </div>
        </div>
      )}

      {/* Pre-Match Odds Section */}
      {hasPreMatchOdds && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
             Pre-Match Probabilities
          </div>

          {/* Match Winner 1X2 */}
          {matchWinner && matchWinner.values && matchWinner.values.length >= 3 && (
            <div className="bg-card/40 rounded-lg border border-border/40 p-4">
              <div className="text-xs text-muted-foreground mb-3">{matchWinner.name || "Match Winner"}</div>
              <div className="grid grid-cols-3 gap-3">
                {matchWinner.values.slice(0, 3).map((val, idx) => (
                  <div
                    key={idx}
                    className="bg-muted/30 rounded-lg p-4 text-center border border-border/30 hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    <div className="text-[10px] text-muted-foreground uppercase mb-1.5">
                      {val.value}
                    </div>
                    <div className="text-xl font-bold text-primary">
                      {val.odd}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Markets */}
          {otherOdds.length > 0 && (
            <div className="space-y-4 pt-2">
              {otherOdds.map((bet, idx) => (
                <OddsMarketGroup key={idx} title={bet.name} values={bet.values || []} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fallback if no categorized odds */}
      {!hasLiveOdds && !hasPreMatchOdds && odds.length > 0 && (
        <div className="p-4 space-y-4">
          {odds.slice(0, 5).map((bet, idx) => (
            <OddsMarketGroup key={idx} title={bet.name} values={bet.values || []} />
          ))}
        </div>
      )}
    </div>
  );
}
