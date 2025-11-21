/**
 * React Hook for Outlier Detection Settings Management
 * Provides reactive access to outlier detection settings
 */

import { useState, useEffect, useCallback } from 'react';
import {
  OutlierSettings,
  loadSettings,
  saveSettings as persistSettings,
  DEFAULT_OUTLIER_SETTINGS,
} from '@/lib/outlierSettings';

export function useOutlierSettings() {
  const [settings, setSettings] = useState<OutlierSettings>(DEFAULT_OUTLIER_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setIsLoaded(true);
  }, []);

  // Save settings
  const saveSettings = useCallback((newSettings: OutlierSettings) => {
    setSettings(newSettings);
    persistSettings(newSettings);
  }, []);

  // Update specific category
  const updateSettings = useCallback(
    <K extends keyof OutlierSettings>(
      category: K,
      updates: Partial<OutlierSettings[K]>
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

