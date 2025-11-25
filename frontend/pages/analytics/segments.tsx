import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import useSWR from 'swr';
import { apiClient, parseSales, ActivitySegment } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/layout/PageHeader';
import { PerformanceBadge, TierType } from '@/components/ui/PerformanceBadge';
import { Trophy, Activity, Zap, Settings, Info, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSegmentSettings } from '@/hooks/useSegmentSettings';
import { useCurrency } from '@/contexts/CurrencyContext';

type ViewMode = 'tiers' | 'activity' | 'efficiency';

export default function SegmentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('tiers');
  const { settings } = useSegmentSettings();
  const { formatCurrency } = useCurrency();
  
  // Activity segments filters and pagination
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [valueFilter, setValueFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Fetch performance tiers (Query 4.1)
  const { data: performanceTiers, error: tiersError } = useSWR(
    'performance-tiers',
    () => apiClient.getPerformanceTiers(),
    { refreshInterval: 30000 }
  );

  // Fetch total count of activity segments
  const { data: activitySegmentsCount } = useSWR(
    'activity-segments-count',
    () => apiClient.getActivitySegmentsCount(),
    { refreshInterval: 30000 }
  );

  const totalActivitySegmentsCount = activitySegmentsCount?.total || 0;

  // Fetch all activity segments by making multiple requests if needed (API limit is 500 per request)
  const { data: activitySegments, error: activityError } = useSWR(
    ['activity-segments-all', totalActivitySegmentsCount],
    async () => {
      if (!totalActivitySegmentsCount) return [];
      
      const allSegments: ActivitySegment[] = [];
      const BATCH_SIZE = 500; // API maximum limit
      const totalBatches = Math.ceil(totalActivitySegmentsCount / BATCH_SIZE);
      
      // Fetch all batches in parallel
      const batchPromises = Array.from({ length: totalBatches }, (_, i) => {
        const batchOffset = i * BATCH_SIZE;
        return apiClient.getActivitySegments(BATCH_SIZE, batchOffset);
      });
      
      const batches = await Promise.all(batchPromises);
      batches.forEach(batch => {
        allSegments.push(...batch);
      });
      
      return allSegments;
    },
    { 
      refreshInterval: 30000,
      revalidateOnFocus: false
    }
  );

  // Fetch conversion efficiency segments (Query 4.3)
  const { data: efficiencySegments, error: efficiencyError } = useSWR(
    'efficiency-segments',
    () => apiClient.getConversionEfficiencySegments(),
    { refreshInterval: 30000 }
  );

  const error = tiersError || activityError || efficiencyError;


  // Filter and paginate activity segments
  const filteredActivitySegments = useMemo(() => {
    if (!activitySegments) return [];
    
    return activitySegments.filter((segment) => {
      // Activity level filter
      if (activityFilter !== 'all' && segment.activity_segment !== activityFilter) {
        return false;
      }
      
      // Value segment filter
      if (valueFilter !== 'all' && segment.value_segment !== valueFilter) {
        return false;
      }
      
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = segment.user_names?.toLowerCase().includes(query);
        const emailMatch = segment.email?.toLowerCase().includes(query);
        if (!nameMatch && !emailMatch) {
          return false;
        }
      }
      
      return true;
    });
  }, [activitySegments, activityFilter, valueFilter, searchQuery]);

  // Paginate filtered results
  const paginatedActivitySegments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredActivitySegments.slice(startIndex, endIndex);
  }, [filteredActivitySegments, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredActivitySegments.length / pageSize);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activityFilter, valueFilter, searchQuery, pageSize]);

  // Export functions
  const exportPerformanceTiersToCSV = () => {
    if (!performanceTiers || performanceTiers.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Tier', 'Accounts', 'Avg Engagement', 'Avg Sales', 'Total Revenue', '% of Total', 'Conversion Rate'];
    const rows = performanceTiers.map((tier) => [
      tier.tier,
      tier.account_count,
      tier.avg_engagement || 0,
      tier.avg_sales || 0,
      tier.total_tier_sales || 0,
      tier.pct_of_total_sales ? tier.pct_of_total_sales.toFixed(1) : 0,
      tier.avg_program_conversion_rate || 0
    ]);

    downloadCSV(headers, rows, `performance_tiers_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportActivitySegmentsToCSV = () => {
    if (!activitySegments || activitySegments.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Email', 'User Names', 'Activity Level', 'Value Segment', 'Programs', 'Tasks', 'Engagement', 'Sales'];
    const rows = activitySegments.map((segment) => [
      segment.email || '',
      segment.user_names || '',
      segment.activity_segment || '',
      segment.value_segment || '',
      segment.total_programs || 0,
      segment.total_tasks || 0,
      segment.total_engagement_score || 0,
      parseSales(segment.total_sales)
    ]);

    downloadCSV(headers, rows, `activity_segments_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportEfficiencySegmentsToCSV = () => {
    if (!efficiencySegments || efficiencySegments.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Segment', 'Accounts', 'Avg Efficiency', 'Avg Sales', 'Avg Engagement', 'Avg Conversion Rate'];
    const rows = efficiencySegments.map((segment) => [
      segment.converter_segment || '',
      segment.account_count || 0,
      segment.avg_efficiency?.toFixed(3) || '0',
      segment.avg_sales?.toFixed(2) || '0',
      segment.avg_engagement?.toFixed(0) || '0',
      segment.avg_program_conversion_rate ? (segment.avg_program_conversion_rate * 100).toFixed(1) + '%' : '0%'
    ]);

    downloadCSV(headers, rows, `efficiency_segments_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Helper function to download CSV
  const downloadCSV = (headers: string[], rows: (string | number)[][], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Head>
        <title>Advocate Segments - Analytics</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Advocate Segments"
          subtitle="Performance tiers and activity classification"
          backLink="/analytics"
          backLabel="Back to Analytics"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* View Mode Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'tiers' as ViewMode, label: 'Performance Tiers', icon: Trophy },
                  { id: 'activity' as ViewMode, label: 'Activity Segments', icon: Activity },
                  { id: 'efficiency' as ViewMode, label: 'Conversion Efficiency', icon: Zap },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setViewMode(tab.id)}
                      className={`${
                        viewMode === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Card>
              <div className="p-8 text-center">
                <p className="text-red-600 font-medium mb-2">Failed to load segments</p>
                <p className="text-sm text-gray-500">{error.message || 'Unable to connect to the API'}</p>
              </div>
            </Card>
          )}

          {/* Performance Tiers View (Query 4.1) */}
          {viewMode === 'tiers' && !error && (
            <>
              {/* Info Box - Performance Tiers */}
              <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-purple-900 flex items-center">
                    <Trophy className="w-4 h-4 mr-2" />
                    Performance Tiers Explained
                  </h3>
                  <Link
                    href="/analytics/settings?tab=segments"
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-purple-700 bg-white border border-purple-300 rounded-md hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    <Settings className="w-3 h-3 mr-1.5" />
                    Configure
                  </Link>
                </div>
                <p className="text-xs text-purple-700 mb-3">
                  Advocate accounts are automatically classified into 5 tiers based on their combined engagement and sales performance:
                </p>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div className="bg-white rounded p-2 border border-purple-200">
                    <div className="font-semibold text-purple-900 mb-1">💎 Platinum</div>
                    <div className="text-gray-600">≥{(settings.performanceTiers.platinumEngagement/1000).toFixed(0)}k engagement</div>
                    <div className="text-gray-600">≥${(settings.performanceTiers.platinumSales/1000).toFixed(0)}k sales</div>
                  </div>
                  <div className="bg-white rounded p-2 border border-purple-200">
                    <div className="font-semibold text-yellow-600 mb-1">🥇 Gold</div>
                    <div className="text-gray-600">≥{(settings.performanceTiers.goldEngagement/1000).toFixed(0)}k engagement</div>
                    <div className="text-gray-600">≥${(settings.performanceTiers.goldSales/1000).toFixed(0)}k sales</div>
                  </div>
                  <div className="bg-white rounded p-2 border border-purple-200">
                    <div className="font-semibold text-gray-500 mb-1">🥈 Silver</div>
                    <div className="text-gray-600">≥{(settings.performanceTiers.silverEngagement/1000).toFixed(0)}k engagement</div>
                    <div className="text-gray-600">≥${settings.performanceTiers.silverSales} sales</div>
                  </div>
                  <div className="bg-white rounded p-2 border border-purple-200">
                    <div className="font-semibold text-orange-700 mb-1">🥉 Bronze</div>
                    <div className="text-gray-600">≥{settings.performanceTiers.bronzeEngagement} engagement</div>
                    <div className="text-gray-600">≥${settings.performanceTiers.bronzeSales} sales</div>
                  </div>
                  <div className="bg-white rounded p-2 border border-purple-200">
                    <div className="font-semibold text-blue-600 mb-1">⭐ Starter</div>
                    <div className="text-gray-600">New advocates</div>
                    <div className="text-gray-600">Building track record</div>
                  </div>
                </div>
                <div className="mt-3 flex items-start text-xs text-purple-700">
                  <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Use Case:</strong> Tier-based reward programs, recognition ceremonies, differentiated support levels. 
                    Accounts must meet BOTH engagement AND sales thresholds for upper tiers.
                  </div>
                </div>
              </div>

              {/* Tier Distribution Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                {(['platinum', 'gold', 'silver', 'bronze', 'starter'] as TierType[]).map((tier) => {
                  const tierData = performanceTiers?.find(t => t.tier.toLowerCase() === tier);
                  return (
                    <Card key={tier}>
                      <div className="p-6 text-center">
                        <PerformanceBadge tier={tier} size="lg" />
                        <div className="mt-4 text-3xl font-bold text-gray-900">
                          {tierData?.account_count || 0}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">accounts</div>
                        {tierData && (
                          <div className="mt-3 text-xs text-gray-600 space-y-1">
                            <div>Avg Sales: {formatCurrency(tierData.avg_sales || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div>{tierData.pct_of_total_sales?.toFixed(1) || 0}% of revenue</div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Performance Tiers Summary Table */}
              <Card>
                <div className="flex justify-between items-center px-6 pt-6 pb-0">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Tier Performance Summary</h3>
                    <p className="text-sm text-gray-600 mt-1">Aggregated metrics by performance tier</p>
                  </div>
                  {performanceTiers && performanceTiers.length > 0 && (
                    <button 
                      onClick={exportPerformanceTiersToCSV}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>
                {!performanceTiers && <Loading text="Loading tiers..." />}
                {performanceTiers && performanceTiers.length === 0 && (
                  <div className="p-12 text-center">
                    <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Performance Data Yet
                    </h3>
                    <p className="text-gray-600">
                      Tier performance metrics will appear once you have imported advocate data.
                    </p>
                  </div>
                )}
                {performanceTiers && performanceTiers.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tier
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Accounts
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg Engagement
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg Sales
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Revenue
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            % of Total
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Conversion Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {performanceTiers.map((tier) => (
                          <tr key={tier.tier}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <PerformanceBadge tier={tier.tier.toLowerCase() as TierType} size="sm" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {tier.account_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {tier.avg_engagement?.toLocaleString() || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                              {formatCurrency(tier.avg_sales || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-700">
                              {formatCurrency(tier.total_tier_sales || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {tier.pct_of_total_sales ? Math.round(tier.pct_of_total_sales) : 0}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {tier.avg_program_conversion_rate ? Math.round(tier.avg_program_conversion_rate) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Activity Segments View (Query 4.2) */}
          {viewMode === 'activity' && !error && (
            <>
              {/* Info Box - Activity Segments */}
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-blue-900 flex items-center">
                    <Activity className="w-4 h-4 mr-2" />
                    Activity-Based Segmentation Explained
                  </h3>
                  <Link
                    href="/analytics/settings?tab=segments"
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Settings className="w-3 h-3 mr-1.5" />
                    Configure
                  </Link>
                </div>
                <p className="text-xs text-blue-700 mb-3">
                  Accounts are classified on two dimensions: <strong>Activity Level</strong> (participation) and <strong>Value Segment</strong> (revenue contribution).
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  {/* Activity Levels */}
                  <div className="bg-white rounded p-3 border border-blue-200">
                    <div className="font-semibold text-blue-900 mb-2 text-xs">Activity Levels</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                        <span><strong>Highly Active:</strong> ≥{settings.activitySegments.highlyActivePrograms} programs & ≥{settings.activitySegments.highlyActiveTasks} tasks</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                        <span><strong>Active:</strong> ≥{settings.activitySegments.activePrograms} programs & ≥{settings.activitySegments.activeTasks} tasks</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                        <span><strong>Moderately Active:</strong> ≥{settings.activitySegments.moderatePrograms} programs & ≥{settings.activitySegments.moderateTasks} tasks</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
                        <span><strong>Low Activity:</strong> ≥1 program</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-gray-500 mr-2"></span>
                        <span><strong>Inactive:</strong> No participation</span>
                      </div>
                    </div>
                  </div>

                  {/* Value Segments */}
                  <div className="bg-white rounded p-3 border border-blue-200">
                    <div className="font-semibold text-blue-900 mb-2 text-xs">Value Segments</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
                        <span><strong>High Value:</strong> &gt;${(settings.activitySegments.highValueSales/1000).toFixed(0)}k+ in sales</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-indigo-500 mr-2"></span>
                        <span><strong>Medium Value:</strong> &gt;${settings.activitySegments.mediumValueSales}+ in sales</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-pink-500 mr-2"></span>
                        <span><strong>Low Value:</strong> Some sales</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-gray-400 mr-2"></span>
                        <span><strong>No Sales Yet:</strong> Building pipeline</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start text-xs text-blue-700">
                  <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Use Case:</strong> Identify <em>High Value + Low Activity</em> for engagement campaigns, 
                    or <em>Highly Active + No Sales</em> for sales coaching. Perfect for targeted re-engagement and training programs.
                  </div>
                </div>
              </div>

            <Card>
              <div className="flex justify-between items-center px-6 pt-6 pb-0">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Activity-Based Segmentation</h3>
                  <p className="text-sm text-gray-600 mt-1">{activitySegments?.length || 0} accounts classified by activity and value</p>
                </div>
                {activitySegments && activitySegments.length > 0 && (
                  <button 
                    onClick={exportActivitySegmentsToCSV}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>

              {/* Filters */}
              {activitySegments && activitySegments.length > 0 && (
                <div className="px-6 pt-6 pb-4 space-y-4">
                  {/* Top Row: Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    {/* Activity Level Filter */}
                    <div className="w-full sm:w-48">
                      <select
                        value={activityFilter}
                        onChange={(e) => setActivityFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="all">All Activity Levels</option>
                        <option value="Highly Active">Highly Active</option>
                        <option value="Active">Active</option>
                        <option value="Moderately Active">Moderately Active</option>
                        <option value="Low Activity">Low Activity</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Value Segment Filter */}
                    <div className="w-full sm:w-48">
                      <select
                        value={valueFilter}
                        onChange={(e) => setValueFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="all">All Value Segments</option>
                        <option value="High Value">High Value</option>
                        <option value="Medium Value">Medium Value</option>
                        <option value="Low Value">Low Value</option>
                        <option value="No Sales Yet">No Sales Yet</option>
                      </select>
                    </div>
                  </div>

                  {/* Results count and clear filters */}
                  {(activityFilter !== 'all' || valueFilter !== 'all' || searchQuery) && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-600">
                        Showing {filteredActivitySegments.length} of {activitySegments.length} accounts
                      </div>
                      <button
                        onClick={() => {
                          setActivityFilter('all');
                          setValueFilter('all');
                          setSearchQuery('');
                        }}
                        className="text-primary-600 hover:text-primary-800 font-medium"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!activitySegments && <Loading text="Loading activity segments..." />}
              {activitySegments && activitySegments.length === 0 && (
                <div className="p-12 text-center">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Activity Data Yet
                  </h3>
                  <p className="text-gray-600">
                    Activity-based segments will appear once you have imported advocate data.
                  </p>
                </div>
              )}
              {activitySegments && activitySegments.length > 0 && filteredActivitySegments.length === 0 && (
                <div className="p-12 text-center">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Results Found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No accounts match your current filters.
                  </p>
                  <button
                    onClick={() => {
                      setActivityFilter('all');
                      setValueFilter('all');
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Clear filters
                  </button>
                </div>
              )}
              {activitySegments && activitySegments.length > 0 && filteredActivitySegments.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Activity Level
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value Segment
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Programs
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tasks
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Engagement
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sales
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedActivitySegments.map((segment) => (
                        <tr key={segment.account_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 max-w-xs">
                            <div className="text-sm font-medium text-gray-900 truncate" title={segment.user_names || 'Anonymous'}>
                              {segment.user_names || 'Anonymous'}
                            </div>
                            <div className="text-sm text-gray-500 truncate" title={segment.email}>
                              {segment.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              segment.activity_segment === 'Highly Active' ? 'bg-green-100 text-green-800' :
                              segment.activity_segment === 'Active' ? 'bg-blue-100 text-blue-800' :
                              segment.activity_segment === 'Moderately Active' ? 'bg-yellow-100 text-yellow-800' :
                              segment.activity_segment === 'Low Activity' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {segment.activity_segment}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              segment.value_segment === 'High Value' ? 'bg-purple-100 text-purple-800' :
                              segment.value_segment === 'Medium Value' ? 'bg-indigo-100 text-indigo-800' :
                              segment.value_segment === 'Low Value' ? 'bg-pink-100 text-pink-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {segment.value_segment}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {segment.total_programs}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {segment.total_tasks}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {segment.total_engagement_score?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                            {formatCurrency(parseSales(segment.total_sales), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {filteredActivitySegments.length > 0 && totalPages > 1 && (
                    <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <p className="text-sm text-gray-700">
                            Showing{' '}
                            <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span>
                            {' '}-{' '}
                            <span className="font-medium">
                              {Math.min(currentPage * pageSize, filteredActivitySegments.length)}
                            </span>
                            {' '}of{' '}
                            <span className="font-medium">{filteredActivitySegments.length}</span>
                            {' '}accounts
                          </p>
                          <label className="text-sm text-gray-700">
                            Show:
                            <select
                              value={pageSize}
                              onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                              }}
                              className="ml-2 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </label>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Previous</span>
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            
                            {/* Page numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              if (pageNum < 1 || pageNum > totalPages) return null;
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    currentPage === pageNum
                                      ? 'z-10 bg-primary-600 text-white border-primary-600'
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            
                            {totalPages > 5 && currentPage < totalPages - 2 && (
                              <>
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                  ...
                                </span>
                                <button
                                  onClick={() => setCurrentPage(totalPages)}
                                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                >
                                  {totalPages}
                                </button>
                              </>
                            )}
                            
                            <button
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Next</span>
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
            </>
          )}

          {/* Conversion Efficiency View (Query 4.3) */}
          {viewMode === 'efficiency' && !error && (
            <>
              {/* Info Box - Conversion Efficiency */}
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-green-900 flex items-center">
                    <Zap className="w-4 h-4 mr-2" />
                    Conversion Efficiency Explained
                  </h3>
                  <Link
                    href="/analytics/settings?tab=segments"
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <Settings className="w-3 h-3 mr-1.5" />
                    Configure
                  </Link>
                </div>
                <p className="text-xs text-green-700 mb-3">
                  Measures how effectively advocates convert engagement into sales. <strong>Efficiency = Total Sales ÷ Total Engagement Score</strong>
                </p>
                
                <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                  <div className="bg-white rounded p-2.5 border border-gray-200">
                    <div className="font-semibold text-green-800 mb-1 flex items-center">
                      <Zap className="w-3 h-3 mr-1" />
                      Super Converters
                    </div>
                    <div className="text-gray-700 font-medium">Efficiency ≥{settings.conversionEfficiency.superConverterThreshold}</div>
                    <div className="text-gray-600 mt-1">Exceptional at converting low engagement into high sales</div>
                  </div>
                  <div className="bg-white rounded p-2.5 border border-gray-200">
                    <div className="font-semibold text-blue-800 mb-1 flex items-center">
                      <Trophy className="w-3 h-3 mr-1" />
                      High Converters
                    </div>
                    <div className="text-gray-700 font-medium">Efficiency ≥{settings.conversionEfficiency.highConverterThreshold}</div>
                    <div className="text-gray-600 mt-1">Strong conversion skills, consistent performers</div>
                  </div>
                  <div className="bg-white rounded p-2.5 border border-gray-200">
                    <div className="font-semibold text-yellow-800 mb-1">Average Converters</div>
                    <div className="text-gray-700 font-medium">Efficiency ≥{settings.conversionEfficiency.averageConverterThreshold}</div>
                    <div className="text-gray-600 mt-1">Standard conversion rates, room to grow</div>
                  </div>
                  <div className="bg-white rounded p-2.5 border border-gray-200">
                    <div className="font-semibold text-red-800 mb-1">Low Converters</div>
                    <div className="text-gray-700 font-medium">Efficiency &lt;{settings.conversionEfficiency.averageConverterThreshold}</div>
                    <div className="text-gray-600 mt-1">Need training or targeting support</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white rounded p-2 text-xs border border-gray-200">
                    <div className="font-semibold text-green-900 mb-1">📈 High Efficiency Example</div>
                    <div className="text-gray-700">$5,000 sales ÷ 1,000 engagement = <strong>5.0 efficiency</strong></div>
                    <div className="text-gray-600 mt-1">Quality audience, targeted content, strong CTAs</div>
                  </div>
                  <div className="bg-white rounded p-2 text-xs border border-gray-200">
                    <div className="font-semibold text-green-900 mb-1">📉 Low Efficiency Example</div>
                    <div className="text-gray-700">$500 sales ÷ 10,000 engagement = <strong>0.05 efficiency</strong></div>
                    <div className="text-gray-600 mt-1">Viral content but weak conversion strategy</div>
                  </div>
                </div>

                <div className="flex items-start text-xs text-green-700">
                  <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Use Case:</strong> Learn from <em>Super Converters</em> to improve overall program effectiveness. 
                    Focus training on <em>Low Converters</em>. Quality over quantity - these metrics help identify 
                    advocates who drive revenue without necessarily having the highest engagement.
                  </div>
                </div>
              </div>

            <Card>
              <div className="flex justify-between items-center px-6 pt-6 pb-0">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Conversion Efficiency Segments</h3>
                  <p className="text-sm text-gray-600 mt-1">How effectively advocates convert engagement into sales</p>
                </div>
                {efficiencySegments && efficiencySegments.length > 0 && (
                  <button 
                    onClick={exportEfficiencySegmentsToCSV}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>
              {!efficiencySegments && <Loading text="Loading efficiency segments..." />}
              {efficiencySegments && efficiencySegments.length === 0 && (
                <div className="p-12 text-center">
                  <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Efficiency Data Yet
                  </h3>
                  <p className="text-gray-600">
                    Conversion efficiency metrics will appear once you have imported advocate data.
                  </p>
                </div>
              )}
              {efficiencySegments && efficiencySegments.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Converter Segment
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Accounts
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Efficiency
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Sales
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Engagement
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Program Conv. Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {efficiencySegments.map((segment) => (
                        <tr key={segment.converter_segment} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${
                              segment.converter_segment === 'Super Converters' ? 'bg-green-100 text-green-800 border border-green-300' :
                              segment.converter_segment === 'High Converters' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              segment.converter_segment === 'Average Converters' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                              'bg-red-100 text-red-800 border border-red-300'
                            }`}>
                              {segment.converter_segment}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-semibold">
                            {segment.account_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-600">
                            {segment.avg_efficiency?.toFixed(4) || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                            {formatCurrency(segment.avg_sales || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {segment.avg_engagement?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {segment.avg_program_conversion_rate?.toFixed(1) || 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            </>
          )}
        </div>
      </main>
    </>
  );
}

