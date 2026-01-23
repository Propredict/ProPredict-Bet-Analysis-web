import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Crown, Eye, ChevronDown, ChevronUp, Clock, Star, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIPredictions } from "@/hooks/useAIPredictions";

interface Match {
  id: string;
  home_team_name: string;
  away_team_name: string;
  league_name: string | null;
  match_date: string; // YYYY-MM-DD
  match_time: string | null; // HH:mm
  is_pro: boolean;
}

interface Props {
  match: Match;
  isPremium: boolean; // premium OR admin
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onGoPremium: () => void;
}

/* =========================
   Helpers
========================= */

const getLocalDateLabel = (date: string, time?: string | null) => {
  const d = new Date(`${date}T${time || "12:00"}`);
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
};

const getCountdown = (date: string, time?: string | null) => {
  if (!time) return null;
  const now = new Date();
  const start = new Date(`${date}T${time}`);
  const diff = start.getTime() - now.getTime();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `Starts in ${h}h ${m}m`;
};

/* =========================
   Component
========================= */

export function AIPredictionCard({ match, isPremium, isFavorite, onToggleFavorite, onGoPremium }: Props) {
  const { fetchPrediction, loading } = useAIPredictions();

  const [ai, setAi] = useState<any | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const isProMatch = match.is_pro;
  const canView = isPremium || (!isProMatch && unlocked);

  /* =========================
     Fetch AI from Supabase
  ========================= */

  useEffect(() => {
    fetchPrediction(
      match.id,
      {
        homeTeam: match.home_team_name,
        awayTeam: match.away_team_name,
        league: match.league_name || "",
        matchDate: match.match_date,
        matchTime: match.match_time || undefined,
      },
      "default",
    ).then((res) => {
      if (res) setAi(res);
    });
  }, [match.id]);

  /* =========================
     Derived UI flags
  ========================= */

  const predictionText = ai?.prediction || "—";
  const confidence = ai?.confidence || 0;

  const isOver = predictionText.toLowerCase().includes("over");
  const isBTTS = predictionText.toLowerCase().includes("btts");
  const isValue = ai?.recommendation?.toLowerCase().includes("value");
  const isHighRisk = ai?.recommendation?.toLowerCase().includes("risk");

  /* =========================
     Render
  ========================= */

  return (
    <Card className="bg-card border-border/50 hover:border-primary/30 transition">
      <CardContent className="p-4">
        {/* HEADER */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              <Brain className="w-3 h-3 mr-1" />
              AI Prediction
            </Badge>

            {isProMatch && (
              <Badge className="bg-amber-500/20 text-amber-400">
                <Crown className="w-3 h-3 mr-1" />
                PRO
              </Badge>
            )}

            {isOver && <Badge className="bg-indigo-500/20 text-indigo-300">Over 2.5</Badge>}

            {isBTTS && <Badge className="bg-cyan-500/20 text-cyan-300">BTTS</Badge>}

            {isValue && <Badge className="bg-emerald-500/20 text-emerald-300">Value</Badge>}

            {isHighRisk && (
              <Badge className="bg-red-500/20 text-red-400">
                <AlertTriangle className="w-3 h-3 mr-1" />
                High Risk
              </Badge>
            )}
          </div>

          <Star
            onClick={onToggleFavorite}
            className={cn("w-4 h-4 cursor-pointer", isFavorite ? "text-primary fill-primary" : "text-muted-foreground")}
          />
        </div>

        {/* MATCH INFO */}
        <div className="mb-3">
          <h3 className="font-semibold text-sm">
            {match.home_team_name} vs {match.away_team_name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {match.league_name} · {getLocalDateLabel(match.match_date, match.match_time)} · {match.match_time || "TBD"}
          </p>

          {getCountdown(match.match_date, match.match_time) && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getCountdown(match.match_date, match.match_time)}
            </p>
          )}
        </div>

        {/* CONFIDENCE */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span>Confidence</span>
            <span>{confidence}%</span>
          </div>
          <div className="h-2 bg-muted rounded">
            <div className="h-full bg-primary rounded transition-all" style={{ width: `${confidence}%` }} />
          </div>
        </div>

        {/* PREDICTION */}
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">AI Pick</div>
          <div className={cn("text-lg font-bold", !canView && "blur-sm select-none")}>{predictionText}</div>
        </div>

        {/* ACTIONS */}
        {!canView && isProMatch && (
          <Button className="w-full bg-amber-500" onClick={onGoPremium}>
            <Crown className="w-4 h-4 mr-2" />
            Get AI Pro
          </Button>
        )}

        {!canView && !isProMatch && (
          <Button variant="outline" className="w-full" onClick={() => setUnlocked(true)}>
            <Eye className="w-4 h-4 mr-2" />
            Watch Ad to Unlock
          </Button>
        )}

        {/* AI ANALYSIS */}
        {canView && ai && (
          <>
            <button
              onClick={() => setShowAI(!showAI)}
              className="w-full mt-3 text-sm flex justify-between items-center"
            >
              <span className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI Analysis
              </span>
              {showAI ? <ChevronUp /> : <ChevronDown />}
            </button>

            {showAI && (
              <div className="mt-3 text-sm text-muted-foreground space-y-2">
                <p>{ai.reasoning}</p>

                {ai.keyFactors?.length > 0 && (
                  <ul className="list-disc pl-4">
                    {ai.keyFactors.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
