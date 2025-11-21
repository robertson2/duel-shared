/**
 * Outlier Detection Settings
 * Manages threshold configurations for pattern detection analytics
 */

export interface SalesOutlierSettings {
  limit: number; // Maximum results to return, default 50
  minZScore: number; // Minimum z-score for detection, default 1.5
}

export interface EngagementAnomalySettings {
  limit: number; // Maximum results to return, default 100
  minZScore: number; // Minimum z-score for detection, default 1.5
}

export interface EfficientConverterSettings {
  limit: number; // Maximum results to return, default 50
  minSales: number; // Minimum sales amount, default 1000
  maxEngagement: number; // Maximum engagement score, default 5000
  minEfficiency: number; // Minimum efficiency ratio, default 0.3
}

export interface OutlierSettings {
  salesOutliers: SalesOutlierSettings;
  engagementAnomalies: EngagementAnomalySettings;
  efficientConverters: EfficientConverterSettings;
}

// Default settings based on current implementation
export const DEFAULT_OUTLIER_SETTINGS: OutlierSettings = {
  salesOutliers: {
    limit: 50,
    minZScore: 1.5,
  },
  engagementAnomalies: {
    limit: 100,
    minZScore: 1.5,
  },
  efficientConverters: {
    limit: 50,
    minSales: 1000,
    maxEngagement: 5000,
    minEfficiency: 0.3,
  },
};

const SETTINGS_STORAGE_KEY = 'outlier_detection_settings';

/**
 * Load settings from localStorage
 */
export function loadSettings(): OutlierSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_OUTLIER_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      return {
        salesOutliers: { ...DEFAULT_OUTLIER_SETTINGS.salesOutliers, ...parsed.salesOutliers },
        engagementAnomalies: { ...DEFAULT_OUTLIER_SETTINGS.engagementAnomalies, ...parsed.engagementAnomalies },
        efficientConverters: { ...DEFAULT_OUTLIER_SETTINGS.efficientConverters, ...parsed.efficientConverters },
      };
    }
  } catch (e) {
    console.error('Failed to load outlier settings:', e);
  }

  return DEFAULT_OUTLIER_SETTINGS;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: OutlierSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save outlier settings:', e);
  }
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): OutlierSettings {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }
  return DEFAULT_OUTLIER_SETTINGS;
}

/**
 * Validate settings
 */
export function validateSettings(settings: OutlierSettings): string[] {
  const errors: string[] = [];

  // Validate positive limits
  if (settings.salesOutliers.limit < 1 || settings.salesOutliers.limit > 100) {
    errors.push('Sales outliers limit must be between 1 and 100');
  }
  if (settings.engagementAnomalies.limit < 1 || settings.engagementAnomalies.limit > 200) {
    errors.push('Engagement anomalies limit must be between 1 and 200');
  }
  if (settings.efficientConverters.limit < 1 || settings.efficientConverters.limit > 100) {
    errors.push('Efficient converters limit must be between 1 and 100');
  }

  // Validate z-scores
  if (settings.salesOutliers.minZScore < 1.0 || settings.salesOutliers.minZScore > 5.0) {
    errors.push('Sales outliers z-score must be between 1.0 and 5.0');
  }
  if (settings.engagementAnomalies.minZScore < 1.0 || settings.engagementAnomalies.minZScore > 5.0) {
    errors.push('Engagement anomalies z-score must be between 1.0 and 5.0');
  }

  // Validate efficient converter thresholds
  if (settings.efficientConverters.minSales < 0) {
    errors.push('Minimum sales must be positive');
  }
  if (settings.efficientConverters.maxEngagement < 0) {
    errors.push('Maximum engagement must be positive');
  }
  if (settings.efficientConverters.minEfficiency < 0 || settings.efficientConverters.minEfficiency > 10) {
    errors.push('Efficiency threshold must be between 0 and 10');
  }

  // Validate logical relationships
  if (settings.efficientConverters.minSales === 0 && settings.efficientConverters.maxEngagement === 0) {
    errors.push('At least one threshold must be non-zero for efficient converters');
  }

  return errors;
}

