import { useEffect, useRef, useCallback } from "react";
import { Match } from "@/hooks/useLiveScores";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

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

  // ✅ ENABLED BY DEFAULT (BITNO)
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
  /**
   * 🔑 Čuvamo SAMO score snapshot
   * key = match.id (string)
   */
  const prevScoresRef = useRef<Map<string, { home: number; away: number }>>(new Map());

  const firstRun = useRef(true);

  const triggerGoal = useCallback(async (match: Match) => {
    const settings = getAlertSettings();
    if (!settings.enabled || !settings.goals) return;

    // 🔊 sound
    if (settings.soundEnabled) {
      playAlertSound();
    }

    // 🔔 UI toast
    toast({
      title: "⚽ GOAL!",
      description: `${match.homeTeam} ${match.homeScore ?? 0} – ${match.awayScore ?? 0} ${match.awayTeam}${
        match.minute ? ` (${match.minute}')` : ""
      }`,
    });

    // 🧾 SUPABASE EVENT INSERT
    const { error } = await supabase.from("match_alert_events").insert({
      match_id: match.id,
      event_type: "goal",
      home_score: match.homeScore ?? 0,
      away_score: match.awayScore ?? 0,
      minute: match.minute ?? null,
    });

    if (error) {
      console.error("Failed to insert match alert event:", error);
    }
  }, []);

  useEffect(() => {
    if (!matches.length) return;

    /**
     * ⛔ Prvi render:
     * samo zapamti score (bez alert-a)
     */
    if (firstRun.current) {
      firstRun.current = false;

      const init = new Map<string, { home: number; away: number }>();
      matches.forEach((m) => {
        init.set(m.id, {
          home: m.homeScore ?? 0,
          away: m.awayScore ?? 0,
        });
      });

      prevScoresRef.current = init;
      return;
    }

    const settings = getAlertSettings();
    if (!settings.enabled) return;

    const favorites = getFavorites();

    matches.forEach((current) => {
      // samo LIVE / HT
      if (current.status !== "live" && current.status !== "halftime") return;

      // favorites-only check
      if (settings.favoritesOnly && !favorites.has(current.id)) return;

      const prev = prevScoresRef.current.get(current.id);
      if (!prev) return;

      const currHome = current.homeScore ?? 0;
      const currAway = current.awayScore ?? 0;

      const homeGoal = currHome > prev.home;
      const awayGoal = currAway > prev.away;

      if (homeGoal || awayGoal) {
        // ❗ NE await-ujemo
        triggerGoal(current);
      }
    });

    /**
     * 🔄 Update snapshot
     */
    const next = new Map<string, { home: number; away: number }>();
    matches.forEach((m) => {
      next.set(m.id, {
        home: m.homeScore ?? 0,
        away: m.awayScore ?? 0,
      });
    });

    prevScoresRef.current = next;
  }, [matches, triggerGoal]);
}
