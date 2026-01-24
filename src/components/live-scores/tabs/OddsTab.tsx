import { OddsBet, OddsValue } from "@/hooks/useMatchDetails";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface OddsTabProps {
  odds: OddsBet[];
  loading: boolean;
}

interface OddsChipProps {
  label: string;
  value: string;
  variant?: "primary" | "secondary";
}

function OddsChip({ label, value, variant = "secondary" }: OddsChipProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm",
        variant === "primary"
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-muted/30 border-border/30"
      )}
    >
      <span className="text-muted-foreground text-xs">{label}:</span>
      <span className="font-semibold text-primary">{value}</span>
    </div>
  );
}

interface OddsGroupProps {
  title: string;
  values: OddsValue[];
}

function OddsGroup({ title, values }: OddsGroupProps) {
  if (!values || values.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground font-medium">{title}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((val, idx) => (
          <OddsChip key={idx} label={val.value} value={val.odd} />
        ))}
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
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="flex gap-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-8 w-20 bg-muted rounded-full" />
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
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Odds not available for this match</p>
      </div>
    );
  }

  // Categorize odds
  const liveOdds = odds.filter(o =>
    o.name?.toLowerCase().includes("live") ||
    o.name?.toLowerCase().includes("goal in interval") ||
    o.name?.toLowerCase().includes("3rd goal")
  );

  const matchWinner = odds.find(o =>
    o.name?.toLowerCase().includes("winner") ||
    o.name?.toLowerCase() === "match winner" ||
    o.name?.toLowerCase().includes("1x2")
  );

  const overUnder = odds.filter(o =>
    o.name?.toLowerCase().includes("over") ||
    o.name?.toLowerCase().includes("under") ||
    o.name?.toLowerCase().includes("goals")
  ).slice(0, 2);

  const otherOdds = odds.filter(o =>
    o !== matchWinner &&
    !liveOdds.includes(o) &&
    !overUnder.includes(o)
  ).slice(0, 3);

  return (
    <div className="p-4 max-h-[400px] overflow-y-auto space-y-5">
      {/* Live Odds Section */}
      {liveOdds.length > 0 && (
        <div className="bg-card/30 rounded-lg border border-primary/20 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <TrendingUp className="w-4 h-4" />
            Live Odds
          </div>
          {liveOdds.slice(0, 3).map((bet, idx) => (
            <OddsGroup key={idx} title={bet.name} values={bet.values?.slice(0, 6) || []} />
          ))}
        </div>
      )}

      {/* Pre-Match Odds Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="text-muted-foreground">$</span>
          Pre-Match Odds
        </div>

        {/* Match Winner (1X2) */}
        {matchWinner && (
          <div className="bg-card/30 rounded-lg border border-border/30 p-4">
            <div className="text-xs text-muted-foreground mb-3">{matchWinner.name}</div>
            <div className="grid grid-cols-3 gap-3">
              {matchWinner.values?.slice(0, 3).map((val, idx) => (
                <div
                  key={idx}
                  className="bg-muted/30 rounded-lg p-3 text-center border border-border/30 hover:border-primary/30 transition-colors"
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

        {/* Over/Under Goals */}
        {overUnder.length > 0 && (
          <div className="space-y-3">
            {overUnder.map((bet, idx) => (
              <OddsGroup key={idx} title={bet.name} values={bet.values?.slice(0, 6) || []} />
            ))}
          </div>
        )}

        {/* Other Markets */}
        {otherOdds.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border/20">
            {otherOdds.map((bet, idx) => (
              <OddsGroup key={idx} title={bet.name} values={bet.values?.slice(0, 6) || []} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
