/**
 * Champion Analytics Settings
 * Manages threshold configurations for different champion categories
 */

export interface OverallChampionSettings {
  engagementWeight: number; // 0-1, default 0.4
  salesWeight: number; // 0-1, default 0.4
  conversionWeight: number; // 0-1, default 0.2
}

export interface SalesChampionSettings {
  minSales: number; // Minimum sales to be considered, default 0
}

export interface EngagementChampionSettings {
  minEngagement: number; // Minimum engagement score, default 300
  highPotentialEngagement: number; // Threshold for high potential, default 800
  highPotentialMaxSales: number; // Max sales for high potential, default 1000
  mediumPotentialEngagement: number; // Threshold for medium potential, default 600
  mediumPotentialMaxSales: number; // Max sales for medium potential, default 2000
}

export interface BalancedPerformerSettings {
  minEngagement: number; // Minimum engagement, default 500
  minSales: number; // Minimum sales, default 500
  engagementNormalizer: number; // Divider for engagement, default 1000
  salesNormalizer: number; // Divider for sales, default 1000
}

export interface ChampionSettings {
  overall: OverallChampionSettings;
  sales: SalesChampionSettings;
  engagement: EngagementChampionSettings;
  balanced: BalancedPerformerSettings;
}

// Default settings based on current implementation
export const DEFAULT_CHAMPION_SETTINGS: ChampionSettings = {
  overall: {
    engagementWeight: 0.4,
    salesWeight: 0.4,
    conversionWeight: 0.2,
  },
  sales: {
    minSales: 0,
  },
  engagement: {
    minEngagement: 300,
    highPotentialEngagement: 800,
    highPotentialMaxSales: 1000,
    mediumPotentialEngagement: 600,
    mediumPotentialMaxSales: 2000,
  },
  balanced: {
    minEngagement: 500,
    minSales: 500,
    engagementNormalizer: 1000,
    salesNormalizer: 1000,
  },
};

const SETTINGS_STORAGE_KEY = 'champion_analytics_settings';

/**
 * Load settings from localStorage
 */
export function loadSettings(): ChampionSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_CHAMPION_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      return {
        overall: { ...DEFAULT_CHAMPION_SETTINGS.overall, ...parsed.overall },
        sales: { ...DEFAULT_CHAMPION_SETTINGS.sales, ...parsed.sales },
        engagement: { ...DEFAULT_CHAMPION_SETTINGS.engagement, ...parsed.engagement },
        balanced: { ...DEFAULT_CHAMPION_SETTINGS.balanced, ...parsed.balanced },
      };
    }
  } catch (e) {
    console.error('Failed to load champion settings:', e);
  }

  return DEFAULT_CHAMPION_SETTINGS;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: ChampionSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save champion settings:', e);
  }
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): ChampionSettings {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }
  return DEFAULT_CHAMPION_SETTINGS;
}

/**
 * Validate settings
 */
export function validateSettings(settings: ChampionSettings): string[] {
  const errors: string[] = [];

  // Validate overall weights sum to 1
  const totalWeight =
    settings.overall.engagementWeight +
    settings.overall.salesWeight +
    settings.overall.conversionWeight;
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    errors.push('Overall champion weights must sum to 1.0 (100%)');
  }

  // Validate positive numbers
  if (settings.engagement.minEngagement < 0) {
    errors.push('Minimum engagement must be positive');
  }
  if (settings.balanced.minEngagement < 0 || settings.balanced.minSales < 0) {
    errors.push('Balanced performer minimums must be positive');
  }
  if (
    settings.balanced.engagementNormalizer <= 0 ||
    settings.balanced.salesNormalizer <= 0
  ) {
    errors.push('Normalizers must be greater than 0');
  }

  // Validate logical relationships
  if (
    settings.engagement.highPotentialEngagement <
    settings.engagement.mediumPotentialEngagement
  ) {
    errors.push(
      'High potential engagement threshold must be greater than medium potential'
    );
  }

  return errors;
}

