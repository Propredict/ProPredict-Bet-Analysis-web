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

const defaultSettings: AlertSettings = {
  enabled: false,
  goals: true,
  redCards: true,
  yellowCards: false,
  soundEnabled: true,
  favoritesOnly: false,
};

function getSettings(): AlertSettings {
  try {
    const stored = localStorage.getItem("live-scores-alert-settings");
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    // ignore
  }
  return defaultSettings;
}

function getFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem("match-alert-preferences");
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (e) {
    // ignore
  }
  return new Set();
}

export function useLiveAlerts(matches: Match[]) {
  const prevRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  const playSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Audio not supported
    }
  }, []);

  const triggerAlert = useCallback((type: "goal" | "redCard" | "yellowCard", match: Match, message: string, settings: AlertSettings) => {
    const icons = { goal: "⚽", redCard: "🟥", yellowCard: "🟨" };
    const titles = { goal: "GOAL!", redCard: "RED CARD!", yellowCard: "YELLOW CARD!" };
    
    toast({
      title: `${icons[type]} ${titles[type]}`,
      description: message,
    });

    if (settings.soundEnabled) {
      playSound();
    }
  }, [playSound]);

  useEffect(() => {
    if (!matches.length) return;

    const settings = getSettings();
    
    if (!settings.enabled) return;

    const favorites = getFavorites();

    // Initialize on first run
    if (!initializedRef.current) {
      matches.forEach((m) => {
        prevRef.current.set(m.id, `${m.homeScore ?? 0}-${m.awayScore ?? 0}`);
      });
      initializedRef.current = true;
      return;
    }

    // Check for changes
    matches.forEach((m) => {
      if (m.status !== "live" && m.status !== "halftime") return;

      // Check favorites filter
      if (settings.favoritesOnly && !favorites.has(m.id)) return;

      const prev = prevRef.current.get(m.id);
      const curr = `${m.homeScore ?? 0}-${m.awayScore ?? 0}`;

      // Detect goal
      if (settings.goals && prev && prev !== curr) {
        const minute = m.minute ? `(${m.minute}')` : "";
        triggerAlert("goal", m, `${m.homeTeam} ${curr} ${m.awayTeam} ${minute}`, settings);
      }

      prevRef.current.set(m.id, curr);
    });
  }, [matches, triggerAlert]);
}
