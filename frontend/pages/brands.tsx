import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import useSWR from 'swr';
import { apiClient, BrandPerformance } from '@/lib/api';
import { Card, CardHeader } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/layout/PageHeader';
import { Search, TrendingUp, Users, DollarSign, Target, ChevronUp, ChevronDown, Filter, X, Download } from 'lucide-react';
import { PerformanceBadge, TierType } from '@/components/ui/PerformanceBadge';
import { StatCard } from '@/components/ui/StatCard';
import { useCurrency } from '@/contexts/CurrencyContext';

type SortField = 'brand' | 'total_sales' | 'total_advocates' | 'total_programs' | 'sales_per_advocate';
type SortDirection = 'asc' | 'desc';

export default function BrandsPage() {
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState<SortField>('total_sales');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterTier, setFilterTier] = useState<TierType | 'all'>('all');
  const [filterMinSales, setFilterMinSales] = useState<string>('');
  const [filterMaxSales, setFilterMaxSales] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all brands for accurate top card stats
  const { data: brands, error } = useSWR(
    'brands-performance-all',
    () => apiClient.getBrandPerformance(), // No limit - fetch all brands
    { refreshInterval: 30000 }
  );

  const getBrandTier = (sales: number): TierType => {
    if (sales >= 50000) return 'platinum';
    if (sales >= 20000) return 'gold';
    if (sales >= 5000) return 'silver';
    if (sales >= 1000) return 'bronze';
    return 'starter';
  };

  // Filter and sort brands
  const filteredAndSortedBrands = useMemo(() => {
    if (!brands) return [];

    let filtered = brands.filter((brand) => {
      // Search filter
      const matchesSearch = brand.brand.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Tier filter
      const sales = Number(brand.total_sales || 0);
      const tier = getBrandTier(sales);
      const matchesTier = filterTier === 'all' || tier === filterTier;
      
      // Sales range filter
      const minSales = filterMinSales ? parseFloat(filterMinSales) : null;
      const maxSales = filterMaxSales ? parseFloat(filterMaxSales) : null;
      const matchesMinSales = !minSales || sales >= minSales;
      const matchesMaxSales = !maxSales || sales <= maxSales;
      
      return matchesSearch && matchesTier && matchesMinSales && matchesMaxSales;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortField) {
        case 'brand':
          aValue = a.brand.toLowerCase();
          bValue = b.brand.toLowerCase();
          break;
        case 'total_sales':
          aValue = Number(a.total_sales || 0);
          bValue = Number(b.total_sales || 0);
          break;
        case 'total_advocates':
          aValue = a.total_advocates || 0;
          bValue = b.total_advocates || 0;
          break;
        case 'total_programs':
          aValue = a.total_programs || 0;
          bValue = b.total_programs || 0;
          break;
        case 'sales_per_advocate':
          aValue = Number(a.sales_per_advocate || 0);
          bValue = Number(b.sales_per_advocate || 0);
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [brands, searchTerm, filterTier, filterMinSales, filterMaxSales, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedBrands.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBrands = filteredAndSortedBrands.slice(startIndex, endIndex);

  // Stats based on ALL brands (not filtered)
  const topBrand = brands?.reduce((top, brand) => {
    const topSales = Number(top?.total_sales || 0);
    const brandSales = Number(brand.total_sales || 0);
    return brandSales > topSales ? brand : top;
  }, brands[0]);
  const totalSales = brands?.reduce((sum, b) => sum + Number(b.total_sales || 0), 0) || 0;
  const avgSalesPerBrand = brands && brands.length > 0 ? totalSales / brands.length : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setFilterTier('all');
    setFilterMinSales('');
    setFilterMaxSales('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filterTier !== 'all' || filterMinSales || filterMaxSales || searchTerm;

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTier, filterMinSales, filterMaxSales, sortField, sortDirection]);

  // Export filtered brands to CSV
  const exportToCSV = () => {
    if (!filteredAndSortedBrands || filteredAndSortedBrands.length === 0) {
      alert('No data to export');
      return;
    }

    // CSV headers
    const headers = [
      'Brand',
      'Tier',
      'Total Sales',
      'Total Advocates',
      'Total Programs',
      'Sales per Advocate',
      'Average Engagement per Program',
      'Total Tasks'
    ];

    // Convert data to CSV rows
    const rows = filteredAndSortedBrands.map((brand) => {
      const sales = Number(brand.total_sales || 0);
      const tier = getBrandTier(sales);

      return [
        brand.brand || '',
        tier.charAt(0).toUpperCase() + tier.slice(1),
        sales,
        brand.total_advocates || 0,
        brand.total_programs || 0,
        Number(brand.sales_per_advocate || 0),
        Number(brand.avg_engagement_per_program || 0),
        brand.total_tasks || 0
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
    link.setAttribute('download', `brands_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Head>
        <title>Brands - Advocacy Platform</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Brand Performance"
          subtitle="Track and analyze brand partnerships and performance"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Brands"
              value={brands?.length || 0}
              icon={TrendingUp}
              iconColor="text-purple-500"
              loading={!brands}
            />
            <StatCard
              title="Top Brand"
              value={topBrand?.brand || '-'}
              subtitle={topBrand ? formatCurrency(Number(topBrand.total_sales), { minimumFractionDigits: 0 }) : ''}
              icon={Target}
              iconColor="text-blue-500"
              loading={!brands}
            />
            <StatCard
              title="Avg Sales/Brand"
              value={formatCurrency(avgSalesPerBrand, { minimumFractionDigits: 0 })}
              icon={DollarSign}
              iconColor="text-green-500"
              loading={!brands}
            />
            <StatCard
              title="Total Advocates"
              value={brands?.reduce((sum, b) => sum + b.total_advocates, 0).toLocaleString() || 0}
              icon={Users}
              iconColor="text-orange-500"
              loading={!brands}
            />
          </div>

          <Card>
            <CardHeader 
              title={`All Brands (${filteredAndSortedBrands.length.toLocaleString()})`}
              subtitle={brands ? `Showing ${startIndex + 1}-${Math.min(endIndex, filteredAndSortedBrands.length)} of ${filteredAndSortedBrands.length.toLocaleString()} brands` : ''}
            />

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search brands..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                    showFilters || hasActiveFilters
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-5 h-5" />
                  Filters
                  {hasActiveFilters && (
                    <span className="bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {[filterTier !== 'all', filterMinSales, filterMaxSales, searchTerm].filter(Boolean).length}
                    </span>
                  )}
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                    Clear
                  </button>
                )}
                {/* Export Button */}
                <button 
                  onClick={exportToCSV}
                  disabled={!filteredAndSortedBrands || filteredAndSortedBrands.length === 0}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  <span>Export CSV</span>
                </button>
              </div>

              {showFilters && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tier Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tier
                      </label>
                      <select
                        value={filterTier}
                        onChange={(e) => setFilterTier(e.target.value as TierType | 'all')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="all">All Tiers</option>
                        <option value="platinum">Platinum ($50k+)</option>
                        <option value="gold">Gold ($20k-$50k)</option>
                        <option value="silver">Silver ($5k-$20k)</option>
                        <option value="bronze">Bronze ($1k-$5k)</option>
                        <option value="starter">Starter (&lt;$1k)</option>
                      </select>
                    </div>

                    {/* Min Sales Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Sales ($)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={filterMinSales}
                        onChange={(e) => setFilterMinSales(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    {/* Max Sales Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Sales ($)
                      </label>
                      <input
                        type="number"
                        placeholder="No limit"
                        value={filterMaxSales}
                        onChange={(e) => setFilterMaxSales(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            {!brands && !error && <Loading text="Loading brands..." />}

            {error && (
              <div className="text-center py-8 text-red-600">
                Error loading brands. Please try again.
              </div>
            )}

            {filteredAndSortedBrands && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <SortableHeader
                          field="brand"
                          label="Brand"
                          align="left"
                          sortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tier
                        </th>
                        <SortableHeader
                          field="total_sales"
                          label="Total Sales"
                          align="right"
                          sortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="total_advocates"
                          label="Advocates"
                          align="right"
                          sortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="total_programs"
                          label="Programs"
                          align="right"
                          sortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="sales_per_advocate"
                          label="Sales/Advocate"
                          align="right"
                          sortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedBrands.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            No brands found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedBrands.map((brand) => {
                          const sales = Number(brand.total_sales || 0);
                          const tier = getBrandTier(sales);

                          return (
                            <tr
                              key={brand.brand}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-6 py-4 max-w-xs">
                                <div className="text-sm font-medium text-gray-900 truncate" title={brand.brand}>
                                  {brand.brand}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <PerformanceBadge tier={tier} size="sm" />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                                {formatCurrency(sales, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                {brand.total_advocates}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                {brand.total_programs}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                {formatCurrency(Number(brand.sales_per_advocate || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredAndSortedBrands.length > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center gap-4">
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
                      <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Last
                      </button>
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

// Sortable Header Component
interface SortableHeaderProps {
  field: SortField;
  label: string;
  align: 'left' | 'center' | 'right';
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function SortableHeader({ field, label, align, sortField, sortDirection, onSort }: SortableHeaderProps) {
  const isActive = sortField === field;
  const alignClass = align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right';

  return (
    <th
      className={`px-6 py-3 ${alignClass} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        <span>{label}</span>
        <div className="flex flex-col">
          <ChevronUp
            className={`w-3 h-3 -mb-1 ${
              isActive && sortDirection === 'asc' ? 'text-primary-600' : 'text-gray-400'
            }`}
          />
          <ChevronDown
            className={`w-3 h-3 ${
              isActive && sortDirection === 'desc' ? 'text-primary-600' : 'text-gray-400'
            }`}
          />
        </div>
      </div>
    </th>
  );
}

