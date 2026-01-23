import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  ChevronDown,
  ChevronUp,
  Crown,
  Target,
  Sparkles,
  Brain,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Zap,
  Radio,
  Lock,
  Eye,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AddToBetSlipButton from "@/components/AddToBetSlipButton";
import { useRealAIPredictions, RealAIPrediction } from "@/hooks/useRealAIPredictions";
import RewardedAdModal from "@/components/RewardedAdModal";
import { useAdMob } from "@/hooks/useAdMob";

interface Match {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  league_name: string | null;
  match_date: string;
  match_time: string | null;
  status: string | null;
}

interface LiveUpdate {
  isLive: boolean;
  elapsedTime?: number;
  homeGoals?: number | null;
  awayGoals?: number | null;
}

interface AIPredictionCardProps {
  match: Match;
  isPremium: boolean;
  isProMatch: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  liveUpdate?: LiveUpdate;
}

/* =======================
   Local unlock via ads
======================= */
const getUnlocked = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem("unlocked_predictions") || "[]"));
  } catch {
    return new Set();
  }
};

const saveUnlocked = (id: string) => {
  const set = getUnlocked();
  set.add(id);
  localStorage.setItem("unlocked_predictions", JSON.stringify([...set]));
};

export const AIPredictionCard = ({
  match,
  isPremium,
  isProMatch,
  isFavorite,
  onToggleFavorite,
  liveUpdate,
}: AIPredictionCardProps) => {
  const { fetchPrediction, isLoading } = useRealAIPredictions();
  const { showRewardedAd } = useAdMob();

  const [prediction, setPrediction] = useState<RealAIPrediction | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const loading = isLoading(match.id);
  const isLive = liveUpdate?.isLive || ["LIVE", "1H", "2H", "HT"].some((s) => match.status?.toUpperCase().includes(s));

  /* =======================
     DATE + COUNTDOWN
  ======================= */
  const getDateLabel = () => {
    const d = new Date(`${match.match_date}T${match.match_time || "00:00"}`);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  };

  const getCountdown = () => {
    if (!match.match_time) return null;
    const now = new Date();
    const start = new Date(`${match.match_date}T${match.match_time}`);
    const diff = start.getTime() - now.getTime();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `Starts in ${h}h ${m}m`;
  };

  /* =======================
     Unlock logic
  ======================= */
  useEffect(() => {
    if (!isProMatch && !isPremium) {
      setUnlocked(getUnlocked().has(match.id));
    }
  }, [match.id, isProMatch, isPremium]);

  const canView = isPremium || (!isProMatch && unlocked);

  /* =======================
     Fetch AI prediction
  ======================= */
  useEffect(() => {
    fetchPrediction({
      id: match.id,
      homeTeam: match.home_team_name,
      awayTeam: match.away_team_name,
      league: match.league_name || "",
      matchDate: match.match_date,
      matchTime: match.match_time || undefined,
    }).then((res) => res && setPrediction(res));
  }, []);

  if (loading && !prediction) {
    return (
      <Card className="bg-card">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const p = prediction || {
    prediction: "Over 2.5",
    confidence: 72,
    odds_estimate: 2.15,
    risk_level: "high",
    homeWin: 45,
    draw: 20,
    awayWin: 35,
    predictedScore: "?-?",
    key_factors: [],
    analysis: "",
  };

  /* =======================
     BADGES
  ======================= */
  const isOver = p.prediction.includes("Over");
  const isBTTS = p.prediction.includes("BTTS");
  const isValue = p.odds_estimate >= 2.2;

  return (
    <Card className={cn("bg-card border-border/50", isLive && "ring-1 ring-red-500/30")}>
      <CardContent className="p-4">
        {/* HEADER */}
        <div className="flex justify-between mb-2">
          <div className="flex gap-2 flex-wrap items-center">
            {isLive ? (
              <Badge className="bg-red-500 text-white animate-pulse">
                <Radio className="w-3 h-3 mr-1" /> LIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-primary/10 text-primary">
                <Brain className="w-3 h-3 mr-1" /> AI
              </Badge>
            )}

            {isProMatch && (
              <Badge className="bg-amber-500/20 text-amber-400">
                <Crown className="w-3 h-3 mr-1" /> PRO
              </Badge>
            )}

            {isOver && <Badge className="bg-indigo-500/20 text-indigo-300">Over 2.5</Badge>}
            {isBTTS && <Badge className="bg-cyan-500/20 text-cyan-300">BTTS</Badge>}
            {isValue && <Badge className="bg-emerald-500/20 text-emerald-300">Value</Badge>}

            {!isLive && getCountdown() && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" /> {getCountdown()}
              </Badge>
            )}
          </div>

          <Star
            onClick={onToggleFavorite}
            className={cn("w-4 h-4 cursor-pointer", isFavorite ? "text-primary fill-primary" : "text-muted-foreground")}
          />
        </div>

        {/* MATCH */}
        <h3 className="font-semibold text-sm mb-1">
          {match.home_team_name} vs {match.away_team_name}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {match.league_name} · {getDateLabel()} · {match.match_time?.slice(0, 5)}
        </p>

        {/* PROBABILITY */}
        <div className="space-y-2 mb-4">
          {[
            [match.home_team_name, p.homeWin, "primary"],
            ["Draw", p.draw, "muted"],
            [match.away_team_name, p.awayWin, "accent"],
          ].map(([label, val, color]: any) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span>{label}</span>
                <span>{val}%</span>
              </div>
              <div className="h-2 bg-muted rounded">
                <div className={`h-full rounded bg-${color}`} style={{ width: `${val}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-4 gap-2 text-center border-y py-2 mb-3">
          <div>
            <p className="text-[10px]">Pick</p>
            <Badge className={cn(!canView && "blur-sm")}>{p.prediction}</Badge>
          </div>
          <div>
            <p className="text-[10px]">Score</p>
            <p className={cn("font-bold", !canView && "blur-sm")}>{p.predictedScore}</p>
          </div>
          <div>
            <p className="text-[10px]">Conf</p>
            <p className="font-bold">{p.confidence}%</p>
          </div>
          <div>
            <p className="text-[10px]">Risk</p>
            <Badge
              className={cn(
                p.risk_level === "high" && "bg-red-500/20 text-red-400",
                p.risk_level === "medium" && "bg-amber-500/20 text-amber-400",
                p.risk_level === "low" && "bg-emerald-500/20 text-emerald-400",
              )}
            >
              {p.risk_level}
            </Badge>
          </div>
        </div>

        {/* UNLOCK */}
        {!canView && isProMatch && (
          <Button className="w-full bg-amber-500" asChild>
            <a href="/get-premium">
              <Crown className="w-4 h-4 mr-2" /> Get AI Pro
            </a>
          </Button>
        )}

        {!canView && !isProMatch && (
          <Button variant="outline" className="w-full" onClick={() => setShowAd(true)}>
            <Eye className="w-4 h-4 mr-2" /> Watch Ad to Unlock
          </Button>
        )}

        {/* AI ANALYSIS */}
        {canView && (
          <button onClick={() => setShowAI(!showAI)} className="w-full mt-3 text-sm flex justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Analysis
            </span>
            {showAI ? <ChevronUp /> : <ChevronDown />}
          </button>
        )}

        {showAI && canView && <div className="mt-3 text-xs text-muted-foreground">{p.analysis}</div>}
      </CardContent>

      <RewardedAdModal
        open={showAd}
        onClose={() => setShowAd(false)}
        onWatchAd={async () => {
          const ok = await showRewardedAd();
          if (ok) {
            saveUnlocked(match.id);
            setUnlocked(true);
            setShowAd(false);
          }
        }}
        title="Unlock Prediction"
        description="Watch a short ad to unlock this AI prediction"
      />
    </Card>
  );
};

export default AIPredictionCard;
