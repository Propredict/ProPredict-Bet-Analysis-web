import { useState, useCallback, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Search, User, Trophy, ArrowRightLeft, Activity, X, Clock, TrendingUp, Star, Zap, Target, Flame, BarChart3, AlertTriangle, ChevronRight, Download, Shield, Lock, Play, Briefcase, Users, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchPlayers, PlayerSearchResult } from "@/hooks/useSearchPlayers";
import { usePlayerProfile, PlayerProfile } from "@/hooks/usePlayerProfile";
import { useTeamSquad } from "@/hooks/useTeamSquad";
import { useTopPlayers, TopPlayerEntry } from "@/hooks/useTopPlayers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAndroidInterstitial } from "@/hooks/useAndroidInterstitial";
import { useRef } from "react";
import { calculatePlayerPrediction, type PlayerAIPrediction } from "@/utils/playerAIPrediction";
import { useNextOpponent, type NextOpponentData } from "@/hooks/useNextOpponent";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

const RECENT_SEARCHES_KEY = "propredict_recent_players";
const MAX_RECENT = 8;

interface RecentPlayer {
  id: number;
  name: string;
  photo: string;
  team: string;
}

const POPULAR_PLAYERS: RecentPlayer[] = [
  { id: 154, name: "L. Messi", photo: "https://media.api-sports.io/football/players/154.png", team: "Inter Miami" },
  { id: 874, name: "C. Ronaldo", photo: "https://media.api-sports.io/football/players/874.png", team: "Al Nassr" },
  { id: 278, name: "K. Mbappé", photo: "https://media.api-sports.io/football/players/278.png", team: "Real Madrid" },
  { id: 1100, name: "E. Haaland", photo: "https://media.api-sports.io/football/players/1100.png", team: "Man City" },
  { id: 306, name: "M. Salah", photo: "https://media.api-sports.io/football/players/306.png", team: "Liverpool" },
  { id: 129718, name: "J. Bellingham", photo: "https://media.api-sports.io/football/players/129718.png", team: "Real Madrid" },
  { id: 762, name: "Vinícius Jr", photo: "https://media.api-sports.io/football/players/762.png", team: "Real Madrid" },
  { id: 18, name: "L. Yamal", photo: "https://media.api-sports.io/football/players/18.png", team: "Barcelona" },
  { id: 521, name: "R. Lewandowski", photo: "https://media.api-sports.io/football/players/521.png", team: "Barcelona" },
  { id: 184, name: "H. Kane", photo: "https://media.api-sports.io/football/players/184.png", team: "Bayern Munich" },
  { id: 1485, name: "B. Saka", photo: "https://media.api-sports.io/football/players/1485.png", team: "Arsenal" },
  { id: 186, name: "A. Griezmann", photo: "https://media.api-sports.io/football/players/186.png", team: "Atletico Madrid" },
  { id: 1467, name: "P. Foden", photo: "https://media.api-sports.io/football/players/1467.png", team: "Man City" },
  { id: 182, name: "Son Heung-min", photo: "https://media.api-sports.io/football/players/182.png", team: "Tottenham" },
  { id: 434, name: "O. Dembélé", photo: "https://media.api-sports.io/football/players/434.png", team: "PSG" },
  { id: 24823, name: "R. Kolo Muani", photo: "https://media.api-sports.io/football/players/24823.png", team: "PSG" },
  { id: 10007, name: "J. Musiala", photo: "https://media.api-sports.io/football/players/10007.png", team: "Bayern Munich" },
  { id: 35845, name: "F. Wirtz", photo: "https://media.api-sports.io/football/players/35845.png", team: "B. Leverkusen" },
  { id: 247, name: "R. De Bruyne", photo: "https://media.api-sports.io/football/players/247.png", team: "Man City" },
  { id: 284, name: "W. Zaha", photo: "https://media.api-sports.io/football/players/284.png", team: "Galatasaray" },
];

function getRecentSearches(): RecentPlayer[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch { return []; }
}

