import { useState, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Search, User, Trophy, ArrowRightLeft, Activity, X, Clock, TrendingUp, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchPlayers, PlayerSearchResult } from "@/hooks/useSearchPlayers";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  { id: 276, name: "Neymar Jr", photo: "https://media.api-sports.io/football/players/276.png", team: "Santos" },
  { id: 129718, name: "J. Bellingham", photo: "https://media.api-sports.io/football/players/129718.png", team: "Real Madrid" },
  { id: 762, name: "Vinícius Jr", photo: "https://media.api-sports.io/football/players/762.png", team: "Real Madrid" },
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

function PlayerSearchCard({ player, onSelect, selected }: { player: PlayerSearchResult; onSelect: (id: number) => void; selected: boolean }) {
  return (
    <button
      onClick={() => onSelect(player.id)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
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
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card hover:bg-secondary/40 border border-border/30 transition-all"
    >
      <img src={player.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-border/40" />
      <div className="text-left min-w-0">
        <p className="text-xs font-semibold truncate">{player.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{player.team}</p>
      </div>
    </button>
  );
}

function PlayerProfileView({ playerId }: { playerId: number }) {
  const { data: profile, isLoading } = usePlayerProfile(playerId);

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
    <div>
      {/* Hero */}
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
              {profile.player.injured && <Badge variant="destructive" className="text-[10px]">🚑 Injured</Badge>}
              {profile.stats.captain && <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-0">©️ Captain</Badge>}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-transparent h-auto p-0 overflow-x-auto">
          <TabsTrigger value="stats" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3 py-2">
            <Activity className="h-3.5 w-3.5 mr-1" /> Stats
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
          <div>
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personal Info</h3>
            <div className="grid grid-cols-2 gap-x-4">
              <StatRow label="Nationality" value={profile.player.nationality || "–"} />
              <StatRow label="Age" value={profile.player.age || "–"} />
              <StatRow label="Height" value={profile.player.height || "–"} />
              <StatRow label="Weight" value={profile.player.weight || "–"} />
            </div>
          </div>

          <div>
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
          </div>

          <div>
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shooting & Passing</h3>
            <div className="grid grid-cols-2 gap-x-4">
              <StatRow label="Shots" value={profile.stats.shots.total} />
              <StatRow label="On Target" value={profile.stats.shots.on} />
              <StatRow label="Key Passes" value={profile.stats.passes.key} highlight />
              <StatRow label="Pass Accuracy" value={`${profile.stats.passes.accuracy}%`} />
              <StatRow label="Total Passes" value={profile.stats.passes.total} />
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Defensive</h3>
            <div className="grid grid-cols-2 gap-x-4">
              <StatRow label="Tackles" value={profile.stats.tackles.total} />
              <StatRow label="Interceptions" value={profile.stats.tackles.interceptions} />
              <StatRow label="Blocks" value={profile.stats.tackles.blocks} />
              <StatRow label="Duels Won" value={`${profile.stats.duels.won}/${profile.stats.duels.total}`} />
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dribbles & Discipline</h3>
            <div className="grid grid-cols-2 gap-x-4">
              <StatRow label="Dribbles" value={`${profile.stats.dribbles.success}/${profile.stats.dribbles.attempts}`} />
              <StatRow label="Fouls Committed" value={profile.stats.fouls.committed} />
              <StatRow label="Fouls Drawn" value={profile.stats.fouls.drawn} />
              <StatRow label="Penalties Scored" value={profile.stats.penalty.scored} />
            </div>
          </div>

          <div>
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
          </div>

          {profile.allStats.length > 1 && (
            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">All Teams This Season</h3>
              {profile.allStats.map((s, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <img src={s.team.logo} alt="" className="w-5 h-5 object-contain" />
                  <span className="text-xs flex-1">{s.team.name}</span>
                  <span className="text-[10px] text-muted-foreground">{s.appearances} GP</span>
                  <span className="text-[10px] text-green-400">{s.goals}G</span>
                  <span className="text-[10px] text-blue-400">{s.assists}A</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transfers" className="p-4 mt-0">
          {profile.transfers && profile.transfers.length > 0 ? (
            <div className="space-y-1.5">
              {profile.transfers.map((t, i) => (
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
                🏆 {profile.trophies.filter(t => t.place === "Winner").length} titles won
              </p>
              {profile.trophies.map((t, i) => (
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
              {profile.sidelined.map((s, i) => (
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

  const { data: results, isLoading } = useSearchPlayers(query);

  // Filter out players with no useful data (no name or no photo)
  const filteredResults = results?.filter(p => p.name && p.photo && p.id) || [];

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
    // Save to recent searches
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
    // Also save popular player to recent
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
        <title>Player Search | ProPredict</title>
        <meta name="description" content="Search any football player and view complete stats, transfers, trophies and injury history." />
      </Helmet>

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 pb-20 md:pb-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Player Search
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Search any player by name for complete profile & stats</p>
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

            {/* Home state: Popular + Recent */}
            {showHomeState && (
              <div className="space-y-5">
                {/* Popular Players */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Popular Players</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {POPULAR_PLAYERS.map((player) => (
                      <QuickPlayerChip key={player.id} player={player} onSelect={handleQuickSelect} />
                    ))}
                  </div>
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
                <button
                  onClick={() => setSelectedPlayerId(null)}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
                <PlayerProfileView playerId={selectedPlayerId} />
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
