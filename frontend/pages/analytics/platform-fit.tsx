import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import useSWR from 'swr';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Scan, TrendingUp, Users, DollarSign, Info, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, ArrowUpDown, Filter, Download } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';

const DEFAULT_PAGE_SIZE = 25;

export default function PlatformFitPage() {
  const { formatCurrency } = useCurrency();
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<'total_sales' | 'programs' | 'conversion_rate' | 'revenue_per_task' | 'avg_engagement'>('total_sales');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Filter states
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterMinPrograms, setFilterMinPrograms] = useState<string>('');
  const [filterMaxPrograms, setFilterMaxPrograms] = useState<string>('');
  const [filterMinSales, setFilterMinSales] = useState<string>('');
  const [filterMaxSales, setFilterMaxSales] = useState<string>('');
  const [filterMinConversionRate, setFilterMinConversionRate] = useState<string>('');
  const [filterMaxConversionRate, setFilterMaxConversionRate] = useState<string>('');
  const [filterMinRevenuePerTask, setFilterMinRevenuePerTask] = useState<string>('');
  const [filterMaxRevenuePerTask, setFilterMaxRevenuePerTask] = useState<string>('');
  const [filterMinAvgEngagement, setFilterMinAvgEngagement] = useState<string>('');
  const [filterMaxAvgEngagement, setFilterMaxAvgEngagement] = useState<string>('');

  const { data: brandPlatformFit, error, isLoading } = useSWR(
    'brand-platform-fit',
    () => apiClient.getBrandPlatformFit(undefined, 1), // Use min_programs=1 to include all brand-platform combinations
    { refreshInterval: 60000 }
  );

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBrand, filterPlatform, filterMinPrograms, filterMaxPrograms, filterMinSales, filterMaxSales,
      filterMinConversionRate, filterMaxConversionRate, filterMinRevenuePerTask, filterMaxRevenuePerTask,
      filterMinAvgEngagement, filterMaxAvgEngagement, sortField, sortDirection, itemsPerPage]);

  // Get unique brands and platforms for filters
  const brands = useMemo(() => {
    return brandPlatformFit
      ? Array.from(new Set(brandPlatformFit.map((item) => item.brand))).sort()
      : [];
  }, [brandPlatformFit]);

  const platforms = useMemo(() => {
    return brandPlatformFit
      ? Array.from(new Set(brandPlatformFit.map((item) => item.platform))).sort()
      : [];
  }, [brandPlatformFit]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!brandPlatformFit) return [];

    let filtered = brandPlatformFit;

    // Brand filter
    if (selectedBrand) {
      filtered = filtered.filter((item) => item.brand === selectedBrand);
    }

    // Platform filter
    if (filterPlatform !== 'all') {
      filtered = filtered.filter((item) => item.platform === filterPlatform);
    }

    // Search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((item) =>
        item.brand.toLowerCase().includes(searchLower) ||
        item.platform.toLowerCase().includes(searchLower)
      );
    }

    // Programs range
    if (filterMinPrograms) {
      filtered = filtered.filter((item) => item.programs >= parseFloat(filterMinPrograms));
    }
    if (filterMaxPrograms) {
      filtered = filtered.filter((item) => item.programs <= parseFloat(filterMaxPrograms));
    }

    // Sales range
    if (filterMinSales) {
      filtered = filtered.filter((item) => {
        const sales = typeof item.total_sales === 'string' ? parseFloat(item.total_sales) : item.total_sales;
        return sales >= parseFloat(filterMinSales);
      });
    }
    if (filterMaxSales) {
      filtered = filtered.filter((item) => {
        const sales = typeof item.total_sales === 'string' ? parseFloat(item.total_sales) : item.total_sales;
        return sales <= parseFloat(filterMaxSales);
      });
    }

    // Conversion rate range
    if (filterMinConversionRate) {
      filtered = filtered.filter((item) => 
        (item.program_conversion_rate_pct || 0) >= parseFloat(filterMinConversionRate)
      );
    }
    if (filterMaxConversionRate) {
      filtered = filtered.filter((item) => 
        (item.program_conversion_rate_pct || 0) <= parseFloat(filterMaxConversionRate)
      );
    }

    // Revenue per task range
    if (filterMinRevenuePerTask) {
      filtered = filtered.filter((item) => 
        (item.revenue_per_task || 0) >= parseFloat(filterMinRevenuePerTask)
      );
    }
    if (filterMaxRevenuePerTask) {
      filtered = filtered.filter((item) => 
        (item.revenue_per_task || 0) <= parseFloat(filterMaxRevenuePerTask)
      );
    }

    // Avg engagement range
    if (filterMinAvgEngagement) {
      filtered = filtered.filter((item) => 
        (item.avg_engagement || 0) >= parseFloat(filterMinAvgEngagement)
      );
    }
    if (filterMaxAvgEngagement) {
      filtered = filtered.filter((item) => 
        (item.avg_engagement || 0) <= parseFloat(filterMaxAvgEngagement)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'total_sales':
          aValue = typeof a.total_sales === 'string' ? parseFloat(a.total_sales) : a.total_sales;
          bValue = typeof b.total_sales === 'string' ? parseFloat(b.total_sales) : b.total_sales;
          break;
        case 'programs':
          aValue = a.programs;
          bValue = b.programs;
          break;
        case 'conversion_rate':
          aValue = a.program_conversion_rate_pct || 0;
          bValue = b.program_conversion_rate_pct || 0;
          break;
        case 'revenue_per_task':
          aValue = a.revenue_per_task || 0;
          bValue = b.revenue_per_task || 0;
          break;
        case 'avg_engagement':
          aValue = a.avg_engagement || 0;
          bValue = b.avg_engagement || 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return filtered;
  }, [brandPlatformFit, selectedBrand, filterPlatform, debouncedSearch, filterMinPrograms, filterMaxPrograms,
      filterMinSales, filterMaxSales, filterMinConversionRate, filterMaxConversionRate, filterMinRevenuePerTask,
      filterMaxRevenuePerTask, filterMinAvgEngagement, filterMaxAvgEngagement, sortField, sortDirection]);

  // Pagination
  const offset = (currentPage - 1) * itemsPerPage;
  const paginatedData = useMemo(() => {
    return filteredData.slice(offset, offset + itemsPerPage);
  }, [filteredData, offset, itemsPerPage]);

  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Check if any filters are active
  const hasActiveFilters = filterPlatform !== 'all' || 
    filterMinPrograms || filterMaxPrograms || 
    filterMinSales || filterMaxSales || 
    filterMinConversionRate || filterMaxConversionRate ||
    filterMinRevenuePerTask || filterMaxRevenuePerTask ||
    filterMinAvgEngagement || filterMaxAvgEngagement ||
    debouncedSearch;

  // Clear all filters
  const clearFilters = () => {
    setSelectedBrand('');
    setFilterPlatform('all');
    setFilterMinPrograms('');
    setFilterMaxPrograms('');
    setFilterMinSales('');
    setFilterMaxSales('');
    setFilterMinConversionRate('');
    setFilterMaxConversionRate('');
    setFilterMinRevenuePerTask('');
    setFilterMaxRevenuePerTask('');
    setFilterMinAvgEngagement('');
    setFilterMaxAvgEngagement('');
    setSearchTerm('');
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export filtered data to CSV
  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Brand',
      'Platform',
      'Programs',
      'Total Sales',
      'Conversion Rate (%)',
      'Revenue per Task',
      'Avg Engagement',
      'Tasks'
    ];

    const rows = filteredData.map((item) => {
      const sales = typeof item.total_sales === 'string' ? parseFloat(item.total_sales) : item.total_sales;
      return [
        item.brand || '',
        item.platform || '',
        item.programs || 0,
        sales || 0,
        item.program_conversion_rate_pct ? item.program_conversion_rate_pct.toFixed(1) : 0,
        item.revenue_per_task ? item.revenue_per_task.toFixed(2) : 0,
        item.avg_engagement ? item.avg_engagement.toFixed(0) : 0,
        item.tasks || 0
      ];
    });

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
    link.setAttribute('download', `platform_brand_fit_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Head>
        <title>Platform-Brand Fit - Analytics</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Platform-Brand Fit Analysis"
          subtitle="Discover which platforms work best for specific brands"
          backLink="/analytics"
          backLabel="Back to Analytics"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Info Box */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Brand-Platform Fit Analysis
                </h4>
                <p className="text-sm text-blue-800 mb-2">
                  This analysis shows which social platforms drive the best results for each brand, 
                  helping you optimize campaign planning and budget allocation.
                </p>
                <ul className="text-sm text-blue-800 space-y-1 ml-4">
                  <li>• <strong>Conv. Rate</strong>: Percentage of programs that generated sales</li>
                  <li>• <strong>Rev/Task</strong>: Average revenue generated per post/task</li>
                  <li>• <strong>Avg Eng.</strong>: Average engagement score across all posts</li>
                  <li>• <strong>Min Programs</strong>: Combinations with fewer than 3 programs are filtered out for statistical reliability</li>
                </ul>
                <p className="text-xs text-blue-700 mt-2">
                  💡 Use this to identify which platforms work best for specific brands, optimize your platform mix, 
                  and make data-driven decisions about where to invest your advocacy efforts.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <Card>
            <div className="flex justify-between items-center px-6 pt-6 pb-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedBrand ? `${selectedBrand} - Platform Performance` : 'Platform Performance by Brand'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedBrand
                    ? `Platform breakdown for ${selectedBrand}`
                    : 'Compare platform effectiveness across all brands'}
                </p>
              </div>
              {filteredData && filteredData.length > 0 && (
                <button 
                  onClick={exportToCSV}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="px-6 pb-6 space-y-4 border-b border-gray-200">
              {/* Top Row: Search, Brand Filter, Sort */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by brand or platform..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Brand Filter */}
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">All Brands</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="flex items-center space-x-2">
                  <ArrowUpDown className="w-5 h-5 text-gray-400" />
                  <select
                    value={`${sortField}_${sortDirection}`}
                    onChange={(e) => {
                      const [field, dir] = e.target.value.split('_');
                      setSortField(field as typeof sortField);
                      setSortDirection(dir as 'asc' | 'desc');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="total_sales_desc">Sales (High to Low)</option>
                    <option value="total_sales_asc">Sales (Low to High)</option>
                    <option value="programs_desc">Programs (High to Low)</option>
                    <option value="programs_asc">Programs (Low to High)</option>
                    <option value="conversion_rate_desc">Conv. Rate (High to Low)</option>
                    <option value="conversion_rate_asc">Conv. Rate (Low to High)</option>
                    <option value="revenue_per_task_desc">Rev/Task (High to Low)</option>
                    <option value="revenue_per_task_asc">Rev/Task (Low to High)</option>
                    <option value="avg_engagement_desc">Avg Eng. (High to Low)</option>
                    <option value="avg_engagement_asc">Avg Eng. (Low to High)</option>
                  </select>
                </div>
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
                          filterPlatform !== 'all',
                          filterMinPrograms || filterMaxPrograms,
                          filterMinSales || filterMaxSales,
                          filterMinConversionRate || filterMaxConversionRate,
                          filterMinRevenuePerTask || filterMaxRevenuePerTask,
                          filterMinAvgEngagement || filterMaxAvgEngagement,
                          debouncedSearch
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Platform Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Platform
                        </label>
                        <select
                          value={filterPlatform}
                          onChange={(e) => setFilterPlatform(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="all">All Platforms</option>
                          {platforms.map((platform) => (
                            <option key={platform} value={platform}>
                              {platform}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Range Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

                      {/* Conversion Rate Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Conv. Rate (%)
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

                      {/* Revenue Per Task Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rev/Task
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filterMinRevenuePerTask}
                            onChange={(e) => setFilterMinRevenuePerTask(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={filterMaxRevenuePerTask}
                            onChange={(e) => setFilterMaxRevenuePerTask(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Avg Engagement Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Avg Eng.
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={filterMinAvgEngagement}
                            onChange={(e) => setFilterMinAvgEngagement(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={filterMaxAvgEngagement}
                            onChange={(e) => setFilterMaxAvgEngagement(e.target.value)}
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
                  Showing {totalCount.toLocaleString()} of {brandPlatformFit?.length || 0} results
                </div>
              )}
            </div>

            {error && (
              <div className="p-6 text-center text-red-600">
                Error loading data. Please try again.
              </div>
            )}

            {isLoading && <Loading text="Loading platform fit data..." />}

            {brandPlatformFit && (
              <div className="overflow-x-auto">
                {paginatedData.length === 0 ? (
                  <div className="text-center py-12">
                    <Scan className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No data available for the selected filters</p>
                  </div>
                ) : (
                  <>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Platform
                          </th>
                          <th 
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('programs')}
                          >
                            <div className="flex items-center justify-end">
                              Programs
                              {sortField === 'programs' && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Accounts
                          </th>
                          <th 
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('total_sales')}
                          >
                            <div className="flex items-center justify-end">
                              Total Sales
                              {sortField === 'total_sales' && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('conversion_rate')}
                          >
                            <div className="flex items-center justify-end">
                              Conv. Rate
                              {sortField === 'conversion_rate' && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('revenue_per_task')}
                          >
                            <div className="flex items-center justify-end">
                              Rev/Task
                              {sortField === 'revenue_per_task' && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('avg_engagement')}
                          >
                            <div className="flex items-center justify-end">
                              Avg Eng.
                              {sortField === 'avg_engagement' && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.map((item, index) => (
                        <tr key={`${item.brand}-${item.platform}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.brand}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {item.platform}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {item.programs}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            <div className="flex items-center justify-end">
                              <Users className="w-4 h-4 mr-1 text-gray-400" />
                              {item.advocate_accounts}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                            <div className="flex items-center justify-end">
                              <DollarSign className="w-4 h-4 mr-1" />
                              {typeof item.total_sales === 'string'
                                ? parseFloat(item.total_sales).toLocaleString()
                                : item.total_sales.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {item.program_conversion_rate_pct?.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            ${item.revenue_per_task?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                            <div className="flex items-center justify-end">
                              <TrendingUp className="w-4 h-4 mr-1 text-gray-400" />
                              {item.avg_engagement?.toFixed(0) || 0}
                            </div>
                          </td>
                        </tr>
                        ))}
                      </tbody>
                    </table>

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
                              {' '}results
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
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

