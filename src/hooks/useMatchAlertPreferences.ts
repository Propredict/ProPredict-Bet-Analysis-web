import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "live-scores-match-alerts";

export function useMatchAlertPreferences() {
  const [alertedMatchIds, setAlertedMatchIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setAlertedMatchIds(new Set(parsed));
        }
      }
    } catch (error) {
      console.error("Error loading match alert preferences:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever alertedMatchIds changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...alertedMatchIds]));
      } catch (error) {
        console.error("Error saving match alert preferences:", error);
      }
    }
  }, [alertedMatchIds, isLoaded]);

  const toggleMatchAlert = useCallback((matchId: string) => {
    setAlertedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  }, []);

  const hasAlert = useCallback((matchId: string) => {
    return alertedMatchIds.has(matchId);
  }, [alertedMatchIds]);

  const clearAllAlerts = useCallback(() => {
    setAlertedMatchIds(new Set());
  }, []);

  return {
    alertedMatchIds,
    hasAlert,
    toggleMatchAlert,
    clearAllAlerts,
    isLoaded,
  };
}
