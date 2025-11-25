import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Helper function to convert sales values (which may be strings) to numbers
export const parseSales = (sales: number | string | null | undefined): number => {
  if (sales === null || sales === undefined) return 0;
  return typeof sales === 'string' ? parseFloat(sales) : sales;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface AdvocateAccount {
  account_id: string;
  email: string;
}

export interface AdvocateUser {
  user_id: string;
  account_id: string;
  name: string | null;
  email: string | null; // Joined from advocate account
  instagram_handle: string | null;
  tiktok_handle: string | null;
  joined_at: string | null;
}

export interface AccountEngagement {
  account_id: string;
  email: string;
  total_users: number;
  user_names: string | null;
  instagram_handles: string | null;
  tiktok_handles: string | null;
  total_engagement_score: number | null;
  avg_engagement_score: number | null;
  max_engagement_score: number | null;
  total_impact_score: number | null;
  avg_impact_score: number | null;
  max_impact_score: number | null;
  avg_engagement_rate: number | null;
  total_likes: number | null;
  total_comments: number | null;
  total_shares: number | null;
  total_reach: number | null;
  total_sales: number | string | null;
  programs_with_sales: number | null;
  program_conversion_rate: number | null;
  avg_sale_amount: number | null;
  total_programs: number | null;
  total_tasks: number | null;
  // Champion-specific metrics (Query 1.1-1.4)
  champion_score?: number | null;
  sales_per_program?: number | null;
  engagement_per_task?: number | null;
  efficiency_score?: number | null;
  sales_per_engagement_point?: number | null;
  avg_sale_per_converting_program?: number | null;
  opportunity_flag?: string | null;
  avg_engagement_per_task?: number | null;
  balance_score?: number | null;
}

export interface PlatformPerformance {
  platform: string;
  total_tasks: number;
  total_accounts: number;
  total_users: number;
  avg_engagement_score: number | null;
  avg_impact_score: number | null;
  avg_engagement_rate: number | null;
  total_sales: number | string;
  conversion_rate_pct: number | null;
}

export interface BrandPerformance {
  brand: string;
  total_accounts: number;
  total_advocates: number;
  total_sales: number | string;
  sales_per_account: number | null;
  sales_per_advocate: number | null;
  avg_engagement_score: number | null;
  avg_impact_score: number | null;
  avg_engagement_rate: number | null;
  total_programs: number;
}

export interface DataQualityIssue {
  issue_id: string;
  severity: string;
  issue_type: string;
  issue_description: string;
  affected_record_id?: string | null;
  affected_field?: string | null;
  detected_at: string;
  resolved: boolean;
  account_id?: string | null;
}

export interface BrandPlatformFit {
  brand: string;
  platform: string;
  programs: number;
  advocate_accounts: number;
  advocate_users: number;
  tasks: number;
  avg_engagement: number | null;
  total_sales: number | string;
  programs_with_sales: number;
  program_conversion_rate_pct: number | null;
  revenue_per_task: number | null;
  revenue_per_account: number | null;
}

export interface SalesOutlier {
  attribution_id: string;
  program_id: string;
  advocate_user_name: string | null;
  account_email: string;
  account_id: string;
  brand: string;
  amount: number | string;
  avg_sale: number | null;
  z_score: number | null;
  outlier_type: string;
  attributed_at: string;
}

export interface EngagementAnomaly {
  analytics_id: string;
  task_id: string;
  platform: string;
  brand: string;
  advocate_user_name: string | null;
  account_email: string;
  account_id: string;
  engagement_score: number;
  avg_engagement: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  reach: number | null;
  z_score: number | null;
  engagement_category: string;
}

export interface EfficientConverter {
  account_id: string;
  email: string;
  total_users: number;
  user_names: string | null;
  total_engagement_score: number | null;
  total_sales: number | string;
  programs_with_sales: number;
  program_conversion_rate: number | null;
  total_tasks: number;
  sales_efficiency: number | null;
  pattern_note: string;
}

export interface DataCompleteness {
  entity: string;
  total_records: number;
  has_email: number | null;
  field2: number | null;
  field3: number | null;
  field4: number | null;
  metric1_pct: number | null;
  metric2_pct: number | null;
}

export interface PerformanceTier {
  tier: string;
  account_count: number;
  avg_engagement: number | null;
  avg_sales: number | null;
  total_tier_sales: number | null;
  avg_programs: number | null;
  avg_program_conversion_rate: number | null;
  pct_of_total_sales: number | null;
}

export interface ActivitySegment {
  account_id: string;
  email: string;
  total_users: number;
  user_names: string | null;
  total_programs: number;
  total_tasks: number;
  total_engagement_score: number | null;
  total_sales: number | string;
  program_conversion_rate: number | null;
  activity_segment: string;
  value_segment: string;
}

export interface ConversionEfficiencySegment {
  converter_segment: string;
  account_count: number;
  avg_efficiency: number | null;
  avg_sales: number | null;
  avg_engagement: number | null;
  avg_program_conversion_rate: number | null;
}

// API Functions
export const apiClient = {
  // Health check
  health: async () => {
    const response = await api.get('/api/v1/health');
    return response.data;
  },

  // Users
  getUsers: async (limit = 100): Promise<AdvocateUser[]> => {
    const response = await api.get('/api/v1/users', { params: { limit } });
    return response.data;
  },

  getUser: async (userId: string): Promise<AdvocateUser> => {
    const response = await api.get(`/api/v1/users/${userId}`);
    return response.data;
  },

  // Accounts
  getAccounts: async (limit = 100): Promise<AdvocateAccount[]> => {
    const response = await api.get('/api/v1/accounts', { params: { limit } });
    return response.data;
  },

  getAccount: async (accountId: string): Promise<AdvocateAccount> => {
    const response = await api.get(`/api/v1/accounts/${accountId}`);
    return response.data;
  },

  getAccountEngagement: async (accountId: string): Promise<AccountEngagement> => {
    const response = await api.get(`/api/v1/accounts/${accountId}/engagement`);
    return response.data;
  },

  getAccountUsers: async (accountId: string): Promise<AdvocateUser[]> => {
    const response = await api.get(`/api/v1/accounts/${accountId}/users`);
    return response.data;
  },

  getAccountPrograms: async (accountId: string) => {
    const response = await api.get(`/api/v1/accounts/${accountId}/programs`);
    return response.data;
  },

  getAccountSales: async (
    accountId: string,
    limit = 100,
    offset = 0,
    startDate?: string,
    endDate?: string
  ) => {
    const params: Record<string, string | number> = { limit, offset };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get(`/api/v1/accounts/${accountId}/sales`, { params });
    return response.data;
  },

  getAccountSocialAnalytics: async (
    accountId: string,
    limit = 100,
    offset = 0,
    startDate?: string,
    endDate?: string,
    platform?: string
  ) => {
    const params: Record<string, string | number> = { limit, offset };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (platform) params.platform = platform;
    const response = await api.get(`/api/v1/accounts/${accountId}/social-analytics`, { params });
    return response.data;
  },

  // Analytics
  getEngagementMetrics: async (userId?: string) => {
    const params = userId ? { user_id: userId } : {};
    const response = await api.get('/api/v1/analytics/engagement', { params });
    return response.data;
  },

  getTopAccounts: async (
    metric = 'engagement',
    limit = 20,
    offset = 0,
    search?: string
  ): Promise<AccountEngagement[]> => {
    const params: Record<string, string | number> = { metric, limit, offset };
    if (search) params.search = search;
    const response = await api.get('/api/v1/analytics/top-accounts', { params });
    return response.data;
  },

  getTopAccountsCount: async (search?: string): Promise<{ total: number }> => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    const response = await api.get('/api/v1/analytics/top-accounts/count', { params });
    return response.data;
  },

  getPlatformPerformance: async (): Promise<PlatformPerformance[]> => {
    const response = await api.get('/api/v1/analytics/platforms');
    return response.data;
  },

  getBrandPerformance: async (limit?: number): Promise<BrandPerformance[]> => {
    const params = limit ? { limit } : {};
    const response = await api.get('/api/v1/analytics/brands', { params });
    return response.data;
  },

  getChampions: async (
    championType: 'overall' | 'sales' | 'engagement' | 'balanced' = 'overall',
    limit = 50,
    settings?: Record<string, number>
  ): Promise<AccountEngagement[]> => {
    const params: Record<string, string | number> = { 
      champion_type: championType, 
      limit 
    };
    
    // Add settings as query parameters if provided
    if (settings) {
      Object.keys(settings).forEach(key => {
        params[key] = settings[key];
      });
    }
    
    const response = await api.get('/api/v1/analytics/champions', { params });
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/api/v1/analytics/dashboard-stats');
    return response.data;
  },

  // Sales
  getSalesSummary: async () => {
    const response = await api.get('/api/v1/sales/summary');
    return response.data;
  },

  getSalesAttribution: async (programId?: string) => {
    const params = programId ? { program_id: programId } : {};
    const response = await api.get('/api/v1/sales/attribution', { params });
    return response.data;
  },

  // Data Quality
  getDataQualityIssues: async (severity?: string): Promise<DataQualityIssue[]> => {
    const params = severity ? { severity } : {};
    const response = await api.get('/api/v1/data-quality/issues', { params });
    return response.data;
  },

  getDataQualityIssuesByAccount: async (
    accountId: string,
    severity?: string,
    resolved?: boolean
  ): Promise<DataQualityIssue[]> => {
    const params: Record<string, string | boolean> = {};
    if (severity) params.severity = severity;
    if (resolved !== undefined) params.resolved = resolved;
    const response = await api.get(`/api/v1/data-quality/issues/by-account/${accountId}`, { params });
    return response.data;
  },

  getDataQualitySummary: async () => {
    const response = await api.get('/api/v1/data-quality/summary');
    return response.data;
  },

  getDataCompleteness: async (): Promise<DataCompleteness[]> => {
    const response = await api.get('/api/v1/data-quality/completeness');
    return response.data;
  },

  // Advanced Analytics
  getBrandPlatformFit: async (brand?: string, minPrograms = 1): Promise<BrandPlatformFit[]> => {
    const params = brand ? { brand, min_programs: minPrograms } : { min_programs: minPrograms };
    const response = await api.get('/api/v1/analytics/brand-platform-fit', { params });
    return response.data;
  },

  getSalesOutliers: async (limit = 50, minZScore = 1.5): Promise<SalesOutlier[]> => {
    const response = await api.get('/api/v1/analytics/outliers/sales', {
      params: { limit, min_z_score: minZScore },
    });
    return response.data;
  },

  getEngagementAnomalies: async (limit = 100, minZScore = 1.5): Promise<EngagementAnomaly[]> => {
    const response = await api.get('/api/v1/analytics/outliers/engagement', {
      params: { limit, min_z_score: minZScore },
    });
    return response.data;
  },

  getEfficientConverters: async (
    limit = 50,
    minSales = 1000,
    maxEngagement = 5000,
    minEfficiency = 0.3
  ): Promise<EfficientConverter[]> => {
    const response = await api.get('/api/v1/analytics/patterns/efficient-converters', {
      params: {
        limit,
        min_sales: minSales,
        max_engagement: maxEngagement,
        min_efficiency: minEfficiency,
      },
    });
    return response.data;
  },

  // Advocate Segmentation (Queries 4.1-4.3)
  getPerformanceTiers: async (): Promise<PerformanceTier[]> => {
    const response = await api.get('/api/v1/analytics/segments/performance-tiers');
    return response.data;
  },

  getActivitySegments: async (
    limit = 500,
    offset = 0,
    activityLevel?: string,
    valueLevel?: string
  ): Promise<ActivitySegment[]> => {
    const params: Record<string, string | number> = { limit, offset };
    if (activityLevel) params.activity_level = activityLevel;
    if (valueLevel) params.value_level = valueLevel;
    const response = await api.get('/api/v1/analytics/segments/activity-based', { params });
    return response.data;
  },

  getActivitySegmentsCount: async (
    activityLevel?: string,
    valueLevel?: string
  ): Promise<{ total: number }> => {
    const params: Record<string, string> = {};
    if (activityLevel) params.activity_level = activityLevel;
    if (valueLevel) params.value_level = valueLevel;
    const response = await api.get('/api/v1/analytics/segments/activity-based/count', { params });
    return response.data;
  },

  getConversionEfficiencySegments: async (): Promise<ConversionEfficiencySegment[]> => {
    const response = await api.get('/api/v1/analytics/segments/conversion-efficiency');
    return response.data;
  },

  // File Upload
  getUploadHistory: async (limit = 50) => {
    const response = await api.get('/api/v1/uploads/history', { params: { limit } });
    return response.data;
  },
};

export default api;

