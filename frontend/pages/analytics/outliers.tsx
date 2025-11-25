import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import useSWR from 'swr';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { AlertTriangle, TrendingUp, TrendingDown, Zap, AlertCircle, Info, Settings, Search, Filter, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { apiClient, parseSales } from '@/lib/api';
import { useOutlierSettings } from '@/hooks/useOutlierSettings';
import { useCurrency } from '@/contexts/CurrencyContext';

const DEFAULT_PAGE_SIZE = 25;

export default function OutliersPage() {
  const [outlierType, setOutlierType] = useState<'sales' | 'engagement' | 'efficient'>('sales');
  const { settings, isLoaded } = useOutlierSettings();
  const { formatCurrency } = useCurrency();

  // Pagination state for each tab
  const [salesPage, setSalesPage] = useState(1);
  const [salesItemsPerPage, setSalesItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [engagementPage, setEngagementPage] = useState(1);
  const [engagementItemsPerPage, setEngagementItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [efficientPage, setEfficientPage] = useState(1);
  const [efficientItemsPerPage, setEfficientItemsPerPage] = useState(DEFAULT_PAGE_SIZE);

  // Advanced filters visibility
  const [showSalesFilters, setShowSalesFilters] = useState(false);
  const [showEngagementFilters, setShowEngagementFilters] = useState(false);

  // Filter state for each tab
  const [salesFilters, setSalesFilters] = useState({
    search: '',
    type: '',
    brand: '',
  });
  const [engagementFilters, setEngagementFilters] = useState({
    search: '',
    category: '',
    platform: '',
    brand: '',
  });
  const [efficientFilters, setEfficientFilters] = useState({
    search: '',
  });

  // Fetch maximum data to ensure all records are available
  // Note: Backend limits are 100 for sales, 200 for engagement, 100 for efficient
  const { data: salesOutliers, error: salesError } = useSWR(
    outlierType === 'sales' && isLoaded ? ['sales-outliers', settings.salesOutliers] : null,
    () => apiClient.getSalesOutliers(
      100, // Maximum allowed by backend
      settings.salesOutliers.minZScore
    ),
    { refreshInterval: 60000 }
  );

  const { data: engagementAnomalies, error: engagementError } = useSWR(
    outlierType === 'engagement' && isLoaded ? ['engagement-anomalies', settings.engagementAnomalies] : null,
    () => apiClient.getEngagementAnomalies(
      200, // Maximum allowed by backend
      settings.engagementAnomalies.minZScore
    ),
    { refreshInterval: 60000 }
  );

  const { data: efficientConverters, error: convertersError } = useSWR(
    outlierType === 'efficient' && isLoaded ? ['efficient-converters', settings.efficientConverters] : null,
    () => apiClient.getEfficientConverters(
      100, // Maximum allowed by backend
      settings.efficientConverters.minSales,
      settings.efficientConverters.maxEngagement,
      settings.efficientConverters.minEfficiency
    ),
    { refreshInterval: 60000 }
  );

  const isLoading = 
    (outlierType === 'sales' && !salesOutliers) || 
    (outlierType === 'engagement' && !engagementAnomalies) ||
    (outlierType === 'efficient' && !efficientConverters);
  const hasError = salesError || engagementError || convertersError;

  // Filter and paginate Sales Outliers
  const filteredSalesOutliers = useMemo(() => {
    if (!salesOutliers) return [];
    
    return salesOutliers.filter((outlier) => {
      const matchesSearch = !salesFilters.search || 
        (outlier.advocate_user_name || '').toLowerCase().includes(salesFilters.search.toLowerCase()) ||
        (outlier.account_email || '').toLowerCase().includes(salesFilters.search.toLowerCase()) ||
        (outlier.brand || '').toLowerCase().includes(salesFilters.search.toLowerCase());
      const matchesType = !salesFilters.type || outlier.outlier_type === salesFilters.type;
      const matchesBrand = !salesFilters.brand || outlier.brand === salesFilters.brand;
      
      return matchesSearch && matchesType && matchesBrand;
    });
  }, [salesOutliers, salesFilters]);

  const salesOffset = (salesPage - 1) * salesItemsPerPage;
  const paginatedSalesOutliers = useMemo(() => {
    return filteredSalesOutliers.slice(salesOffset, salesOffset + salesItemsPerPage);
  }, [filteredSalesOutliers, salesOffset, salesItemsPerPage]);

  // Get unique brands and types for filters
  const salesBrands = useMemo(() => {
    if (!salesOutliers) return [];
    return Array.from(new Set(salesOutliers.map(o => o.brand).filter(Boolean))).sort();
  }, [salesOutliers]);

  const salesTypes = useMemo(() => {
    if (!salesOutliers) return [];
    return Array.from(new Set(salesOutliers.map(o => o.outlier_type).filter(Boolean))).sort();
  }, [salesOutliers]);

  // Filter and paginate Engagement Anomalies
  const filteredEngagementAnomalies = useMemo(() => {
    if (!engagementAnomalies) return [];
    
    return engagementAnomalies.filter((anomaly) => {
      const matchesSearch = !engagementFilters.search || 
        (anomaly.advocate_user_name || '').toLowerCase().includes(engagementFilters.search.toLowerCase()) ||
        (anomaly.account_email || '').toLowerCase().includes(engagementFilters.search.toLowerCase()) ||
        (anomaly.platform || '').toLowerCase().includes(engagementFilters.search.toLowerCase()) ||
        (anomaly.brand || '').toLowerCase().includes(engagementFilters.search.toLowerCase());
      const matchesCategory = !engagementFilters.category || anomaly.engagement_category === engagementFilters.category;
      const matchesPlatform = !engagementFilters.platform || anomaly.platform === engagementFilters.platform;
      const matchesBrand = !engagementFilters.brand || anomaly.brand === engagementFilters.brand;
      
      return matchesSearch && matchesCategory && matchesPlatform && matchesBrand;
    });
  }, [engagementAnomalies, engagementFilters]);

  const engagementOffset = (engagementPage - 1) * engagementItemsPerPage;
  const paginatedEngagementAnomalies = useMemo(() => {
    return filteredEngagementAnomalies.slice(engagementOffset, engagementOffset + engagementItemsPerPage);
  }, [filteredEngagementAnomalies, engagementOffset, engagementItemsPerPage]);

  // Get unique values for engagement filters
  const engagementCategories = useMemo(() => {
    if (!engagementAnomalies) return [];
    return Array.from(new Set(engagementAnomalies.map(a => a.engagement_category).filter(Boolean))).sort();
  }, [engagementAnomalies]);

  const engagementPlatforms = useMemo(() => {
    if (!engagementAnomalies) return [];
    return Array.from(new Set(engagementAnomalies.map(a => a.platform).filter(Boolean))).sort();
  }, [engagementAnomalies]);

  const engagementBrands = useMemo(() => {
    if (!engagementAnomalies) return [];
    return Array.from(new Set(engagementAnomalies.map(a => a.brand).filter(Boolean))).sort();
  }, [engagementAnomalies]);

  // Filter and paginate Efficient Converters
  const filteredEfficientConverters = useMemo(() => {
    if (!efficientConverters) return [];
    
    return efficientConverters.filter((converter) => {
      const matchesSearch = !efficientFilters.search || 
        (converter.user_names || '').toLowerCase().includes(efficientFilters.search.toLowerCase()) ||
        (converter.email || '').toLowerCase().includes(efficientFilters.search.toLowerCase());
      
      return matchesSearch;
    });
  }, [efficientConverters, efficientFilters]);

  const efficientOffset = (efficientPage - 1) * efficientItemsPerPage;
  const paginatedEfficientConverters = useMemo(() => {
    return filteredEfficientConverters.slice(efficientOffset, efficientOffset + efficientItemsPerPage);
  }, [filteredEfficientConverters, efficientOffset, efficientItemsPerPage]);

  // Calculate totals and pages
  const salesTotalPages = Math.ceil(filteredSalesOutliers.length / salesItemsPerPage);
  const engagementTotalPages = Math.ceil(filteredEngagementAnomalies.length / engagementItemsPerPage);
  const efficientTotalPages = Math.ceil(filteredEfficientConverters.length / efficientItemsPerPage);

  // Check if filters are active
  const salesHasActiveFilters = salesFilters.search || salesFilters.type || salesFilters.brand;
  const engagementHasActiveFilters = engagementFilters.search || engagementFilters.category || engagementFilters.platform || engagementFilters.brand;

  // Reset pagination when filters change
  React.useEffect(() => {
    setSalesPage(1);
  }, [salesFilters, salesItemsPerPage]);

  React.useEffect(() => {
    setEngagementPage(1);
  }, [engagementFilters, engagementItemsPerPage]);

  React.useEffect(() => {
    setEfficientPage(1);
  }, [efficientFilters, efficientItemsPerPage]);

  // Reset pagination when switching tabs
  React.useEffect(() => {
    setSalesPage(1);
    setEngagementPage(1);
    setEfficientPage(1);
  }, [outlierType]);

  const getOutlierBadge = (type: string) => {
    const badges: Record<string, { color: string; icon: React.ElementType }> = {
      'High Outlier': { color: 'bg-red-100 text-red-800', icon: TrendingUp },
      'Low Outlier': { color: 'bg-orange-100 text-orange-800', icon: TrendingDown },
      'Viral': { color: 'bg-purple-100 text-purple-800', icon: Zap },
      'High Performer': { color: 'bg-green-100 text-green-800', icon: TrendingUp },
      'Underperformer': { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    };
    
    const badge = badges[type] || { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle };
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {type}
      </span>
    );
  };

  // Export functions
  const exportSalesOutliersToCSV = () => {
    if (!filteredSalesOutliers || filteredSalesOutliers.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Advocate', 'Email', 'Brand', 'Amount', 'Outlier Type', 'Z-Score', 'Avg Sale'];
    const rows = filteredSalesOutliers.map((outlier) => [
      new Date(outlier.attributed_at).toLocaleDateString(),
      outlier.advocate_user_name || '',
      outlier.account_email || '',
      outlier.brand || '',
      outlier.amount || 0,
      outlier.outlier_type || '',
      outlier.z_score ? outlier.z_score.toFixed(2) : '',
      outlier.avg_sale ? outlier.avg_sale.toFixed(2) : ''
    ]);

    downloadCSV(headers, rows, `sales_outliers_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportEngagementAnomaliesToCSV = () => {
    if (!filteredEngagementAnomalies || filteredEngagementAnomalies.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Advocate', 'Email', 'Platform', 'Brand', 'Engagement Category', 'Engagement Score', 'Avg Engagement', 'Z-Score'];
    const rows = filteredEngagementAnomalies.map((anomaly) => [
      anomaly.advocate_user_name || '',
      anomaly.account_email || '',
      anomaly.platform || '',
      anomaly.brand || '',
      anomaly.engagement_category || '',
      anomaly.engagement_score || 0,
      anomaly.avg_engagement ? anomaly.avg_engagement.toFixed(2) : '',
      anomaly.z_score ? anomaly.z_score.toFixed(2) : ''
    ]);

    downloadCSV(headers, rows, `engagement_anomalies_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportEfficientConvertersToCSV = () => {
    if (!filteredEfficientConverters || filteredEfficientConverters.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Email', 'User Names', 'Engagement Score', 'Sales', 'Sales Efficiency', 'Tasks', 'Conversion Rate'];
    const rows = filteredEfficientConverters.map((converter) => [
      converter.email || '',
      converter.user_names || '',
      converter.total_engagement_score || 0,
      converter.total_sales || 0,
      converter.sales_efficiency ? converter.sales_efficiency.toFixed(2) : '',
      converter.total_tasks || 0,
      converter.program_conversion_rate ? (converter.program_conversion_rate * 100).toFixed(1) + '%' : ''
    ]);

    downloadCSV(headers, rows, `efficient_converters_${new Date().toISOString().split('T')[0]}.csv`);
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
        <title>Pattern Detection - Analytics</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Pattern Detection & Outliers"
          subtitle="Identify unusual patterns and anomalies using statistical analysis"
          backLink="/analytics"
          backLabel="Back to Analytics"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setOutlierType('sales')}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      outlierType === 'sales'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Sales Outliers
                </button>
                <button
                  onClick={() => setOutlierType('engagement')}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      outlierType === 'engagement'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <TrendingDown className="w-5 h-5 mr-2" />
                  Engagement Anomalies
                </button>
                <button
                  onClick={() => setOutlierType('efficient')}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      outlierType === 'efficient'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Efficient Converters
                </button>
              </nav>
            </div>
          </div>

          {/* Info Boxes - Below tabs, above Card */}
          {outlierType === 'sales' && !isLoading && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start flex-1">
                  <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <h4 className="text-sm font-semibold text-blue-900">
                    How Sales Outliers Work
                  </h4>
                </div>
                <Link
                  href="/analytics/settings?tab=outliers"
                  className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex-shrink-0 ml-4"
                >
                  <Settings className="w-3 h-3 mr-1.5" />
                  Configure
                </Link>
              </div>
              <div className="ml-8">
                <div>
                  <p className="text-sm text-blue-800 mb-2">
                    This analysis uses statistical methods to identify unusual sales transactions. 
                    A <strong>Z-score</strong> measures how many standard deviations a sale is from the average.
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 ml-4">
                    <li>• <strong>High Outliers</strong> (red): Exceptionally large sales - may indicate top performers or require verification</li>
                    <li>• <strong>Low Outliers</strong> (orange): Unusually small sales - may need investigation</li>
                    <li>• <strong>Z-score ≥ {settings.salesOutliers.minZScore}</strong>: Sale is {settings.salesOutliers.minZScore}+ standard deviations from the mean</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-2">
                    💡 Use this to identify exceptional performance, potential data errors, or investigate suspicious transactions.
                    Showing up to {settings.salesOutliers.limit} results.
                  </p>
                </div>
              </div>
            </div>
          )}

          {outlierType === 'engagement' && !isLoading && (
            <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start flex-1">
                  <Info className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                  <h4 className="text-sm font-semibold text-purple-900">
                    How Engagement Anomalies Work
                  </h4>
                </div>
                <Link
                  href="/analytics/settings?tab=outliers"
                  className="flex items-center px-3 py-1.5 text-xs font-medium text-purple-700 bg-white border border-purple-300 rounded-md hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex-shrink-0 ml-4"
                >
                  <Settings className="w-3 h-3 mr-1.5" />
                  Configure
                </Link>
              </div>
              <div className="ml-8">
                <div>
                  <p className="text-sm text-purple-800 mb-2">
                    This analysis identifies posts with unusual engagement patterns using statistical variance detection.
                    Detection threshold: Z-score ≥ {settings.engagementAnomalies.minZScore}
                  </p>
                  <ul className="text-sm text-purple-800 space-y-1 ml-4">
                    <li>• <strong>Viral</strong> (purple): 3+ standard deviations above average - exceptional content worth replicating</li>
                    <li>• <strong>High Performer</strong> (green): 2+ standard deviations above average - strong content</li>
                    <li>• <strong>Underperformer</strong> (yellow): 2+ standard deviations below average - needs improvement</li>
                  </ul>
                  <p className="text-xs text-purple-700 mt-2">
                    💡 Use this to identify what content resonates, find viral posts to analyze, and spot underperforming campaigns early.
                    Showing up to {settings.engagementAnomalies.limit} results.
                  </p>
                </div>
              </div>
            </div>
          )}

          {outlierType === 'efficient' && !isLoading && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start flex-1">
                  <Info className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <h4 className="text-sm font-semibold text-green-900">
                    How Efficient Converters Work
                  </h4>
                </div>
                <Link
                  href="/analytics/settings?tab=outliers"
                  className="flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex-shrink-0 ml-4"
                >
                  <Settings className="w-3 h-3 mr-1.5" />
                  Configure
                </Link>
              </div>
              <div className="ml-8">
                <div>
                  <p className="text-sm text-green-800 mb-2">
                    This analysis identifies accounts with the <strong>&quot;Quality over Quantity&quot;</strong> pattern - 
                    they generate high sales despite lower engagement.
                  </p>
                  <ul className="text-sm text-green-800 space-y-1 ml-4">
                    <li>• <strong>Sales Efficiency</strong>: Ratio of total sales to engagement score (higher = more efficient)</li>
                    <li>• <strong>Current Criteria</strong>: Sales &gt; ${settings.efficientConverters.minSales.toLocaleString()} with engagement &lt; {settings.efficientConverters.maxEngagement.toLocaleString()} and efficiency &gt; {settings.efficientConverters.minEfficiency}</li>
                    <li>• <strong>Why it matters</strong>: These advocates have highly engaged, purchase-ready audiences</li>
                  </ul>
                  <p className="text-xs text-green-700 mt-2">
                    💡 Use this to identify advocates with high-intent audiences, study their approach, and recognize quality over quantity.
                    Showing up to {settings.efficientConverters.limit} results.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Card>
            <div className="flex justify-between items-center px-6 pt-6 pb-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {outlierType === 'sales' 
                    ? 'Sales Outliers' 
                    : outlierType === 'engagement'
                    ? 'Engagement Anomalies'
                    : 'Efficient Converters'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {outlierType === 'sales'
                    ? 'Transactions with statistically unusual values (Z-score ≥ 2.0)'
                    : outlierType === 'engagement'
                    ? 'Posts with anomalous engagement patterns (Z-score ≥ 1.5)'
                    : 'Accounts with high sales despite low engagement (quality over quantity)'}
                </p>
              </div>
              {/* Export Button */}
              {outlierType === 'sales' && filteredSalesOutliers && filteredSalesOutliers.length > 0 && (
                <button 
                  onClick={exportSalesOutliersToCSV}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              )}
              {outlierType === 'engagement' && filteredEngagementAnomalies && filteredEngagementAnomalies.length > 0 && (
                <button 
                  onClick={exportEngagementAnomaliesToCSV}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              )}
              {outlierType === 'efficient' && filteredEfficientConverters && filteredEfficientConverters.length > 0 && (
                <button 
                  onClick={exportEfficientConvertersToCSV}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            {hasError && (
              <div className="p-6 text-center text-red-600">
                Error loading data. Please try again.
              </div>
            )}

            {isLoading && <Loading text="Analyzing patterns..." />}

            {/* Sales Outliers */}
            {outlierType === 'sales' && salesOutliers && (
              <>
                {/* Filters */}
                <div className="px-6 pb-6 space-y-4 border-b border-gray-200">
                  {/* Top Row: Search */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by account, email, or brand..."
                        value={salesFilters.search}
                        onChange={(e) => setSalesFilters({ ...salesFilters, search: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Advanced Filters */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setShowSalesFilters(!showSalesFilters)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700">Advanced Filters</span>
                        {salesHasActiveFilters && (
                          <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                            {[
                              salesFilters.search,
                              salesFilters.type,
                              salesFilters.brand
                            ].filter(Boolean).length}
                          </span>
                        )}
                      </div>
                      {showSalesFilters ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    {showSalesFilters && (
                      <div className="p-4 space-y-4 bg-white rounded-b-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Type
                            </label>
                            <select
                              value={salesFilters.type}
                              onChange={(e) => setSalesFilters({ ...salesFilters, type: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">All Types</option>
                              {salesTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Brand
                            </label>
                            <select
                              value={salesFilters.brand}
                              onChange={(e) => setSalesFilters({ ...salesFilters, brand: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">All Brands</option>
                              {salesBrands.map((brand) => (
                                <option key={brand} value={brand}>
                                  {brand}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {salesHasActiveFilters && (
                          <button
                            onClick={() => setSalesFilters({ search: '', type: '', brand: '' })}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  {filteredSalesOutliers.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        {salesOutliers.length === 0 
                          ? 'No sales outliers detected' 
                          : 'No results match your filters'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Account
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Brand
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Avg Sale
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Z-Score
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedSalesOutliers.map((outlier) => (
                            <tr key={outlier.attribution_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 max-w-xs">
                                <div className="text-sm font-medium text-gray-900 truncate" title={outlier.advocate_user_name || 'Anonymous'}>
                                  {outlier.advocate_user_name || 'Anonymous'}
                                </div>
                                <div className="text-sm text-gray-500 truncate" title={outlier.account_email}>
                                  {outlier.account_email}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {outlier.brand}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {getOutlierBadge(outlier.outlier_type)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                                {formatCurrency(typeof outlier.amount === 'string' ? parseFloat(outlier.amount) : outlier.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                {formatCurrency(outlier.avg_sale || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                                {outlier.z_score?.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                {new Date(outlier.attributed_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>

                {/* Pagination */}
                {salesTotalPages > 1 && (
                  <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setSalesPage(Math.max(1, salesPage - 1))}
                        disabled={salesPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setSalesPage(Math.min(salesTotalPages, salesPage + 1))}
                        disabled={salesPage === salesTotalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">{salesOffset + 1}</span>
                          {' '}-{' '}
                          <span className="font-medium">
                            {Math.min(salesOffset + salesItemsPerPage, filteredSalesOutliers.length)}
                          </span>
                          {' '}of{' '}
                          <span className="font-medium">{filteredSalesOutliers.length}</span>
                          {' '}results
                        </p>
                        <label className="text-sm text-gray-700">
                          Show:
                          <select
                            value={salesItemsPerPage}
                            onChange={(e) => {
                              setSalesItemsPerPage(Number(e.target.value));
                              setSalesPage(1);
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
                            onClick={() => setSalesPage(Math.max(1, salesPage - 1))}
                            disabled={salesPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          
                          {/* Page numbers */}
                          {Array.from({ length: Math.min(5, salesTotalPages) }, (_, i) => {
                            let pageNum;
                            if (salesTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (salesPage <= 3) {
                              pageNum = i + 1;
                            } else if (salesPage >= salesTotalPages - 2) {
                              pageNum = salesTotalPages - 4 + i;
                            } else {
                              pageNum = salesPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setSalesPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  salesPage === pageNum
                                    ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          <button
                            onClick={() => setSalesPage(Math.min(salesTotalPages, salesPage + 1))}
                            disabled={salesPage === salesTotalPages}
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
              </>
            )}

            {/* Engagement Anomalies */}
            {outlierType === 'engagement' && engagementAnomalies && (
              <>
                {/* Filters */}
                <div className="px-6 pb-6 space-y-4 border-b border-gray-200">
                  {/* Top Row: Search */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by account, email, platform, or brand..."
                        value={engagementFilters.search}
                        onChange={(e) => setEngagementFilters({ ...engagementFilters, search: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Advanced Filters */}
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setShowEngagementFilters(!showEngagementFilters)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700">Advanced Filters</span>
                        {engagementHasActiveFilters && (
                          <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                            {[
                              engagementFilters.search,
                              engagementFilters.category,
                              engagementFilters.platform,
                              engagementFilters.brand
                            ].filter(Boolean).length}
                          </span>
                        )}
                      </div>
                      {showEngagementFilters ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    {showEngagementFilters && (
                      <div className="p-4 space-y-4 bg-white rounded-b-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Category
                            </label>
                            <select
                              value={engagementFilters.category}
                              onChange={(e) => setEngagementFilters({ ...engagementFilters, category: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">All Categories</option>
                              {engagementCategories.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Platform
                            </label>
                            <select
                              value={engagementFilters.platform}
                              onChange={(e) => setEngagementFilters({ ...engagementFilters, platform: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">All Platforms</option>
                              {engagementPlatforms.map((platform) => (
                                <option key={platform} value={platform}>
                                  {platform}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Brand
                            </label>
                            <select
                              value={engagementFilters.brand}
                              onChange={(e) => setEngagementFilters({ ...engagementFilters, brand: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">All Brands</option>
                              {engagementBrands.map((brand) => (
                                <option key={brand} value={brand}>
                                  {brand}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {engagementHasActiveFilters && (
                          <button
                            onClick={() => setEngagementFilters({ search: '', category: '', platform: '', brand: '' })}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  {filteredEngagementAnomalies.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        {engagementAnomalies.length === 0 
                          ? 'No engagement anomalies detected' 
                          : 'No results match your filters'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Account
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Platform / Brand
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Engagement
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Avg
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Z-Score
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Likes
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Comments
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedEngagementAnomalies.map((anomaly) => (
                            <tr key={anomaly.analytics_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 max-w-xs">
                                <div className="text-sm font-medium text-gray-900 truncate" title={anomaly.advocate_user_name || 'Anonymous'}>
                                  {anomaly.advocate_user_name || 'Anonymous'}
                                </div>
                                <div className="text-sm text-gray-500 truncate" title={anomaly.account_email}>
                                  {anomaly.account_email}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{anomaly.platform}</div>
                                <div className="text-sm text-gray-500">{anomaly.brand}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {getOutlierBadge(anomaly.engagement_category)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-primary-600">
                                {anomaly.engagement_score.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                {anomaly.avg_engagement?.toFixed(0) || '0'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                                {anomaly.z_score?.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                {anomaly.likes?.toLocaleString() || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                {anomaly.comments?.toLocaleString() || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>

                {/* Pagination */}
                {engagementTotalPages > 1 && (
                  <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setEngagementPage(Math.max(1, engagementPage - 1))}
                        disabled={engagementPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setEngagementPage(Math.min(engagementTotalPages, engagementPage + 1))}
                        disabled={engagementPage === engagementTotalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">{engagementOffset + 1}</span>
                          {' '}-{' '}
                          <span className="font-medium">
                            {Math.min(engagementOffset + engagementItemsPerPage, filteredEngagementAnomalies.length)}
                          </span>
                          {' '}of{' '}
                          <span className="font-medium">{filteredEngagementAnomalies.length}</span>
                          {' '}results
                        </p>
                        <label className="text-sm text-gray-700">
                          Show:
                          <select
                            value={engagementItemsPerPage}
                            onChange={(e) => {
                              setEngagementItemsPerPage(Number(e.target.value));
                              setEngagementPage(1);
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
                            onClick={() => setEngagementPage(Math.max(1, engagementPage - 1))}
                            disabled={engagementPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          
                          {/* Page numbers */}
                          {Array.from({ length: Math.min(5, engagementTotalPages) }, (_, i) => {
                            let pageNum;
                            if (engagementTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (engagementPage <= 3) {
                              pageNum = i + 1;
                            } else if (engagementPage >= engagementTotalPages - 2) {
                              pageNum = engagementTotalPages - 4 + i;
                            } else {
                              pageNum = engagementPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setEngagementPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  engagementPage === pageNum
                                    ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          <button
                            onClick={() => setEngagementPage(Math.min(engagementTotalPages, engagementPage + 1))}
                            disabled={engagementPage === engagementTotalPages}
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
              </>
            )}

            {/* Efficient Converters */}
            {outlierType === 'efficient' && efficientConverters && (
              <>
                {/* Filters */}
                <div className="px-6 pb-6 space-y-4 border-b border-gray-200">
                  {/* Top Row: Search */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by account or email..."
                        value={efficientFilters.search}
                        onChange={(e) => setEfficientFilters({ ...efficientFilters, search: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  {filteredEfficientConverters.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        {efficientConverters.length === 0 
                          ? 'No efficient converter patterns detected' 
                          : 'No results match your filters'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Account
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Sales
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Engagement
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Efficiency
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Programs
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Conv. Rate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pattern
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedEfficientConverters.map((converter) => (
                            <tr key={converter.account_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 max-w-xs">
                                <div className="text-sm font-medium text-gray-900 truncate" title={converter.user_names || 'Anonymous'}>
                                  {converter.user_names || 'Anonymous'}
                                </div>
                                <div className="text-sm text-gray-500 truncate" title={converter.email}>
                                  {converter.email}
                                </div>
                                {converter.total_users > 1 && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    {converter.total_users} users
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                                {formatCurrency(parseSales(converter.total_sales), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                {converter.total_engagement_score?.toLocaleString() || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-primary-600">
                                {converter.sales_efficiency?.toFixed(4)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                {converter.programs_with_sales} / {converter.total_tasks}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                {converter.program_conversion_rate?.toFixed(1)}%
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  <Zap className="w-3 h-3 mr-1" />
                                  Quality over Quantity
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>

                {/* Pagination */}
                {efficientTotalPages > 1 && (
                  <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setEfficientPage(Math.max(1, efficientPage - 1))}
                        disabled={efficientPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setEfficientPage(Math.min(efficientTotalPages, efficientPage + 1))}
                        disabled={efficientPage === efficientTotalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">{efficientOffset + 1}</span>
                          {' '}-{' '}
                          <span className="font-medium">
                            {Math.min(efficientOffset + efficientItemsPerPage, filteredEfficientConverters.length)}
                          </span>
                          {' '}of{' '}
                          <span className="font-medium">{filteredEfficientConverters.length}</span>
                          {' '}results
                        </p>
                        <label className="text-sm text-gray-700">
                          Show:
                          <select
                            value={efficientItemsPerPage}
                            onChange={(e) => {
                              setEfficientItemsPerPage(Number(e.target.value));
                              setEfficientPage(1);
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
                            onClick={() => setEfficientPage(Math.max(1, efficientPage - 1))}
                            disabled={efficientPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          
                          {/* Page numbers */}
                          {Array.from({ length: Math.min(5, efficientTotalPages) }, (_, i) => {
                            let pageNum;
                            if (efficientTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (efficientPage <= 3) {
                              pageNum = i + 1;
                            } else if (efficientPage >= efficientTotalPages - 2) {
                              pageNum = efficientTotalPages - 4 + i;
                            } else {
                              pageNum = efficientPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setEfficientPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  efficientPage === pageNum
                                    ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          <button
                            onClick={() => setEfficientPage(Math.min(efficientTotalPages, efficientPage + 1))}
                            disabled={efficientPage === efficientTotalPages}
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
              </>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

