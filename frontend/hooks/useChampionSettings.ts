/**
 * React Hook for Champion Settings Management
 * Provides reactive access to champion settings
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ChampionSettings,
  loadSettings,
  saveSettings as persistSettings,
  DEFAULT_CHAMPION_SETTINGS,
} from '@/lib/championSettings';

export function useChampionSettings() {
  const [settings, setSettings] = useState<ChampionSettings>(DEFAULT_CHAMPION_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setIsLoaded(true);
  }, []);

  // Save settings
  const saveSettings = useCallback((newSettings: ChampionSettings) => {
    setSettings(newSettings);
    persistSettings(newSettings);
  }, []);

  // Update specific category
  const updateSettings = useCallback(
    <K extends keyof ChampionSettings>(
      category: K,
      updates: Partial<ChampionSettings[K]>
    ) => {
      const newSettings = {
        ...settings,
        [category]: {
          ...settings[category],
          ...updates,
        },
      };
      saveSettings(newSettings);
    },
    [settings, saveSettings]
  );

  return {
    settings,
    isLoaded,
    saveSettings,
    updateSettings,
  };
}

