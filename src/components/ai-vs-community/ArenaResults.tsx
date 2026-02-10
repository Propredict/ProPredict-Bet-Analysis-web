import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Loader2, Trophy } from "lucide-react";

interface ArenaPredictionResult {
  id: string;
  match_id: string;
  prediction: string;
  status: string;
  created_at: string;
  home_team?: string;
  away_team?: string;
  league?: string;
}

export function ArenaResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<ArenaPredictionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        const { data: predictions } = await (supabase as any)
          .from("arena_predictions")
          .select("id, match_id, prediction, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (!predictions || predictions.length === 0) {
          setResults([]);
          setLoading(false);
          return;
        }

        const matchIds = predictions.map((p: any) => p.match_id);
        const { data: matches } = await (supabase as any)
          .from("ai_predictions")
          .select("match_id, home_team, away_team, league")
          .in("match_id", matchIds);

        const matchMap = new Map<string, { home_team: string; away_team: string; league: string }>();
        (matches || []).forEach((m: any) => {
          matchMap.set(m.match_id, { home_team: m.home_team, away_team: m.away_team, league: m.league });
        });

        const enriched: ArenaPredictionResult[] = predictions.map((p: any) => ({
          ...p,
          home_team: matchMap.get(p.match_id)?.home_team || "Unknown",
          away_team: matchMap.get(p.match_id)?.away_team || "Unknown",
          league: matchMap.get(p.match_id)?.league || "",
        }));

        setResults(enriched);
      } catch (err) {
        console.error("Arena results fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
    const interval = setInterval(fetchResults, 60_000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Trophy className="h-8 w-8 text-primary/40" />
        <p className="text-sm text-muted-foreground">Sign in to see your prediction results</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Trophy className="h-8 w-8 text-primary/40" />
        <p className="text-sm text-muted-foreground">No predictions yet</p>
        <p className="text-[10px] text-muted-foreground">Make predictions on upcoming matches to see your results here.</p>
      </div>
    );
  }

  const wonCount = results.filter(r => r.status === "won").length;
  const lostCount = results.filter(r => r.status === "lost").length;
  const pendingCount = results.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center bg-success/5 border-success/20">
          <p className="text-lg font-bold text-success">{wonCount}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Won</p>
        </Card>
        <Card className="p-3 text-center bg-destructive/5 border-destructive/20">
          <p className="text-lg font-bold text-destructive">{lostCount}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Lost</p>
        </Card>
        <Card className="p-3 text-center bg-primary/5 border-primary/20">
          <p className="text-lg font-bold text-primary">{pendingCount}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Pending</p>
        </Card>
      </div>

      {/* Results list */}
      <div className="space-y-2">
        {results.map((result) => (
          <Card
            key={result.id}
            className={`p-3 border ${
              result.status === "won"
                ? "border-success/30 bg-success/5"
                : result.status === "lost"
                ? "border-destructive/30 bg-destructive/5"
                : "border-border/40 bg-muted/10"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                {result.league && (
                  <p className="text-[9px] text-muted-foreground truncate mb-0.5">{result.league}</p>
                )}
                <p className="text-xs font-medium truncate">
                  {result.home_team} vs {result.away_team}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0.5">
                  {result.prediction === "1" ? "Home" : result.prediction === "X" ? "Draw" : result.prediction === "2" ? "Away" : result.prediction}
                </Badge>
                {result.status === "won" ? (
                  <Badge className="text-[9px] bg-success/15 text-success border-success/30 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> WIN
                  </Badge>
                ) : result.status === "lost" ? (
                  <Badge className="text-[9px] bg-destructive/15 text-destructive border-destructive/30 gap-1">
                    <XCircle className="h-3 w-3" /> LOSS
                  </Badge>
                ) : (
                  <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30 gap-1">
                    <Clock className="h-3 w-3" /> PENDING
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
