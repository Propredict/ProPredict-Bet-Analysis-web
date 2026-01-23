import { useEffect, useRef, useCallback } from "react";
import { Match } from "@/hooks/useLiveScores";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface AlertSettings {
  enabled: boolean;
  goals: boolean;
  soundEnabled: boolean;
  favoritesOnly: boolean;
}

const ALERT_SETTINGS_KEY = "live-scores-alert-settings";
const FAVORITES_KEY = "match-favorites";

function getAlertSettings(): AlertSettings {
  try {
    const stored = localStorage.getItem(ALERT_SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}

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

export function useLiveAlerts(matches: Match[]) {
  console.log("useLiveAlerts running", matches.length);

  const prevScoresRef = useRef<Map<string, { home: number; away: number }>>(new Map());
  const firstRun = useRef(true);

  const triggerGoal = useCallback(async (match: Match) => {
    const settings = getAlertSettings();
    if (!settings.enabled || !settings.goals) return;

    if (settings.soundEnabled) playAlertSound();

    toast({
      title: "⚽ GOAL!",
      description: `${match.homeTeam} ${match.homeScore ?? 0} - ${
        match.awayScore ?? 0
      } ${match.awayTeam}${match.minute ? ` (${match.minute}')` : ""}`,
    });

    await supabase.from("match_alert_events").insert({
      match_id: match.id,
      event_type: "goal",
      home_score: match.homeScore ?? 0,
      away_score: match.awayScore ?? 0,
      minute: match.minute ?? null,
    });
  }, []);

  useEffect(() => {
    if (!matches.length) return;

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
      if (current.status !== "live" && current.status !== "halftime") return;
      if (settings.favoritesOnly && !favorites.has(current.id)) return;

      const prev = prevScoresRef.current.get(current.id);
      if (!prev) return;

      const currHome = current.homeScore ?? 0;
      const currAway = current.awayScore ?? 0;

      if (currHome > prev.home || currAway > prev.away) {
        triggerGoal(current);
      }
    });

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
