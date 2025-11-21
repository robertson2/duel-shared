/**
 * Segment Analytics Settings
 * Manages threshold configurations for advocate segmentation
 */

export interface PerformanceTierSettings {
  platinumEngagement: number; // default 50000
  platinumSales: number; // default 5000
  goldEngagement: number; // default 20000
  goldSales: number; // default 2000
  silverEngagement: number; // default 5000
  silverSales: number; // default 500
  bronzeEngagement: number; // default 1000
  bronzeSales: number; // default 100
}

export interface ActivitySegmentSettings {
  highlyActivePrograms: number; // default 10
  highlyActiveTasks: number; // default 10
  activePrograms: number; // default 5
  activeTasks: number; // default 5
  moderatePrograms: number; // default 2
  moderateTasks: number; // default 2
  highValueSales: number; // default 2000
  mediumValueSales: number; // default 500
}

export interface ConversionEfficiencySettings {
  superConverterThreshold: number; // default 0.5
  highConverterThreshold: number; // default 0.3
  averageConverterThreshold: number; // default 0.1
}

export interface SegmentSettings {
  performanceTiers: PerformanceTierSettings;
  activitySegments: ActivitySegmentSettings;
  conversionEfficiency: ConversionEfficiencySettings;
}

// Default settings based on current implementation
export const DEFAULT_SEGMENT_SETTINGS: SegmentSettings = {
  performanceTiers: {
    platinumEngagement: 50000,
    platinumSales: 5000,
    goldEngagement: 20000,
    goldSales: 2000,
    silverEngagement: 5000,
    silverSales: 500,
    bronzeEngagement: 1000,
    bronzeSales: 100,
  },
  activitySegments: {
    highlyActivePrograms: 10,
    highlyActiveTasks: 10,
    activePrograms: 5,
    activeTasks: 5,
    moderatePrograms: 2,
    moderateTasks: 2,
    highValueSales: 2000,
    mediumValueSales: 500,
  },
  conversionEfficiency: {
    superConverterThreshold: 0.5,
    highConverterThreshold: 0.3,
    averageConverterThreshold: 0.1,
  },
};

const SETTINGS_STORAGE_KEY = 'segment_analytics_settings';

/**
 * Load settings from localStorage
 */
export function loadSettings(): SegmentSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SEGMENT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      return {
        performanceTiers: { ...DEFAULT_SEGMENT_SETTINGS.performanceTiers, ...parsed.performanceTiers },
        activitySegments: { ...DEFAULT_SEGMENT_SETTINGS.activitySegments, ...parsed.activitySegments },
        conversionEfficiency: { ...DEFAULT_SEGMENT_SETTINGS.conversionEfficiency, ...parsed.conversionEfficiency },
      };
    }
  } catch (e) {
    console.error('Failed to load segment settings:', e);
  }

  return DEFAULT_SEGMENT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: SegmentSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save segment settings:', e);
  }
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): SegmentSettings {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }
  return DEFAULT_SEGMENT_SETTINGS;
}

/**
 * Validate settings
 */
export function validateSettings(settings: SegmentSettings): string[] {
  const errors: string[] = [];

  // Validate tier thresholds are in descending order
  const tiers = settings.performanceTiers;
  if (tiers.platinumEngagement <= tiers.goldEngagement) {
    errors.push('Platinum engagement must be greater than Gold');
  }
  if (tiers.goldEngagement <= tiers.silverEngagement) {
    errors.push('Gold engagement must be greater than Silver');
  }
  if (tiers.silverEngagement <= tiers.bronzeEngagement) {
    errors.push('Silver engagement must be greater than Bronze');
  }

  // Validate activity thresholds
  const activity = settings.activitySegments;
  if (activity.highlyActivePrograms <= activity.activePrograms) {
    errors.push('Highly Active programs must be greater than Active');
  }
  if (activity.activePrograms <= activity.moderatePrograms) {
    errors.push('Active programs must be greater than Moderate');
  }

  // Validate efficiency thresholds
  const efficiency = settings.conversionEfficiency;
  if (efficiency.superConverterThreshold <= efficiency.highConverterThreshold) {
    errors.push('Super Converter threshold must be greater than High Converter');
  }
  if (efficiency.highConverterThreshold <= efficiency.averageConverterThreshold) {
    errors.push('High Converter threshold must be greater than Average Converter');
  }

  // Validate positive numbers
  Object.values(tiers).forEach(value => {
    if (value < 0) {
      errors.push('All tier thresholds must be positive');
    }
  });

  return errors;
}




