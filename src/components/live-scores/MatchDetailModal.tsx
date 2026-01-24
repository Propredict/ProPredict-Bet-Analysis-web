import { useEffect, useCallback, useState } from "react";
import { X, BarChart3, Users, DollarSign, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Match } from "@/hooks/useLiveScores";

const MATCH_DETAILS_URL = "https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/get-match-details";

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
}

export function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  const [activeTab, setActiveTab] = useState("statistics");
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!match) return;

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [match, handleEscape]);

  useEffect(() => {
    if (!match) return;

    setActiveTab("statistics");
    setLoading(true);
    setError(null);
    setDetails(null);

    fetch(`${MATCH_DETAILS_URL}?fixtureId=${match.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load match details");
        return res.json();
      })
      .then((data) => setDetails(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [match?.id]);

  if (!match) return null;

  const isLiveOrHT = match.status === "live" || match.status === "halftime";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl rounded-xl bg-[#1a1f2e] border border-white/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex justify-between items-center p-4 border-b border-white/10">
            <div className="flex gap-2 items-center text-sm text-muted-foreground">
              {match.league} • {match.leagueCountry}
              {isLiveOrHT && <Badge className="bg-red-500 text-white animate-pulse">LIVE {match.minute}'</Badge>}
            </div>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* SCORE */}
          <div className="p-6 flex justify-between items-center">
            <div className="text-center flex-1">
              <img src={match.homeLogo ?? ""} className="h-14 mx-auto mb-2" />
              <div>{match.homeTeam}</div>
            </div>

            <div className="text-4xl font-bold text-red-400">
              {match.homeScore ?? 0} : {match.awayScore ?? 0}
            </div>

            <div className="text-center flex-1">
              <img src={match.awayLogo ?? ""} className="h-14 mx-auto mb-2" />
              <div>{match.awayTeam}</div>
            </div>
          </div>

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex border-b border-white/10">
              <TabsTrigger value="statistics">
                <BarChart3 className="h-4 w-4 mr-2" /> Statistics
              </TabsTrigger>
              <TabsTrigger value="lineups">
                <Users className="h-4 w-4 mr-2" /> Lineups
              </TabsTrigger>
              <TabsTrigger value="odds">
                <DollarSign className="h-4 w-4 mr-2" /> Odds
              </TabsTrigger>
              <TabsTrigger value="h2h">
                <History className="h-4 w-4 mr-2" /> H2H
              </TabsTrigger>
            </TabsList>

            {/* CONTENT */}
            <div className="p-4 max-h-[300px] overflow-y-auto">
              <TabsContent value="statistics">
                {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {error && <p className="text-sm text-red-400">{error}</p>}
                {details && (
                  <pre className="text-xs bg-black/30 p-3 rounded">{JSON.stringify(details.statistics, null, 2)}</pre>
                )}
              </TabsContent>

              <TabsContent value="lineups">
                {details?.lineups ? (
                  <pre className="text-xs bg-black/30 p-3 rounded">{JSON.stringify(details.lineups, null, 2)}</pre>
                ) : (
                  <p className="text-sm text-muted-foreground">No lineup data</p>
                )}
              </TabsContent>

              <TabsContent value="odds">
                {details?.odds ? (
                  <pre className="text-xs bg-black/30 p-3 rounded">{JSON.stringify(details.odds, null, 2)}</pre>
                ) : (
                  <p className="text-sm text-muted-foreground">No odds data</p>
                )}
              </TabsContent>

              <TabsContent value="h2h">
                {details?.h2h ? (
                  <pre className="text-xs bg-black/30 p-3 rounded">{JSON.stringify(details.h2h, null, 2)}</pre>
                ) : (
                  <p className="text-sm text-muted-foreground">No H2H data</p>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
}
