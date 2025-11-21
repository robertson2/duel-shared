/**
 * React Hook for Segment Settings Management
 * Provides reactive access to segment settings
 */

import { useState, useEffect, useCallback } from 'react';
import {
  SegmentSettings,
  loadSettings,
  saveSettings as persistSettings,
  DEFAULT_SEGMENT_SETTINGS,
} from '@/lib/segmentSettings';

export function useSegmentSettings() {
  const [settings, setSettings] = useState<SegmentSettings>(DEFAULT_SEGMENT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setIsLoaded(true);
  }, []);

  // Save settings
  const saveSettings = useCallback((newSettings: SegmentSettings) => {
    setSettings(newSettings);
    persistSettings(newSettings);
  }, []);

  // Update specific category
  const updateSettings = useCallback(
    <K extends keyof SegmentSettings>(
      category: K,
      updates: Partial<SegmentSettings[K]>
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




