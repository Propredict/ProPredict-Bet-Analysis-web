import { useEffect, useCallback, useState } from "react";
import { X, BarChart3, Users, DollarSign, History, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Match } from "@/hooks/useLiveScores";
import { supabase } from "@/integrations/supabase/client";
import { AIPredictionTab } from "./AIPredictionTab";

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
}

export function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  const [activeTab, setActiveTab] = useState("statistics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (match) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [match, handleEscape]);

  useEffect(() => {
    if (!match) return;

    const controller = new AbortController();

    const fetchMatchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsUnauthorized(false);
        setDetails(null);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        // Edge function supports authenticated access, but we must not require login.
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const res = await fetch(
          `https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/get-match-details?fixtureId=${match.id}`,
          {
            method: "GET",
            headers,
            signal: controller.signal,
          }
        );

        // Auth failures should be silent: keep modal usable.
        if (res.status === 401 || res.status === 403) {
          setIsUnauthorized(true);
          return;
        }

        if (!res.ok) {
          setError("Failed to load match details");
          return;
        }

        // Keep it defensive: API may return partial/empty data.
        const json = await res
          .json()
          .catch(() => null);

        setDetails(json);
      } catch (e: any) {
        // Abort is expected when switching matches / closing.
        if (e?.name === "AbortError") return;
        setError("Failed to load match details");
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();

    return () => controller.abort();
  }, [match]);

  if (!match) return null;

  const isLiveOrHT = match.status === "live" || match.status === "halftime";
  const isUpcoming = match.status === "upcoming";

  const getStatusBadge = () => {
    if (match.status === "live") {
      return <Badge className="bg-red-500 text-white animate-pulse">LIVE {match.minute}'</Badge>;
    }
    if (match.status === "halftime") {
      return <Badge className="bg-yellow-500/20 text-yellow-400">HT</Badge>;
    }
    if (match.status === "finished") {
      return <Badge variant="secondary">FT</Badge>;
    }
    return <Badge variant="outline">{match.startTime}</Badge>;
  };

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
            <div className="flex gap-3 items-center text-sm text-muted-foreground">
              {match.league} • {match.leagueCountry}
              {getStatusBadge()}
            </div>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* SCORE */}
          <div className="p-6 flex justify-between items-center">
            <div className="text-center flex-1">{match.homeTeam}</div>
            <div className="text-4xl font-bold">
              {isUpcoming ? "VS" : `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`}
            </div>
            <div className="text-center flex-1">{match.awayTeam}</div>
          </div>

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start border-b border-white/10 bg-transparent h-auto flex-wrap gap-1 px-2">
              <TabsTrigger value="statistics" className="text-xs sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Stats
              </TabsTrigger>
              <TabsTrigger value="lineups" className="text-xs sm:text-sm">
                <Users className="h-3.5 w-3.5 mr-1.5" /> Lineups
              </TabsTrigger>
              <TabsTrigger value="odds" className="text-xs sm:text-sm">
                <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Odds
              </TabsTrigger>
              <TabsTrigger value="h2h" className="text-xs sm:text-sm">
                <History className="h-3.5 w-3.5 mr-1.5" /> H2H
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs sm:text-sm">
                <Brain className="h-3.5 w-3.5 mr-1.5" /> AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="statistics" className="m-0">
              <div className="p-6 text-center text-sm text-muted-foreground">
                {loading && "Loading…"}
                {!loading && error && error}
                {!loading && !error && (!details || isUnauthorized) && "Not available"}
                {!loading && !error && !!details && "Data loaded"}
              </div>
            </TabsContent>

            <TabsContent value="lineups" className="m-0">
              <div className="p-6 text-center text-sm text-muted-foreground">
                {loading && "Loading…"}
                {!loading && error && error}
                {!loading && !error && (!details || isUnauthorized) && "Not available"}
                {!loading && !error && !!details && "Data loaded"}
              </div>
            </TabsContent>

            <TabsContent value="odds" className="m-0">
              <div className="p-6 text-center text-sm text-muted-foreground">
                {loading && "Loading…"}
                {!loading && error && error}
                {!loading && !error && (!details || isUnauthorized) && "Not available"}
                {!loading && !error && !!details && "Data loaded"}
              </div>
            </TabsContent>

            <TabsContent value="h2h" className="m-0">
              <div className="p-6 text-center text-sm text-muted-foreground">
                {loading && "Loading…"}
                {!loading && error && error}
                {!loading && !error && (!details || isUnauthorized) && "Not available"}
                {!loading && !error && !!details && "Data loaded"}
              </div>
            </TabsContent>

            <TabsContent value="ai" className="m-0">
              <AIPredictionTab fixtureId={match.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
