import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

const PRO_DAILY_LIMIT = 5;
const STORAGE_KEY = "match_preview_unlocks";

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getStoredUnlocks(): { date: string; ids: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: getTodayKey(), ids: [] };
    const parsed = JSON.parse(raw);
    if (parsed.date !== getTodayKey()) return { date: getTodayKey(), ids: [] };
    return parsed;
  } catch {
    return { date: getTodayKey(), ids: [] };
  }
}

export function useMatchPreviewUnlocks() {
  const { user } = useAuth();
  const [unlocks, setUnlocks] = useState(getStoredUnlocks);

  // Reset on day change
  useEffect(() => {
    const stored = getStoredUnlocks();
    setUnlocks(stored);
  }, []);

  const todayCount = unlocks.ids.length;
  const remaining = Math.max(0, PRO_DAILY_LIMIT - todayCount);
  const hasReachedLimit = todayCount >= PRO_DAILY_LIMIT;

  const isMatchUnlocked = useCallback((matchId: string) => {
    return unlocks.ids.includes(matchId);
  }, [unlocks.ids]);

  const recordUnlock = useCallback((matchId: string) => {
    setUnlocks((prev) => {
      if (prev.ids.includes(matchId)) return prev;
      const updated = { date: getTodayKey(), ids: [...prev.ids, matchId] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    todayCount,
    remaining,
    hasReachedLimit,
    isMatchUnlocked,
    recordUnlock,
    limit: PRO_DAILY_LIMIT,
  };
}
