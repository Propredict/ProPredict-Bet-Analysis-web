import { useEffect, useRef, useCallback } from "react";
import { Match } from "@/hooks/useLiveScores";
import { toast } from "@/hooks/use-toast";

/* =========================
   TYPES
========================= */

interface AlertSettings {
  enabled: boolean;
  goals: boolean;
  redCards: boolean;
  yellowCards: boolean;
  soundEnabled: boolean;
  favoritesOnly: boolean;
}

/* =========================
   DEFAULT SETTINGS
   (MORA enabled: true)
========================= */

const defaultSettings: AlertSettings = {
  enabled: true, // ✅ BITNO
  goals: true,
  redCards: true,
  yellowCards: false,
  soundEnabled: true,
  favoritesOnly: false,
};

/* =========================
   HELPERS
========================= */

function getSettings(): AlertSettings {
  try {
    const stored = localStorage.getItem("live-scores-alert-settings");
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
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
  } catch {
    // ignore
  }
  return new Set();
}

function playSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 800;

    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // audio not supported
  }
}

/* =========================
   HOOK
========================= */

export function useLiveAlerts(matches: Match[]) {
  /**
   * Čuvamo prethodni score kao string "1-0"
   */
  const prevScoresRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  const triggerGoalAlert = useCallback((match: Match, score: string, settings: AlertSettings) => {
    toast({
      title: "⚽ GOAL!",
      description: `${match.homeTeam} ${score} ${match.awayTeam}${match.minute ? ` (${match.minute}')` : ""}`,
    });

    if (settings.soundEnabled) {
      playSound();
    }
  }, []);

  useEffect(() => {
    if (!matches.length) return;

    const settings = getSettings();
    if (!settings.enabled) return;

    const favorites = getFavorites();

    // 1️⃣ INIT – prvi render, samo zapamti score
    if (!initializedRef.current) {
      matches.forEach((m) => {
        prevScoresRef.current.set(m.id, `${m.homeScore ?? 0}-${m.awayScore ?? 0}`);
      });
      initializedRef.current = true;
      return;
    }

    // 2️⃣ CHECK – detekcija promene
    matches.forEach((m) => {
      if (m.status !== "live" && m.status !== "halftime") return;

      if (settings.favoritesOnly && !favorites.has(m.id)) return;

      const prevScore = prevScoresRef.current.get(m.id);
      const currScore = `${m.homeScore ?? 0}-${m.awayScore ?? 0}`;

      if (settings.goals && prevScore && prevScore !== currScore) {
        triggerGoalAlert(m, currScore, settings);
      }

      // 3️⃣ UPDATE SNAPSHOT
      prevScoresRef.current.set(m.id, currScore);
    });
  }, [matches, triggerGoalAlert]);
}
