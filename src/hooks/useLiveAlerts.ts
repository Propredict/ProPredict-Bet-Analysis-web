import { useEffect, useRef, useCallback } from "react";
import { Match } from "@/hooks/useLiveScores";
import { toast } from "@/hooks/use-toast";

interface AlertSettings {
  enabled: boolean;
  goals: boolean;
  redCards: boolean;
  yellowCards: boolean;
  soundEnabled: boolean;
  favoritesOnly: boolean;
}

interface MatchWithCards extends Match {
  homeRedCards?: number;
  awayRedCards?: number;
  homeYellowCards?: number;
  awayYellowCards?: number;
}

const ALERT_SETTINGS_KEY = "live-scores-alert-settings";
const FAVORITES_KEY = "match-favorites";

function getAlertSettings(): AlertSettings {
  try {
    const stored = localStorage.getItem(ALERT_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return {
    enabled: false,
    goals: true,
    redCards: true,
    yellowCards: false,
    soundEnabled: false,
    favoritesOnly: false,
  };
}

function getFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // ignore
  }
  return new Set();
}

function playAlertSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // Audio not supported
  }
}

export function useLiveAlerts(matches: Match[]) {
  const previousMatchesRef = useRef<Map<string, MatchWithCards>>(new Map());
  const isFirstRender = useRef(true);

  const triggerAlert = useCallback((
    type: "goal" | "redCard" | "yellowCard",
    match: Match,
    details?: string
  ) => {
    const settings = getAlertSettings();
    
    if (settings.soundEnabled) {
      playAlertSound();
    }

    const icons = {
      goal: "⚽",
      redCard: "🟥",
      yellowCard: "🟨",
    };

    const titles = {
      goal: "GOAL!",
      redCard: "RED CARD!",
      yellowCard: "YELLOW CARD!",
    };

    toast({
      title: `${icons[type]} ${titles[type]}`,
      description: details || `${match.homeTeam} vs ${match.awayTeam}`,
    });
  }, []);

  const detectEvents = useCallback((currentMatches: Match[]) => {
    const settings = getAlertSettings();
    
    if (!settings.enabled) return;

    const favorites = getFavorites();

    currentMatches.forEach((current) => {
      const previous = previousMatchesRef.current.get(current.id);
      
      if (!previous) return;

      // Check favorites filter
      if (settings.favoritesOnly && !favorites.has(current.id)) {
        return;
      }

      // Only check live matches
      if (current.status !== "live" && current.status !== "halftime") {
        return;
      }

      const currentWithCards = current as MatchWithCards;
      const previousWithCards = previous as MatchWithCards;

      // ⚽ GOAL DETECTION
      if (settings.goals) {
        const prevHome = previous.homeScore ?? 0;
        const prevAway = previous.awayScore ?? 0;
        const currHome = current.homeScore ?? 0;
        const currAway = current.awayScore ?? 0;

        if (currHome > prevHome) {
          const minute = current.minute ? `(${current.minute}')` : "";
          triggerAlert(
            "goal",
            current,
            `${current.homeTeam} ${currHome}–${currAway} ${current.awayTeam} ${minute}`
          );
        }

        if (currAway > prevAway) {
          const minute = current.minute ? `(${current.minute}')` : "";
          triggerAlert(
            "goal",
            current,
            `${current.homeTeam} ${currHome}–${currAway} ${current.awayTeam} ${minute}`
          );
        }
      }

      // 🟥 RED CARD DETECTION
      if (settings.redCards) {
        const prevHomeRed = previousWithCards.homeRedCards ?? 0;
        const prevAwayRed = previousWithCards.awayRedCards ?? 0;
        const currHomeRed = currentWithCards.homeRedCards ?? 0;
        const currAwayRed = currentWithCards.awayRedCards ?? 0;

        if (currHomeRed > prevHomeRed || currAwayRed > prevAwayRed) {
          triggerAlert(
            "redCard",
            current,
            `${current.homeTeam} vs ${current.awayTeam}`
          );
        }
      }

      // 🟨 YELLOW CARD DETECTION
      if (settings.yellowCards) {
        const prevHomeYellow = previousWithCards.homeYellowCards ?? 0;
        const prevAwayYellow = previousWithCards.awayYellowCards ?? 0;
        const currHomeYellow = currentWithCards.homeYellowCards ?? 0;
        const currAwayYellow = currentWithCards.awayYellowCards ?? 0;

        if (currHomeYellow > prevHomeYellow || currAwayYellow > prevAwayYellow) {
          triggerAlert(
            "yellowCard",
            current,
            `${current.homeTeam} vs ${current.awayTeam}`
          );
        }
      }
    });
  }, [triggerAlert]);

  useEffect(() => {
    // Skip first render to avoid false positives
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Store initial state
      const map = new Map<string, MatchWithCards>();
      matches.forEach((m) => map.set(m.id, m as MatchWithCards));
      previousMatchesRef.current = map;
      return;
    }

    // Detect events
    detectEvents(matches);

    // Update previous state
    const map = new Map<string, MatchWithCards>();
    matches.forEach((m) => map.set(m.id, m as MatchWithCards));
    previousMatchesRef.current = map;
  }, [matches, detectEvents]);
}
