import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Goal, Target, Square, AlertOctagon, Loader2 } from "lucide-react";
import { useWCTopPlayers, type WCTopType } from "@/hooks/useWCTopPlayers";

const FILTERS: { key: WCTopType; label: string; icon: any; color: string; metric: (p: any) => number; suffix: string }[] = [
  { key: "scorers", label: "Top Scorers", icon: Goal, color: "text-primary", metric: (p) => p.goals, suffix: "G" },
  { key: "assists", label: "Top Assists", icon: Target, color: "text-blue-400", metric: (p) => p.assists, suffix: "A" },
  { key: "yellow", label: "Yellow Cards", icon: Square, color: "text-yellow-400", metric: (p) => p.yellow, suffix: "YC" },
  { key: "red", label: "Red Cards", icon: AlertOctagon, color: "text-red-500", metric: (p) => p.red, suffix: "RC" },
];

export default function WCTopPlayersTab() {
  const [active, setActive] = useState<WCTopType>("scorers");
  const filter = FILTERS.find((f) => f.key === active)!;
  const { data, isLoading, isError } = useWCTopPlayers(active);

  const players = data?.players ?? [];
  const fallback = data?.fallback;

  return (
    <div className="mt-4 space-y-3">
      {/* Sub-filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const isActive = active === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap border transition-colors ${
                isActive
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {f.label}
            </button>
          );
        })}
      </div>

      {fallback && (
        <p className="text-[10px] text-muted-foreground italic">
          Showing reference stats from the last World Cup — live tournament data will appear when WC 2026 kicks off.
        </p>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <Card className="bg-card border-border p-4 text-center text-xs text-muted-foreground">
          Failed to load top players. Try again later.
        </Card>
      )}

      {!isLoading && !isError && players.length === 0 && (
        <Card className="bg-card border-border p-4 text-center text-xs text-muted-foreground">
          No data available yet.
        </Card>
      )}

      <div className="space-y-1.5">
        {players.map((p, idx) => {
          const value = filter.metric(p);
          const Icon = filter.icon;
          return (
            <Card key={`${p.id}-${idx}`} className="bg-card border-border p-2.5">
              <div className="flex items-center gap-2.5">
                <div className={`w-6 text-center text-[11px] font-bold ${idx < 3 ? "text-primary" : "text-muted-foreground"}`}>
                  {idx + 1}
                </div>
                {p.photo ? (
                  <img
                    src={p.photo}
                    alt={p.name}
                    className="w-9 h-9 rounded-full object-cover border border-border bg-muted"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {p.teamLogo && (
                      <img src={p.teamLogo} alt="" className="h-3 w-3 object-contain" loading="lazy" />
                    )}
                    <p className="text-[10px] text-muted-foreground truncate">
                      {p.team ?? p.nationality}
                    </p>
                  </div>
                </div>
                <Badge className={`bg-muted/40 ${filter.color} border-0 text-[11px] font-bold px-2 py-0.5 flex items-center gap-1`}>
                  <Icon className="h-3 w-3" />
                  {value} {filter.suffix}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}