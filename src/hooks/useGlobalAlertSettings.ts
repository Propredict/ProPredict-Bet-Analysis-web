import { useState, useEffect, useCallback } from "react";

export interface GlobalAlertSettings {
  enabled: boolean;
  notifyGoals: boolean;
  notifyRedCards: boolean;
  notifyYellowCards: boolean;
  soundEnabled: boolean;
  favoritesOnly: boolean;
}

const STORAGE_KEY = "live-scores-alert-settings";

const defaultSettings: GlobalAlertSettings = {
  enabled: false,
  notifyGoals: true,
  notifyRedCards: true,
  notifyYellowCards: false,
  soundEnabled: true,
  favoritesOnly: false,
};

export function useGlobalAlertSettings() {
  const [settings, setSettings] = useState<GlobalAlertSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error("Error loading alert settings:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error("Error saving alert settings:", error);
      }
    }
  }, [settings, isLoaded]);

  const updateSetting = useCallback(<K extends keyof GlobalAlertSettings>(
    key: K,
    value: GlobalAlertSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleSetting = useCallback((key: keyof GlobalAlertSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return {
    settings,
    updateSetting,
    toggleSetting,
    resetSettings,
    isLoaded,
  };
}
