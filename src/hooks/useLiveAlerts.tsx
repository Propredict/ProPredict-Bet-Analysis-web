import { useEffect, useRef, useState, useCallback } from "react";
import { Match } from "@/hooks/useLiveScores";
import { toast } from "sonner";

interface MatchSnapshot {
  homeScore: number;
  awayScore: number;
  redCards: number;
}

interface AlertSettings {
  enabled: boolean;
  notifyGoals: boolean;
  notifyRedCards: boolean;
  soundEnabled: boolean;
  favoritesOnly: boolean;
}

export interface RecentGoal {
  matchId: string;
  timestamp: number;
  scoringTeam: string;
}

const STORAGE_KEY = "live-scores-alert-settings";
const GOAL_DISPLAY_DURATION = 30000; // 30 seconds

function getAlertSettings(): AlertSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        enabled: parsed.enabled ?? false,
        notifyGoals: parsed.notifyGoals ?? true,
        notifyRedCards: parsed.notifyRedCards ?? true,
        soundEnabled: parsed.soundEnabled ?? true,
        favoritesOnly: parsed.favoritesOnly ?? false,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { enabled: false, notifyGoals: true, notifyRedCards: true, soundEnabled: true, favoritesOnly: false };
}

// Preloaded audio elements for instant playback
let goalAudio: HTMLAudioElement | null = null;
let redCardAudio: HTMLAudioElement | null = null;

function preloadSounds() {
  try {
    if (!goalAudio) {
      goalAudio = new Audio("/sounds/goal.mp3");
      goalAudio.preload = "auto";
    }
    if (!redCardAudio) {
      redCardAudio = new Audio("/sounds/red-card.mp3");
      redCardAudio.preload = "auto";
    }
  } catch {
    // Audio not supported
  }
}

// Preload as soon as module loads
preloadSounds();

function playGoalSound() {
  try {
    if (goalAudio) {
      goalAudio.currentTime = 0;
      goalAudio.play().catch(() => {});
    }
  } catch {
    // Audio not supported
  }
}

function playRedCardSound() {
  try {
    if (redCardAudio) {
      redCardAudio.currentTime = 0;
      redCardAudio.play().catch(() => {});
    }
  } catch {
    // Audio not supported
  }
}