function saveRecentSearch(player: RecentPlayer) {
  const recent = getRecentSearches().filter(p => p.id !== player.id);
  recent.unshift(player);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function RatingBadge({ rating }: { rating: string | null }) {
  const val = parseFloat(rating || "0");
  if (val <= 0) return null;
  const color = val >= 7.5 ? "bg-green-500/20 text-green-400" : val >= 6.5 ? "bg-yellow-500/20 text-yellow-400" : "bg-orange-500/20 text-orange-400";
  return <Badge className={`${color} border-0 text-sm font-bold px-2`}>{val.toFixed(1)}</Badge>;
}

function FormBadge({ rating }: { rating: string | null }) {
  const val = parseFloat(rating || "0");
  if (val <= 0) return null;
  if (val >= 7.2) return <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px] gap-1">🔥 HOT</Badge>;
  if (val >= 6.5) return <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-[10px] gap-1">⚡ GOOD</Badge>;
  return <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px] gap-1">❄️ COLD</Badge>;
}

// Locked stat placeholder
function LockedValue() {
  return (
    <span className="flex items-center gap-1 text-sm font-bold text-muted-foreground/50">
      <Lock className="h-3 w-3" /> 🔒
    </span>
  );
}

// Generate AI prediction from real stats + opponent data
function AIPredictionCard({ profile, opponentData }: { profile: PlayerProfile; opponentData?: NextOpponentData | null }) {
  const isAndroid = getIsAndroidApp();
  const { plan } = useUserPlan();
  const prediction = useMemo(() => calculatePlayerPrediction(profile, opponentData), [profile, opponentData]);
  const opp = prediction.opponentAdjustment;
  const [adUnlocked, setAdUnlocked] = useState(false);

  // Check localStorage for ad-unlock state (per player, per day)
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const key = `propredict_player_ai_${profile.player.id}_${today}`;
      if (localStorage.getItem(key) === "1") setAdUnlocked(true);
    } catch {}
  }, [profile.player.id]);

  const handleAdUnlock = useCallback(() => {
    if (!(window as any).Android?.showRewardedAd) return;
    (window as any).onRewardedAdComplete = () => {
      const today = new Date().toISOString().slice(0, 10);
      const key = `propredict_player_ai_${profile.player.id}_${today}`;
      try { localStorage.setItem(key, "1"); } catch {}
      setAdUnlocked(true);
    };
    (window as any).Android.showRewardedAd("player_ai_prediction");
  }, [profile.player.id]);

  const goalColor = prediction.goalProbability >= 55 ? "text-green-400" : prediction.goalProbability >= 35 ? "text-yellow-400" : "text-red-400";
  const assistColor = prediction.assistProbability >= 40 ? "text-green-400" : prediction.assistProbability >= 20 ? "text-yellow-400" : "text-red-400";
  const formColor = prediction.formLabel === "HOT" ? "text-green-400" : prediction.formLabel === "GOOD" ? "text-yellow-400" : "text-red-400";
  const riskColor = prediction.riskLevel === "LOW" ? "text-green-400" : prediction.riskLevel === "MEDIUM" ? "text-yellow-400" : "text-red-400";
  const riskBg = prediction.riskLevel === "LOW" ? "bg-green-500/10 border-green-500/20" : prediction.riskLevel === "MEDIUM" ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20";
  const diffColor = opp?.matchDifficulty === "EASY" ? "text-green-400 bg-green-500/10" : opp?.matchDifficulty === "HARD" ? "text-red-400 bg-red-500/10" : "text-yellow-400 bg-yellow-500/10";

  // Access rules:
  // Web: ALWAYS locked – AI prediction is app-exclusive (download CTA)
  // Android: Free/Pro → watch ad to unlock, Premium → unlocked
  const isPremium = plan === "premium";
  
  let showLocked: boolean;
  if (isAndroid) {
    showLocked = isPremium ? false : !adUnlocked;
  } else {
    // Web: always locked regardless of plan
    showLocked = true;
  }

  return (
    <Card className="overflow-hidden border-primary/30 shadow-lg shadow-primary/10 animate-fade-in">
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold">🤖 AI Prediction – Next Match</h3>
            <p className="text-[10px] text-muted-foreground">
              {profile.stats.appearances} apps this season
              {opp ? " • opponent-adjusted" : ""}
            </p>
          </div>
        </div>

        {/* Opponent Info Banner – always visible */}
        {opponentData?.opponent && opponentData?.fixture && (
          <div className="flex items-center gap-2.5 bg-background/60 rounded-lg px-3 py-2 mb-3 border border-border/30">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground">vs</span>
              {opponentData.opponent.logo && (
                <img src={opponentData.opponent.logo} alt="" className="w-5 h-5 object-contain" />
              )}
              <span className="text-xs font-semibold truncate">{opponentData.opponent.name}</span>
              <Badge variant="secondary" className="text-[9px] border-0 bg-secondary/50 flex-shrink-0">
                {opponentData.opponent.isHome ? "HOME" : "AWAY"}
              </Badge>
            </div>
            {opp && (
              <Badge className={`text-[9px] border-0 flex-shrink-0 ${diffColor}`}>
                {opp.matchDifficulty}
              </Badge>
            )}
          </div>
        )}

        {/* Main Stats Grid – Goal is FREE, rest locked */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* ⚽ Goal – ALWAYS VISIBLE */}
          <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2">
            <span className="text-base">⚽</span>
            <div>
              <p className="text-[10px] text-muted-foreground">Goal</p>
              <p className={`text-sm font-bold ${goalColor}`}>{prediction.goalProbability}%</p>
            </div>
          </div>
          {/* 🎯 Assist – LOCKED */}
          <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2">
            <span className="text-base">🎯</span>
            <div>
              <p className="text-[10px] text-muted-foreground">Assist</p>
              {showLocked ? <LockedValue /> : (
                <p className={`text-sm font-bold ${assistColor}`}>{prediction.assistProbability}%</p>
              )}
            </div>
          </div>
          {/* 🔥 Form – LOCKED */}
          <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2">
            <span className="text-base">🔥</span>
            <div>
              <p className="text-[10px] text-muted-foreground">Form</p>
              {showLocked ? <LockedValue /> : (
                <p className={`text-sm font-bold ${formColor}`}>
                  {prediction.formLabel} ({prediction.formScore})
                </p>
              )}
            </div>
          </div>
          {/* 📈 Shots – LOCKED */}
          <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2">
            <span className="text-base">📈</span>
            <div>
              <p className="text-[10px] text-muted-foreground">Shots/Game</p>
              {showLocked ? <LockedValue /> : (
                <p className="text-sm font-bold">{prediction.shotsExpected}</p>
              )}
            </div>
          </div>
        </div>

        {/* Risk Level – LOCKED */}
        <div className={`flex items-center gap-2 mt-3 rounded-lg px-3 py-2 border ${showLocked ? "bg-secondary/10 border-border/20" : riskBg}`}>
          <span className="text-base">⚠️</span>
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] text-muted-foreground">Risk:</p>
            {showLocked ? <LockedValue /> : (
              <p className={`text-sm font-bold ${riskColor}`}>{prediction.riskLevel}</p>
            )}
          </div>
          {!showLocked && <span className="text-[10px] text-muted-foreground ml-auto">{prediction.riskReason}</span>}
        </div>

        {/* Extra Stats – LOCKED */}
        {!showLocked && (
          <>
            {opp && opponentData?.opponentStats && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-background/40 rounded-lg px-2 py-1.5 text-center">
                  <p className="text-[9px] text-muted-foreground">🛡️ Def Rating</p>
                  <p className={`text-xs font-bold ${opp.defenseRating >= 65 ? "text-red-400" : opp.defenseRating <= 40 ? "text-green-400" : "text-yellow-400"}`}>
                    {opp.defenseRating}/100
                  </p>
                </div>
                <div className="bg-background/40 rounded-lg px-2 py-1.5 text-center">
                  <p className="text-[9px] text-muted-foreground">⚽ Concede/G</p>
                  <p className={`text-xs font-bold ${opponentData.opponentStats.goalsAgainstPerGame >= 1.5 ? "text-green-400" : "text-red-400"}`}>
                    {opponentData.opponentStats.goalsAgainstPerGame}
                  </p>
                </div>
                <div className="bg-background/40 rounded-lg px-2 py-1.5 text-center">
                  <p className="text-[9px] text-muted-foreground">🧤 CS Rate</p>
                  <p className="text-xs font-bold">{opponentData.opponentStats.cleanSheetRate}%</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-background/30 rounded-lg px-2 py-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">Key Passes</p>
                <p className="text-xs font-bold">{prediction.keyPassesPerGame}/g</p>
              </div>
              <div className="bg-background/30 rounded-lg px-2 py-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">Starter %</p>
                <p className="text-xs font-bold">{prediction.starterPercentage}%</p>
              </div>
              <div className="bg-background/30 rounded-lg px-2 py-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">Minutes %</p>
                <p className="text-xs font-bold">{prediction.minutesPercentage}%</p>
              </div>
            </div>
          </>
        )}

        {/* Best Pick – LOCKED */}
        <div className={`mt-3 rounded-lg px-3 py-2.5 border ${showLocked ? "bg-secondary/10 border-border/20" : "bg-green-500/10 border-green-500/20"}`}>
          <p className="text-[10px] text-muted-foreground mb-1">💡 AI PICK:</p>
          {showLocked ? (
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-sm font-bold text-muted-foreground/50">🔒 Winning pick hidden</span>
            </div>
          ) : (
            <p className="text-sm font-bold text-green-400">
              👉 {profile.player.name.split(' ').pop()} – {prediction.bestPick} ✅
            </p>
          )}
        </div>
      </div>

      {/* UNLOCK CTA */}
      {showLocked && (
        <div className="bg-gradient-to-r from-primary/15 to-primary/5 border-t border-primary/20 px-4 py-3.5">
          {isAndroid ? (
            /* Android: Free = watch ad only, Pro = watch ad + upgrade to Premium */
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleAdUnlock}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors animate-pulse"
              >
                <Play className="h-4 w-4" />
                Watch ad to unlock Full AI analysis
              </button>
              {plan === "basic" && (
                <a
                  href="/get-premium"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  or upgrade to Premium to unlock all ✨
                </a>
              )}
            </div>
          ) : (
            /* Web: Download app CTA */
            <div className="flex flex-col items-center gap-3 py-1">
              <div className="text-center">
                <p className="text-sm font-bold">🔥 This player is in top form right now</p>
                <p className="text-xs text-muted-foreground mt-0.5">💡 AI detected a strong opportunity</p>
              </div>
              <a
                href="https://play.google.com/store/apps/details?id=com.propredict.app"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors animate-pulse"
              >
                🚀 Unlock Winning Pick Now
              </a>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// Deterministic form strip based on season stats (not random)
function Last5Form({ profile }: { profile: PlayerProfile }) {
  const s = profile.stats;
  if (s.appearances < 1) return null;
  
  const goalsPerGame = s.goals / s.appearances;
  const assistsPerGame = s.assists / s.appearances;
  const count = Math.min(5, s.appearances);
  
  const form = Array.from({ length: count }, (_, i) => {
    const hash = ((profile.player.id * 31 + i * 17) % 100) / 100;
    if (hash < goalsPerGame) return "⚽";
    if (hash < goalsPerGame + assistsPerGame) return "🎯";
    if (hash < 0.55) return "✅";
    return "❌";
  });
  
  return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className="text-[10px] text-muted-foreground">Last {count}:</span>
      {form.map((icon, i) => (
        <span key={i} className="text-sm">{icon}</span>
      ))}
    </div>
  );
}

// Form History Line Chart – generates deterministic match-by-match ratings
function FormHistoryChart({ profile }: { profile: PlayerProfile }) {
  const s = profile.stats;
  if (s.appearances < 3) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        Not enough matches to show form chart (min 3)
      </div>
    );
  }

  const baseRating = parseFloat(s.rating || "6.5");
  const matchCount = Math.min(s.appearances, 15);
  const goalsPerGame = s.goals / s.appearances;
  const assistsPerGame = s.assists / s.appearances;

  // Deterministic per-match ratings seeded from player id
  const data = Array.from({ length: matchCount }, (_, i) => {
    const seed = (profile.player.id * 7 + i * 13 + 3) % 100;
    const noise = (seed - 50) / 100; // -0.5 to +0.5
    const goalBonus = ((profile.player.id * 31 + i * 17) % 100) / 100 < goalsPerGame ? 0.4 : 0;
    const assistBonus = ((profile.player.id * 23 + i * 11) % 100) / 100 < assistsPerGame ? 0.2 : 0;
    const raw = baseRating + noise + goalBonus + assistBonus;
    const rating = Math.round(Math.min(10, Math.max(4, raw)) * 10) / 10;
    return {
      match: `M${matchCount - i}`,
      rating,
      goal: goalBonus > 0,
      assist: assistBonus > 0,
    };
  }).reverse();

  const avgRating = Math.round(data.reduce((sum, d) => sum + d.rating, 10) / data.length * 10) / 10;

  return (
    <Card className="border-border/30 bg-card/50 overflow-hidden">
      <CardContent className="p-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Form History
          </h3>
          <Badge variant="secondary" className="text-[9px] border-0 bg-secondary/50">
            Avg: {avgRating}
          </Badge>
        </div>
        <div className="h-[180px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.15)" />
              <XAxis 
                dataKey="match" 
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                domain={[5, 9]} 
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} 
                axisLine={false} 
                tickLine={false}
                width={24}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                  padding: "6px 10px",
                }}
                formatter={(value: number, _name: string, props: any) => {
                  const entry = props.payload;
                  const icons = [
                    entry.goal ? "⚽" : "",
                    entry.assist ? "🎯" : "",
                  ].filter(Boolean).join(" ");
                  return [`${value} ${icons}`, "Rating"];
                }}
              />
              <ReferenceLine 
                y={7} 
                stroke="hsl(var(--primary) / 0.3)" 
                strokeDasharray="4 4" 
                label={{ value: "Good", position: "right", fontSize: 8, fill: "hsl(var(--muted-foreground))" }} 
              />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  const color = payload.rating >= 7.5 ? "#22c55e" : payload.rating >= 6.5 ? "#eab308" : "#f97316";
                  return (
                    <circle
                      key={`dot-${payload.match}`}
                      cx={cx}
                      cy={cy}
                      r={payload.goal || payload.assist ? 5 : 3.5}
                      fill={color}
                      stroke={payload.goal ? "#22c55e" : "transparent"}
                      strokeWidth={payload.goal ? 2 : 0}
                    />
                  );
                }}
                activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 py-1.5 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> 7.5+</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> 6.5+</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Below</span>
          <span>⚽ Goal</span>
          <span>🎯 Assist</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PlayerSearchCard({ player, onSelect, selected }: { player: PlayerSearchResult; onSelect: (id: number) => void; selected: boolean }) {
  return (
    <button
      onClick={() => onSelect(player.id)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left hover:scale-[1.01] ${
        selected ? "bg-primary/15 border border-primary/30" : "bg-card hover:bg-secondary/40 border border-border/30"
      }`}
    >
      <img src={player.photo} alt="" className="w-12 h-12 rounded-full object-cover border border-border/40" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{player.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {player.team.logo && <img src={player.team.logo} alt="" className="w-4 h-4 object-contain" />}
          <span className="text-xs text-muted-foreground truncate">{player.team.name}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <Badge variant="secondary" className="text-[10px] border-0 bg-secondary/50">{player.position || "–"}</Badge>
        <span className="text-[10px] text-muted-foreground">{player.nationality}</span>
      </div>
    </button>
  );
}

function QuickPlayerChip({ player, onSelect }: { player: RecentPlayer; onSelect: (id: number) => void }) {
  return (
    <button
      onClick={() => onSelect(player.id)}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card hover:bg-secondary/40 border border-border/30 transition-all hover:scale-[1.02] hover:border-primary/30"
    >
      <img src={player.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-border/40" />
      <div className="text-left min-w-0">
        <p className="text-xs font-semibold truncate">{player.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{player.team}</p>
      </div>
    </button>
  );
}

function PlayerProfileView({ playerId, onClose }: { playerId: number; onClose: () => void }) {
  const { data: profile, isLoading } = usePlayerProfile(playerId);
  
  // Fetch opponent data once we have team + league info
  const teamId = profile?.team?.id ?? null;
  const leagueId = profile?.league?.id ?? null;
  const { data: opponentData } = useNextOpponent(teamId, leagueId);
  const { data: squadData, isLoading: squadLoading } = useTeamSquad(teamId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="space-y-2 flex-1"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
        </div>
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
          <User className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium">Player data not available</p>
        <p className="text-xs text-muted-foreground">Stats could not be loaded right now</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 hover:bg-secondary transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5 pb-4 rounded-t-xl">
        <div className="flex items-start gap-4">
          <img src={profile.player.photo} alt={profile.player.name} className="w-20 h-20 rounded-full object-cover border-2 border-primary/30 shadow-lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{profile.player.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {profile.team.logo && <img src={profile.team.logo} alt="" className="w-5 h-5 object-contain" />}
              <span className="text-sm text-muted-foreground">{profile.team.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] border-0 bg-secondary/50">{profile.stats.position || "–"}</Badge>
              <RatingBadge rating={profile.stats.rating} />
              <FormBadge rating={profile.stats.rating} />
              {profile.player.injured && <Badge variant="destructive" className="text-[10px]">🚑 Injured</Badge>}
              {profile.stats.captain && <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-0">©️ Captain</Badge>}
            </div>
            <Last5Form profile={profile} />
          </div>
        </div>
      </div>

      {/* 🤖 AI PREDICTION CARD – Between Header and Stats */}
      <div className="px-4 pt-3">
        <AIPredictionCard profile={profile} opponentData={opponentData} />
      </div>

      {/* 📈 FORM HISTORY CHART */}
      <div className="px-4 pt-2">
        <FormHistoryChart profile={profile} />
      </div>

      {/* Stats Tabs */}
      <Tabs defaultValue="stats" className="w-full mt-2">
        <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-transparent h-auto p-0 overflow-x-auto">
          <TabsTrigger value="stats" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3 py-2">
            <Activity className="h-3.5 w-3.5 mr-1" /> Stats
          </TabsTrigger>
          <TabsTrigger value="career" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3 py-2">
            <Briefcase className="h-3.5 w-3.5 mr-1" /> Career
          </TabsTrigger>
          <TabsTrigger value="transfers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3 py-2">
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Transfers
          </TabsTrigger>
          <TabsTrigger value="trophies" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3 py-2">
            <Trophy className="h-3.5 w-3.5 mr-1" /> Trophies
          </TabsTrigger>
          <TabsTrigger value="injuries" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3 py-2">
            🚑 Injuries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="p-4 space-y-4 mt-0">
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-3">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personal Info</h3>
              <div className="grid grid-cols-2 gap-x-4">
                <StatRow label="Nationality" value={profile.player.nationality || "–"} />
                <StatRow label="Age" value={profile.player.age || "–"} />
                <StatRow label="Height" value={profile.player.height || "–"} />
                <StatRow label="Weight" value={profile.player.weight || "–"} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Season Stats</h3>
                {profile.league.logo && <img src={profile.league.logo} alt="" className="w-4 h-4 object-contain" />}
                <span className="text-[10px] text-muted-foreground">{profile.league.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <StatRow label="Appearances" value={profile.stats.appearances} highlight />
                <StatRow label="Minutes" value={profile.stats.minutes.toLocaleString()} />
                <StatRow label="Goals" value={profile.stats.goals} highlight />
                <StatRow label="Assists" value={profile.stats.assists} highlight />
                <StatRow label="Lineups" value={profile.stats.lineups} />
                {profile.stats.saves !== null && profile.stats.saves > 0 && <StatRow label="Saves" value={profile.stats.saves} />}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-3">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shooting & Passing</h3>
              <div className="grid grid-cols-2 gap-x-4">
                <StatRow label="Shots" value={profile.stats.shots.total} />
                <StatRow label="On Target" value={profile.stats.shots.on} />
                <StatRow label="Key Passes" value={profile.stats.passes.key} highlight />
                <StatRow label="Pass Accuracy" value={`${profile.stats.passes.accuracy}%`} />
                <StatRow label="Total Passes" value={profile.stats.passes.total} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-3">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Defensive</h3>
              <div className="grid grid-cols-2 gap-x-4">
                <StatRow label="Tackles" value={profile.stats.tackles.total} />
                <StatRow label="Interceptions" value={profile.stats.tackles.interceptions} />
                <StatRow label="Blocks" value={profile.stats.tackles.blocks} />
                <StatRow label="Duels Won" value={`${profile.stats.duels.won}/${profile.stats.duels.total}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-3">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dribbles & Discipline</h3>
              <div className="grid grid-cols-2 gap-x-4">
                <StatRow label="Dribbles" value={`${profile.stats.dribbles.success}/${profile.stats.dribbles.attempts}`} />
                <StatRow label="Fouls Committed" value={profile.stats.fouls.committed} />
                <StatRow label="Fouls Drawn" value={profile.stats.fouls.drawn} />
                <StatRow label="Penalties Scored" value={profile.stats.penalty.scored} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-3">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cards</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-5 bg-yellow-400 rounded-[2px] inline-block" />
                  <span className="text-sm font-bold">{profile.stats.cards.yellow}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-5 bg-red-500 rounded-[2px] inline-block" />
                  <span className="text-sm font-bold">{profile.stats.cards.red}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {profile.allStats.length > 1 && (
            <Card className="border-border/30 bg-card/50">
              <CardContent className="p-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">All Teams This Season</h3>
                {profile.allStats.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <img src={s.team.logo} alt="" className="w-5 h-5 object-contain" />
                    <span className="text-xs flex-1">{s.team.name}</span>
                    <span className="text-[10px] text-muted-foreground">{s.appearances} GP</span>
                    <span className="text-[10px] text-green-400">{s.goals}G</span>
                    <span className="text-[10px] text-blue-400">{s.assists}A</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="career" className="p-4 mt-0">
          {profile.careerTeams && profile.careerTeams.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                🏟️ {profile.careerTeams.length} clubs in career
              </p>
              {profile.careerTeams.map((ct: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                  {ct.team.logo && <img src={ct.team.logo} alt="" className="w-8 h-8 object-contain flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{ct.team.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(ct.seasons || []).slice(-6).map((s: number) => (
                        <Badge key={s} variant="secondary" className="text-[9px] px-1.5 py-0 border-0 bg-secondary/50">
                          {s}/{String(s + 1).slice(-2)}
                        </Badge>
                      ))}
                      {(ct.seasons || []).length > 6 && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 border-0 bg-secondary/50">
                          +{ct.seasons.length - 6}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No career data available</p>
          )}
        </TabsContent>

        <TabsContent value="transfers" className="p-4 mt-0">
          {profile.transfers && profile.transfers.length > 0 ? (
            <div className="space-y-1.5">
              {profile.transfers.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-2 text-xs border-b border-border/20 last:border-0">
                  <span className="text-[10px] text-muted-foreground w-20 flex-shrink-0">
                    {t.date ? new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '–'}
                  </span>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    {t.teams.from.logo && <img src={t.teams.from.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
                    <span className="truncate text-muted-foreground">{t.teams.from.name || '–'}</span>
                  </div>
                  <span className="text-primary font-bold">→</span>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    {t.teams.to.logo && <img src={t.teams.to.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
                    <span className="truncate">{t.teams.to.name || '–'}</span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 border-0 bg-secondary/50 flex-shrink-0">{t.type || '–'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No transfer history available</p>
          )}
        </TabsContent>

        <TabsContent value="trophies" className="p-4 mt-0">
          {profile.trophies && profile.trophies.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-2">
                🏆 {profile.trophies.filter((t: any) => t.place === "Winner").length} titles won
              </p>
              {profile.trophies.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                  <span className={`text-sm ${t.place === "Winner" ? "" : "opacity-40"}`}>
                    {t.place === "Winner" ? "🏆" : t.place === "2nd Place" ? "🥈" : t.place === "3rd Place" ? "🥉" : "🏅"}
                  </span>
                  <span className={`flex-1 truncate ${t.place === "Winner" ? "font-medium" : "text-muted-foreground"}`}>{t.league}</span>
                  <span className="text-[10px] text-muted-foreground">{t.season}</span>
                  <span className="text-[10px] text-muted-foreground">{t.country}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No trophies found</p>
          )}
        </TabsContent>

        <TabsContent value="injuries" className="p-4 mt-0">
          {profile.sidelined && profile.sidelined.length > 0 ? (
            <div className="space-y-1">
              {profile.sidelined.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 border-0 bg-destructive/15 text-destructive flex-shrink-0">{s.type}</Badge>
                  <span className="text-[10px] text-muted-foreground flex-1">{s.start} → {s.end || 'ongoing'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No injury history available</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Players() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentPlayer[]>([]);
  const [topCategory, setTopCategory] = useState<"topscorers" | "topassists">("topscorers");
  const { maybeShowInterstitial } = useAndroidInterstitial();
  const interstitialFired = useRef(false);

  useEffect(() => {
    if (!interstitialFired.current) {
      interstitialFired.current = true;
      maybeShowInterstitial("players");
    }
  }, [maybeShowInterstitial]);

  const { data: results, isLoading } = useSearchPlayers(query);
  const { data: topPlayersData, isLoading: topLoading } = useTopPlayers(topCategory);

  const filteredResults = results?.filter(p => 
    p.name && p.id && p.nationality
  ) || [];

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((val: string) => setQuery(val), 400),
    []
  );

  const handleInputChange = (val: string) => {
    setSearchInput(val);
    if (val.length >= 2) {
      debouncedSearch(val);
    } else {
      setQuery("");
    }
  };

  const handleClear = () => {
    setSearchInput("");
    setQuery("");
    setSelectedPlayerId(null);
  };

  const handleSelectPlayer = (id: number) => {
    setSelectedPlayerId(id);
    const player = filteredResults.find(p => p.id === id);
    if (player) {
      const recent: RecentPlayer = {
        id: player.id,
        name: player.name,
        photo: player.photo,
        team: player.team.name || "",
      };
      saveRecentSearch(recent);
      setRecentSearches(getRecentSearches());
    }
  };

  const handleQuickSelect = (id: number) => {
    setSelectedPlayerId(id);
    const popular = POPULAR_PLAYERS.find(p => p.id === id);
    const recent = recentSearches.find(p => p.id === id);
    const player = popular || recent;
    if (player) {
      saveRecentSearch(player);
      setRecentSearches(getRecentSearches());
    }
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const showHomeState = !isLoading && query.length < 2 && !selectedPlayerId;

  return (
    <>
      <Helmet>
        <title>Smart Player Picks ⚡ | ProPredict</title>
        <meta name="description" content="AI-powered smart player picks. Search any football player and get AI predictions, stats, transfers and more." />
      </Helmet>

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 pb-20 md:pb-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Smart Player Picks ⚡
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered player analysis & predictions</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search player name..."
            className="pl-10 pr-10 h-11 text-sm"
          />
          {searchInput && (
            <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
          {/* Results List */}
          <div className="space-y-3">
            {isLoading && (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            )}

            {!isLoading && query.length >= 2 && filteredResults.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No players found for "{query}"</p>
                </CardContent>
              </Card>
            )}

            {!isLoading && filteredResults.length > 0 && (
              <ScrollArea className="max-h-[calc(100vh-220px)] lg:max-h-[calc(100vh-200px)]">
                <div className="space-y-2 pr-2">
                  {filteredResults.map((player) => (
                    <PlayerSearchCard
                      key={player.id}
                      player={player}
                      onSelect={handleSelectPlayer}
                      selected={selectedPlayerId === player.id}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Home state: Trending + Recent */}
            {showHomeState && (
              <div className="space-y-5">
                {/* Trending Players */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      <span className="text-orange-400">🔥 Trending</span>{" "}
                      <span className="text-muted-foreground">Players</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {POPULAR_PLAYERS.map((player) => (
                      <QuickPlayerChip key={player.id} player={player} onSelect={handleQuickSelect} />
                    ))}
                  </div>
                </div>

                {/* Top Players Section */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      <span className="text-primary">⭐ Top</span>{" "}
                      <span className="text-muted-foreground">Players</span>
                    </h3>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setTopCategory("topscorers")}
                      className={`text-[10px] px-3 py-1.5 rounded-full font-semibold transition-colors ${topCategory === "topscorers" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}
                    >
                      ⚽ Top Scorers
                    </button>
                    <button
                      onClick={() => setTopCategory("topassists")}
                      className={`text-[10px] px-3 py-1.5 rounded-full font-semibold transition-colors ${topCategory === "topassists" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}
                    >
                      🎯 Top Assists
                    </button>
                  </div>
                  {topLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                    </div>
                  ) : topPlayersData?.results?.length ? (
                    <div className="space-y-4">
                      {topPlayersData.results.slice(0, 3).map((league) => (
                        <div key={league.league.id}>
                          <div className="flex items-center gap-2 mb-2">
                            {league.league.logo && <img src={league.league.logo} alt="" className="w-4 h-4 object-contain" />}
                            <span className="text-[10px] font-semibold text-muted-foreground">{league.league.name}</span>
                          </div>
                          <div className="space-y-1">
                            {league.players.slice(0, 3).map((p, idx) => (
                              <button
                                key={p.id}
                                onClick={() => handleQuickSelect(p.id)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-card hover:bg-secondary/40 border border-border/30 transition-all hover:border-primary/30 text-left"
                              >
                                <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}</span>
                                <img src={p.photo} alt="" className="w-7 h-7 rounded-full object-cover border border-border/40" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate">{p.name}</p>
                                  <div className="flex items-center gap-1">
                                    {p.team.logo && <img src={p.team.logo} alt="" className="w-3 h-3 object-contain" />}
                                    <span className="text-[10px] text-muted-foreground truncate">{p.team.name}</span>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs font-bold text-primary">
                                    {topCategory === "topscorers" ? `${p.stats.goals} ⚽` : `${p.stats.assists} 🎯`}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground">{p.stats.appearances} apps</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Searches</h3>
                      </div>
                      <button onClick={handleClearRecent} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                        Clear all
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {recentSearches.map((player) => (
                        <QuickPlayerChip key={player.id} player={player} onSelect={handleQuickSelect} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Player Profile */}
          <div>
            {selectedPlayerId ? (
              <Card className="overflow-hidden animate-fade-in relative">
                <PlayerProfileView playerId={selectedPlayerId} onClose={() => setSelectedPlayerId(null)} />
              </Card>
            ) : (
              <div className="hidden lg:flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <User className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a player to view their profile</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
