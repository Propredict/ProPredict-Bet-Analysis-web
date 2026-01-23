import { useEffect, useRef, useCallback } from "react";
import { Match } from "@/hooks/useLiveScores";
import { toast } from "@/hooks/use-toast";

/* =========================
   TYPES
========================= */

interface AlertSettings {
  enabled: boolean;
  goals: boolean;
  soundEnabled: boolean;
  favoritesOnly: boolean;
}

const ALERT_SETTINGS_KEY = "live-scores-alert-settings";
const FAVORITES_KEY = "match-favorites";

/* =========================
   HELPERS
========================= */

function getAlertSettings(): AlertSettings {
  try {
    const stored = localStorage.getItem(ALERT_SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}

  // ✅ ENABLED BY DEFAULT
  return {
    enabled: true,
    goals: true,
    soundEnabled: true,
    favoritesOnly: false,
  };
}

function getFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 880;

    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

/* =========================
   HOOK
========================= */

export function useLiveAlerts(matches: Match[]) {
  const prevRef = useRef<Map<number, Match>>(new Map());
  const firstRun = useRef(true);

  const triggerGoal = useCallback((match: Match) => {
    const settings = getAlertSettings();
    if (!settings.enabled || !settings.goals) return;

    if (settings.soundEnabled) playAlertSound();

    toast({
      title: "⚽ GOAL!",
      description: `${match.homeTeam} ${match.homeScore} – ${match.awayScore} ${match.awayTeam}${
        match.minute ? ` (${match.minute}')` : ""
      }`,
    });
  }, []);

  useEffect(() => {
    // ⛔ skip first render
    if (firstRun.current) {
      firstRun.current = false;
      const map = new Map<number, Match>();
      matches.forEach((m) => map.set(m.id, m));
      prevRef.current = map;
      return;
    }

    const settings = getAlertSettings();
    if (!settings.enabled) return;

    const favorites = getFavorites();

    matches.forEach((current) => {
      const previous = prevRef.current.get(current.id);
      if (!previous) return;

      if (settings.favoritesOnly && !favorites.has(String(current.id))) {
        return;
      }

      if (current.status !== "live" && current.status !== "halftime") {
        return;
      }

      const prevHome = previous.homeScore ?? 0;
      const prevAway = previous.awayScore ?? 0;
      const currHome = current.homeScore ?? 0;
      const currAway = current.awayScore ?? 0;

      if (currHome > prevHome || currAway > prevAway) {
        triggerGoal(current);
      }
    });

    const next = new Map<number, Match>();
    matches.forEach((m) => next.set(m.id, m));
    prevRef.current = next;
  }, [matches, triggerGoal]);
}
