import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { apiClient, parseSales, AccountEngagement } from '@/lib/api';
import { Card, CardHeader } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Search, Filter, Download, ChevronLeft, ChevronRight, Users, ChevronDown, ChevronUp, X, ArrowUpDown } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';
import { useCurrency } from '@/contexts/CurrencyContext';
import { TierType } from '@/components/ui/PerformanceBadge';

const DEFAULT_PAGE_SIZE = 25;

type ActivityLevel = 'Highly Active' | 'Active' | 'Moderate' | 'Low' | 'Inactive' | 'all';

export default function AdvocatesPage() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterMetric, setFilterMetric] = useState<'engagement' | 'sales'>('engagement');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Filter states
  const [filterTier, setFilterTier] = useState<TierType | 'all'>('all');
  const [filterMinEngagement, setFilterMinEngagement] = useState<string>('');
  const [filterMaxEngagement, setFilterMaxEngagement] = useState<string>('');
  const [filterMinSales, setFilterMinSales] = useState<string>('');
  const [filterMaxSales, setFilterMaxSales] = useState<string>('');
  const [filterMinPrograms, setFilterMinPrograms] = useState<string>('');
  const [filterMaxPrograms, setFilterMaxPrograms] = useState<string>('');
  const [filterMinConversionRate, setFilterMinConversionRate] = useState<string>('');
  const [filterMaxConversionRate, setFilterMaxConversionRate] = useState<string>('');
  const [filterActivityLevel, setFilterActivityLevel] = useState<ActivityLevel>('all');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTier, filterMinEngagement, filterMaxEngagement, filterMinSales, filterMaxSales, 
      filterMinPrograms, filterMaxPrograms, filterMinConversionRate, filterMaxConversionRate, filterActivityLevel, itemsPerPage]);

  const offset = (currentPage - 1) * itemsPerPage;

  // Fetch total count first
  const { data: countData } = useSWR(
    ['top-accounts-count', debouncedSearch],
    () => apiClient.getTopAccountsCount(debouncedSearch || undefined),
    { refreshInterval: 30000 }
  );

  const totalAdvocatesCount = countData?.total || 0;

  // Fetch all advocates by making multiple requests if needed (API limit is 1000 per request)
  const { data: advocates, error } = useSWR(
    ['top-accounts-all', filterMetric, totalAdvocatesCount, debouncedSearch],
    async () => {
      if (!totalAdvocatesCount) return [];
      
      const allAdvocates: AccountEngagement[] = [];
      const BATCH_SIZE = 1000; // API maximum limit
      const totalBatches = Math.ceil(totalAdvocatesCount / BATCH_SIZE);
      
      // Fetch all batches in parallel
      const batchPromises = Array.from({ length: totalBatches }, (_, i) => {
        const batchOffset = i * BATCH_SIZE;
        return apiClient.getTopAccounts(filterMetric, BATCH_SIZE, batchOffset, debouncedSearch || undefined);
      });
      
      const batches = await Promise.all(batchPromises);
      batches.forEach(batch => {
        allAdvocates.push(...batch);
      });
      
      return allAdvocates;
    },
    { 
      refreshInterval: 30000,
      revalidateOnFocus: false
    }
  );

  // Helper functions
  const getAdvocateTier = (engagement: number, sales: number | string | null): TierType => {
    const salesNum = parseSales(sales);
    if (engagement >= 50000 && salesNum >= 5000) return 'platinum';
    if (engagement >= 20000 && salesNum >= 2000) return 'gold';
    if (engagement >= 5000 && salesNum >= 500) return 'silver';
    if (engagement >= 1000 || salesNum >= 100) return 'bronze';
    return 'starter';
  };

  const getActivityLevel = (programs: number): ActivityLevel => {
    if (programs >= 10) return 'Highly Active';
    if (programs >= 5) return 'Active';
    if (programs >= 2) return 'Moderate';
    if (programs >= 1) return 'Low';
    return 'Inactive';
  };

  // Client-side filtering
  const filteredAdvocates = useMemo(() => {
    if (!advocates) return [];

    return advocates.filter((advocate: AccountEngagement) => {
      const engagement = advocate.total_engagement_score || 0;
      const sales = parseSales(advocate.total_sales);
      const programs = advocate.total_programs || 0;
      const conversionRate = advocate.program_conversion_rate || 0;
      const tier = getAdvocateTier(engagement, advocate.total_sales);
      const activityLevel = getActivityLevel(programs);

      // Tier filter
      if (filterTier !== 'all' && tier !== filterTier) return false;

      // Engagement range
      if (filterMinEngagement && engagement < parseFloat(filterMinEngagement)) return false;
      if (filterMaxEngagement && engagement > parseFloat(filterMaxEngagement)) return false;

      // Sales range
      if (filterMinSales && sales < parseFloat(filterMinSales)) return false;
      if (filterMaxSales && sales > parseFloat(filterMaxSales)) return false;

      // Programs range
      if (filterMinPrograms && programs < parseFloat(filterMinPrograms)) return false;
      if (filterMaxPrograms && programs > parseFloat(filterMaxPrograms)) return false;

      // Conversion rate range
      if (filterMinConversionRate && conversionRate < parseFloat(filterMinConversionRate)) return false;
      if (filterMaxConversionRate && conversionRate > parseFloat(filterMaxConversionRate)) return false;

      // Activity level filter
      if (filterActivityLevel !== 'all' && activityLevel !== filterActivityLevel) return false;

      return true;
    });
  }, [advocates, filterTier, filterMinEngagement, filterMaxEngagement, filterMinSales, filterMaxSales,
      filterMinPrograms, filterMaxPrograms, filterMinConversionRate, filterMaxConversionRate, filterActivityLevel]);

  // Pagination for filtered results
  const paginatedAdvocates = useMemo(() => {
    const start = offset;
    const end = start + itemsPerPage;
    return filteredAdvocates.slice(start, end);
  }, [filteredAdvocates, offset, itemsPerPage]);

  const totalCount = filteredAdvocates.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Check if any filters are active
  const hasActiveFilters = filterTier !== 'all' || 
    filterMinEngagement || filterMaxEngagement || 
    filterMinSales || filterMaxSales || 
    filterMinPrograms || filterMaxPrograms || 
    filterMinConversionRate || filterMaxConversionRate || 
    filterActivityLevel !== 'all';

  // Clear all filters
  const clearFilters = () => {
    setFilterTier('all');
    setFilterMinEngagement('');
    setFilterMaxEngagement('');
    setFilterMinSales('');
    setFilterMaxSales('');
    setFilterMinPrograms('');
    setFilterMaxPrograms('');
    setFilterMinConversionRate('');
    setFilterMaxConversionRate('');
    setFilterActivityLevel('all');
  };

  // Export filtered advocates to CSV
  const exportToCSV = () => {
    if (!filteredAdvocates || filteredAdvocates.length === 0) {
      alert('No data to export');
      return;
    }

    // CSV headers
    const headers = [
      'Email',
      'User Names',
      'Total Users',
      'Engagement Score',
      'Impact Score',
      'Engagement Rate (%)',
      'Total Sales',
      'Total Programs',
      'Programs with Sales',
      'Conversion Rate (%)',
      'Avg Sale Amount',
      'Total Tasks',
      'Instagram Handles',
      'TikTok Handles',
      'Tier',
      'Activity Level'
    ];

    // Convert data to CSV rows
    const rows = filteredAdvocates.map((advocate) => {
      const engagement = advocate.total_engagement_score || 0;
      const sales = parseSales(advocate.total_sales);
      const programs = advocate.total_programs || 0;
      const tier = getAdvocateTier(engagement, advocate.total_sales);
      const activityLevel = getActivityLevel(programs);

      return [
        advocate.email || '',
        advocate.user_names || '',
        advocate.total_users || 0,
        engagement,
        Math.round(advocate.total_impact_score || 0),
        advocate.avg_engagement_rate ? advocate.avg_engagement_rate.toFixed(2) : '',
        sales,
        programs,
        advocate.programs_with_sales || 0,
        advocate.program_conversion_rate ? advocate.program_conversion_rate.toFixed(2) : '',
        advocate.avg_sale_amount || '',
        advocate.total_tasks || 0,
        advocate.instagram_handles || '',
        advocate.tiktok_handles || '',
        tier.charAt(0).toUpperCase() + tier.slice(1),
        activityLevel
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape commas and quotes in cell values
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `advocates_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Head>
        <title>Advocates - Advocacy Platform</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Advocates"
          subtitle="View and manage all platform advocates"
          backLink="/"
          backLabel="Back to Dashboard"
        />

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader title={`All Advocates (${totalAdvocatesCount > 0 ? totalAdvocatesCount.toLocaleString() : '...'})`} />

            {/* Filters */}
            <div className="mb-6 space-y-4">
              {/* Top Row: Search, Sort, Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or handle..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Metric Filter */}
                <div className="flex items-center space-x-2">
                  <ArrowUpDown className="w-5 h-5 text-gray-400" />
                  <select
                    value={filterMetric}
                    onChange={(e) =>
                      setFilterMetric(e.target.value as 'engagement' | 'sales')
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="engagement">By Engagement</option>
                    <option value="sales">By Sales</option>
                  </select>
                </div>

                {/* Export Button */}
                <button 
                  onClick={exportToCSV}
                  disabled={!filteredAdvocates || filteredAdvocates.length === 0}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
                >
                  <Download className="w-5 h-5" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Advanced Filters */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                >
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Advanced Filters</span>
                    {hasActiveFilters && (
                      <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                        {[
                          filterTier !== 'all',
                          filterMinEngagement || filterMaxEngagement,
                          filterMinSales || filterMaxSales,
                          filterMinPrograms || filterMaxPrograms,
                          filterMinConversionRate || filterMaxConversionRate,
                          filterActivityLevel !== 'all'
                        ].filter(Boolean).length}
                      </span>
                    )}
                  </div>
                  {showAdvancedFilters ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {showAdvancedFilters && (
                  <div className="p-4 space-y-4 bg-white rounded-b-lg">
                    {/* Quick Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Tier Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Performance Tier
                        </label>
                        <select
                          value={filterTier}
                          onChange={(e) => setFilterTier(e.target.value as TierType | 'all')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="all">All Tiers</option>
                          <option value="platinum">Platinum</option>
                          <option value="gold">Gold</option>
                          <option value="silver">Silver</option>
                          <option value="bronze">Bronze</option>
                          <option value="starter">Starter</option>
                        </select>
                      </div>

                      {/* Activity Level Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Activity Level
                        </label>
                        <select
                          value={filterActivityLevel}
                          onChange={(e) => setFilterActivityLevel(e.target.value as ActivityLevel)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="all">All Levels</option>
                          <option value="Highly Active">Highly Active (≥10 programs)</option>
                          <option value="Active">Active (≥5 programs)</option>
                          <option value="Moderate">Moderate (≥2 programs)</option>
                          <option value="Low">Low (≥1 program)</option>
                          <option value="Inactive">Inactive (0 programs)</option>
                        </select>
                      </div>
                    </div>

                    {/* Range Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Engagement Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Engagement Score
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filterMinEngagement}
                            onChange={(e) => setFilterMinEngagement(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={filterMaxEngagement}
                            onChange={(e) => setFilterMaxEngagement(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Sales Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Sales
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filterMinSales}
                            onChange={(e) => setFilterMinSales(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={filterMaxSales}
                            onChange={(e) => setFilterMaxSales(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Programs Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Programs
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filterMinPrograms}
                            onChange={(e) => setFilterMinPrograms(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={filterMaxPrograms}
                            onChange={(e) => setFilterMaxPrograms(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Conversion Rate Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Conversion Rate (%)
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filterMinConversionRate}
                            onChange={(e) => setFilterMinConversionRate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={filterMaxConversionRate}
                            onChange={(e) => setFilterMaxConversionRate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                      <div className="flex justify-end">
                        <button
                          onClick={clearFilters}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          <span>Clear All Filters</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Results Count */}
              {hasActiveFilters && (
                <div className="text-sm text-gray-600">
                  Showing {totalCount.toLocaleString()} of {advocates?.length || 0} advocates
                  {advocates && advocates.length < totalAdvocatesCount && (
                    <span className="ml-2 text-gray-400">
                      (Total: {totalAdvocatesCount.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
              {!hasActiveFilters && advocates && (
                <div className="text-sm text-gray-600">
                  Loaded {advocates.length.toLocaleString()} of {totalAdvocatesCount.toLocaleString()} advocates
                </div>
              )}
            </div>

            {/* Table */}
            {!advocates && !error && <Loading text="Loading advocates..." />}

            {error && (
              <div className="text-center py-8 text-red-600">
                Error loading advocates. Please try again.
              </div>
            )}

            {advocates && (
              <>
                {paginatedAdvocates.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Advocates Found
                    </h3>
                    <p className="text-gray-600">
                      {searchTerm || debouncedSearch
                        ? 'Try adjusting your search criteria or filters.'
                        : 'Start importing advocate data to see them listed here.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Users
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex flex-col items-end">
                              <span>Engagement</span>
                              <span className="text-[10px] font-normal text-gray-400 normal-case">Quality</span>
                            </div>
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex flex-col items-end">
                              <span>Impact</span>
                              <span className="text-[10px] font-normal text-gray-400 normal-case">Total Effect</span>
                            </div>
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex flex-col items-end">
                              <span>Eng. Rate</span>
                              <span className="text-[10px] font-normal text-gray-400 normal-case">Efficiency</span>
                            </div>
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sales
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Programs
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedAdvocates.map((advocate) => (
                          <tr
                            key={advocate.account_id}
                            onClick={() => router.push(`/advocates/${advocate.account_id}`)}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4 max-w-xs">
                              <div className="text-sm font-bold text-gray-900 truncate" title={advocate.email || 'No email'}>
                                {advocate.email || 'No email'}
                              </div>
                              <div className="text-sm text-gray-500 truncate mt-1" title={advocate.user_names || 'Anonymous'}>
                                {advocate.user_names || 'Anonymous'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {advocate.total_users || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div className="font-medium text-green-600">
                                {advocate.total_engagement_score?.toLocaleString() || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div className="font-medium text-purple-600">
                                {advocate.total_impact_score 
                                  ? Math.round(advocate.total_impact_score).toLocaleString()
                                  : '0'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div className="font-medium text-blue-600">
                                {advocate.avg_engagement_rate 
                                  ? `${advocate.avg_engagement_rate.toFixed(1)}%`
                                  : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                              {formatCurrency(parseSales(advocate.total_sales), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                              {advocate.total_programs || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
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
                          <span className="font-medium">{offset + 1}</span>
                          {' '}-{' '}
                          <span className="font-medium">
                            {Math.min(offset + itemsPerPage, totalCount)}
                          </span>
                          {' '}of{' '}
                          <span className="font-medium">{totalCount}</span>
                          {' '}advocates
                        </p>
                        <label className="text-sm text-gray-700">
                          Show:
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
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
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentPage === pageNum
                                    ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

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
              </>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

