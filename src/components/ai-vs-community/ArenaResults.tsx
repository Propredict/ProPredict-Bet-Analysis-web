import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Loader2, Trophy, EyeOff, Eye, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ArenaPredictionResult {
  id: string;
  match_id: string;
  prediction: string;
  status: string;
  created_at: string;
  home_team?: string;
  away_team?: string;
  league?: string;
  match_time?: string;
  match_date?: string;
  ai_result_status?: string;
}

const HIDDEN_KEY = "arena_hidden_results";

function getHiddenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function setHiddenIds(ids: Set<string>) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...ids]));
}

/** Show a human-friendly match status label */
function getMatchStatusLabel(result: ArenaPredictionResult): { label: string; color: string } | null {
  if (result.status !== "pending") return null;
  
  const aiStatus = result.ai_result_status;
  if (!aiStatus || aiStatus === "pending") {
    // Match not resolved yet — show time if available
    if (result.match_time) {
      return { label: `⏰ ${result.match_time}`, color: "text-muted-foreground" };
    }
    return { label: "Awaiting result", color: "text-muted-foreground" };
  }
  // AI prediction resolved but arena still pending (edge case — should auto-resolve soon)
  return { label: "Processing...", color: "text-yellow-500" };
}

export function ArenaResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<ArenaPredictionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hiddenIds, setHiddenIdsState] = useState<Set<string>>(getHiddenIds);
  const [showHidden, setShowHidden] = useState(false);
  const mountedRef = useRef(true);

  const fetchResults = useCallback(async () => {
    if (!user) return;
    try {
      const { data: predictions } = await (supabase as any)
        .from("arena_predictions")
        .select("id, match_id, prediction, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!mountedRef.current) return;

      if (!predictions || predictions.length === 0) {
        setResults([]);
        return;
      }

      const matchIds = predictions.map((p: any) => p.match_id);
      const { data: matches } = await (supabase as any)
        .from("ai_predictions")
        .select("match_id, home_team, away_team, league, match_time, match_date, result_status")
        .in("match_id", matchIds);

      if (!mountedRef.current) return;

      const matchMap = new Map<string, any>();
      (matches || []).forEach((m: any) => {
        matchMap.set(m.match_id, m);
      });

      const enriched: ArenaPredictionResult[] = predictions.map((p: any) => {
        const m = matchMap.get(p.match_id);
        return {
          ...p,
          home_team: m?.home_team || "Unknown",
          away_team: m?.away_team || "Unknown",
          league: m?.league || "",
          match_time: m?.match_time || null,
          match_date: m?.match_date || null,
          ai_result_status: m?.result_status || null,
        };
      });

      setResults(enriched);
    } catch (err) {
      console.error("Arena results fetch error:", err);
    }
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;
    if (!user) { setLoading(false); return; }

    fetchResults().finally(() => {
      if (mountedRef.current) setLoading(false);
    });

    const interval = setInterval(fetchResults, 30_000); // refresh every 30s
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [user, fetchResults]);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchResults();
    setRefreshing(false);
  }, [fetchResults]);

  const toggleHide = useCallback((id: string) => {
    setHiddenIdsState(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      setHiddenIds(next);
      return next;
    });
  }, []);

  const deletePrediction = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from("arena_predictions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (!error) {
      setResults(prev => prev.filter(r => r.id !== id));
      setHiddenIdsState(prev => {
        const next = new Set(prev);
        next.delete(id);
        setHiddenIds(next);
        return next;
      });
    }
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
  const hiddenCount = results.filter(r => hiddenIds.has(r.id)).length;

  const visibleResults = showHidden
    ? results
    : results.filter(r => !hiddenIds.has(r.id));

  return (
    <div className="space-y-4">
      {/* Stats summary + refresh */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-2 flex-1">
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
        <Button
          variant="ghost"
          size="icon"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="ml-2 shrink-0"
          title="Refresh results"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Hidden toggle */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowHidden(!showHidden)}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          {showHidden ? "Hide" : "Show"} {hiddenCount} hidden {hiddenCount === 1 ? "result" : "results"}
        </button>
      )}

      {/* Results list */}
      <div className="space-y-2">
        {visibleResults.map((result) => {
          const isHidden = hiddenIds.has(result.id);
          const matchStatus = getMatchStatusLabel(result);
          return (
            <Card
              key={result.id}
              className={`p-3 border ${
                isHidden ? "opacity-50 border-border/20 bg-muted/5" :
                result.status === "won"
                  ? "border-success/30 bg-success/5"
                  : result.status === "lost"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border/40 bg-muted/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {result.league && (
                      <p className="text-[9px] text-muted-foreground truncate">{result.league}</p>
                    )}
                    {matchStatus && (
                      <span className={`text-[9px] ${matchStatus.color}`}>{matchStatus.label}</span>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate">
                    {result.home_team} vs {result.away_team}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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
                   <button
                    onClick={() => toggleHide(result.id)}
                    className="p-1 rounded hover:bg-muted/50 transition-colors"
                    title={isHidden ? "Show result" : "Hide result"}
                  >
                    {isHidden ? (
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground" />
                    )}
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="p-1 rounded hover:bg-destructive/20 transition-colors"
                        title="Remove from list"
                      >
                        <X className="h-3 w-3 text-muted-foreground/50 hover:text-destructive" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete prediction?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove your prediction for {result.home_team} vs {result.away_team}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePrediction(result.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