export function useLiveAlerts(matches: Match[], favoriteMatchIds?: Set<string>, alertedMatchIds?: Set<string>, context: "live-scores" | "favorites" = "live-scores") {
  const prevSnapshots = useRef<Map<string, MatchSnapshot>>(new Map());
  const initialized = useRef(false);
  const [recentGoals, setRecentGoals] = useState<RecentGoal[]>([]);

  // Cleanup expired goals every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRecentGoals((prev) => prev.filter((g) => now - g.timestamp < GOAL_DISPLAY_DURATION));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if a match has a recent goal
  const hasRecentGoal = useCallback(
    (matchId: string) => {
      const now = Date.now();
      return recentGoals.some((g) => g.matchId === matchId && now - g.timestamp < GOAL_DISPLAY_DURATION);
    },
    [recentGoals]
  );

  useEffect(() => {
    if (!matches || matches.length === 0) return;

    // INIT – store initial snapshots without triggering alerts
    if (!initialized.current) {
      matches.forEach((m) => {
        prevSnapshots.current.set(m.id, {
          homeScore: m.homeScore ?? 0,
          awayScore: m.awayScore ?? 0,
          redCards: countRedCards(m),
        });
      });
      initialized.current = true;
      return;
    }

    // Read alert settings
    const alertSettings = getAlertSettings();

    // CHECK – compare current vs previous for live matches only
    matches.forEach((m) => {
      if (m.status !== "live" && m.status !== "halftime") return;

      const prev = prevSnapshots.current.get(m.id);
      const currHomeScore = m.homeScore ?? 0;
      const currAwayScore = m.awayScore ?? 0;
      const currRedCards = countRedCards(m);

      if (prev) {
        // ⚽ GOAL DETECTION
        const goalScored = prev.homeScore !== currHomeScore || prev.awayScore !== currAwayScore;
        
        if (goalScored) {
          const scoringTeam = prev.homeScore !== currHomeScore ? m.homeTeam : m.awayTeam;
          
          // Always track recent goals for UI indicator (regardless of notification settings)
          setRecentGoals((current) => [
            ...current.filter((g) => g.matchId !== m.id), // Remove old entry for this match
            { matchId: m.id, timestamp: Date.now(), scoringTeam },
          ]);

          // Check per-match selections
          const isFavoriteMatch = favoriteMatchIds?.has(m.id) ?? false;
          const hasMatchBell = alertedMatchIds?.has(m.id) ?? false;
          
          // Goal notification logic (Live Scores context):
          // 1. No bells, no favs → all live matches (notifyGoals)
          // 2. No bells, has favs → all live + favorites
          // 3. Bells active on this or other current matches → ONLY bell'd + favorites
          const shouldNotifyGoal = alertSettings.enabled && (
            context === "favorites"
              ? isFavoriteMatch
              : hasMatchBell
                ? true // This match has bell → always notify
                : isFavoriteMatch
                  ? true // This match is favorited → always notify
                  : alertSettings.notifyGoals // No bell, no fav → notify if global goals ON
          );

          if (shouldNotifyGoal) {
            // Play sound if enabled
            if (alertSettings.soundEnabled) {
              playGoalSound();
            }
            
            toast.custom(
              () => (
                <div className="flex items-start gap-3 bg-[#1C1917] border border-red-500/40 rounded-xl p-4 shadow-2xl shadow-red-500/30 animate-scale-in min-w-[280px]">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <span className="absolute inset-0 h-3 w-3 rounded-full bg-red-500 animate-ping opacity-75" />
                    <span className="relative inline-block h-3 w-3 rounded-full bg-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">⚽</span>
                      <span className="text-emerald-400 font-bold text-sm uppercase tracking-wide">
                        GOAL
                      </span>
                    </div>
                    <p className="text-white font-semibold text-sm truncate">
                      {scoringTeam} scores!
                    </p>
                    <p className="text-white/70 text-sm mt-1">
                      {m.homeTeam} <span className="font-bold text-red-400">{currHomeScore}</span> – <span className="font-bold text-red-400">{currAwayScore}</span> {m.awayTeam}
                    </p>
                    {m.minute && (
                      <p className="text-white/40 text-xs mt-1">{m.minute}'</p>
                    )}
                  </div>
                </div>
              ),
              {
                duration: 6000,
                position: "top-right",
              }
            );
          }
        }

        // 🟥 RED CARD DETECTION - same selective logic
        const hasMatchBellRC = alertedMatchIds?.has(m.id) ?? false;
        const isFavRC = favoriteMatchIds?.has(m.id) ?? false;
        const shouldNotifyRedCard = alertSettings.enabled && currRedCards > prev.redCards && (
          context === "favorites"
            ? isFavRC
            : hasMatchBellRC || isFavRC || alertSettings.notifyRedCards
        );
        
        if (shouldNotifyRedCard) {
          // Play sound if enabled
          if (alertSettings.soundEnabled) {
            playRedCardSound();
          }
          
          toast.custom(
            () => (
              <div className="flex items-start gap-3 bg-[#1a0505] border border-red-600/60 rounded-lg p-4 shadow-2xl shadow-red-600/20 animate-scale-in min-w-[280px]">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🟥</span>
                </div>
                <div className="flex-1">
                  <p className="text-red-500 font-black text-sm uppercase tracking-wider mb-1">
                    RED CARD
                  </p>
                  <p className="text-white/90 text-sm">
                    {m.homeTeam} vs {m.awayTeam}
                  </p>
                  {m.minute && (
                    <p className="text-white/50 text-xs mt-1">{m.minute}'</p>
                  )}
                </div>
              </div>
            ),
            {
              duration: 5000,
              position: "top-right",
            }
          );
        }
      }

      // Update snapshot
      prevSnapshots.current.set(m.id, {
        homeScore: currHomeScore,
        awayScore: currAwayScore,
        redCards: currRedCards,
      });
    });
  }, [matches]);

  return { recentGoals, hasRecentGoal };
}

// Helper to count red cards from match (if events exist)
function countRedCards(match: Match): number {
  const events = (match as any).events;
  if (Array.isArray(events)) {
    return events.filter((e: any) => e.type === "redcard" || e.type === "red_card").length;
  }
  return 0;
}
