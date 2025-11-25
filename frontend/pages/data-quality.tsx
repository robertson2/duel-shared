import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { Card, CardHeader } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/layout/PageHeader';
import { AlertCircle, CheckCircle, AlertTriangle, Info, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const DEFAULT_PAGE_SIZE = 25;

export default function DataQualityPage() {
  const router = useRouter();
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  
  const { data: summary } = useSWR(
    'data-quality-summary',
    () => apiClient.getDataQualitySummary(),
    { refreshInterval: 60000 }
  );

  const { data: allIssues } = useSWR(
    ['data-quality-issues', severityFilter],
    () => apiClient.getDataQualityIssues(severityFilter || undefined),
    { refreshInterval: 60000 }
  );

  // Pagination
  const offset = (currentPage - 1) * itemsPerPage;
  const issues = useMemo(() => {
    if (!allIssues) return [];
    return allIssues.slice(offset, offset + itemsPerPage);
  }, [allIssues, offset, itemsPerPage]);

  const totalCount = allIssues?.length || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [severityFilter, itemsPerPage]);

  const handleIssueClick = (issue: Record<string, unknown>) => {
    // Navigate to advocate page if account_id is available
    if (issue.account_id) {
      router.push(`/advocates/${issue.account_id}`);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Calculate health score based on percentage of records affected by issues
  // rather than absolute counts (works better with large datasets)
  const healthScore = summary && summary.total_records > 0
    ? Math.round(Math.max(0, Math.min(100, 
        100 - (
          // Critical issues: each 1% of records affected reduces score by 5 points
          (summary.critical_issues / summary.total_records * 100) * 5 +
          // High issues: each 1% of records affected reduces score by 2 points
          (summary.high_issues / summary.total_records * 100) * 2 +
          // Medium issues: each 1% of records affected reduces score by 0.5 points
          (summary.medium_issues / summary.total_records * 100) * 0.5 +
          // Low issues: each 1% of records affected reduces score by 0.1 points
          (summary.low_issues / summary.total_records * 100) * 0.1
        )
      )))
    : 100; // Default to 100% if no records or no data

  // Export filtered issues to CSV
  const exportToCSV = () => {
    if (!allIssues || allIssues.length === 0) {
      alert('No data to export');
      return;
    }

    // CSV headers
    const headers = [
      'Issue ID',
      'Severity',
      'Type',
      'Description',
      'Account ID',
      'Detected At',
      'Status',
      'Resolved At'
    ];

    // Convert data to CSV rows
    const rows = allIssues.map((issue) => {
      return [
        issue.issue_id || '',
        issue.severity || '',
        issue.issue_type || '',
        issue.issue_description || '',
        issue.account_id || '',
        issue.detected_at ? new Date(issue.detected_at).toLocaleString() : '',
        issue.resolved ? 'Resolved' : 'Open',
        issue.resolved_at ? new Date(issue.resolved_at).toLocaleString() : ''
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
    link.setAttribute('download', `data_quality_issues_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Head>
        <title>Data Quality - Advocacy Platform</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Data Quality"
          subtitle="Monitor and resolve data quality issues"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card className="col-span-1 md:col-span-2 lg:col-span-1">
              <div className="p-6">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2" style={{
                    color: healthScore >= 90 ? '#10b981' : healthScore >= 70 ? '#f59e0b' : '#ef4444'
                  }}>
                    {healthScore}%
                  </div>
                  <div className="text-sm text-gray-600">Health Score</div>
                  <div className="text-xs text-gray-500 mt-1" title="Based on percentage of records affected by issues, weighted by severity">
                    {summary?.total_records > 0 && (
                      <>{((summary.open_issues / summary.total_records) * 100).toFixed(1)}% records affected</>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Critical</span>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-3xl font-bold text-red-600">
                  {summary?.critical_issues || 0}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">High</span>
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-3xl font-bold text-orange-600">
                  {summary?.high_issues || 0}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Issues</span>
                  <Info className="w-5 h-5 text-gray-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {summary?.total_issues || 0}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Resolution Rate</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {summary?.resolution_rate || 0}%
                </div>
              </div>
            </Card>
          </div>

          {/* Issues Table */}
          <Card>
            <CardHeader title="Data Quality Issues" />

            {/* Filter */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                {/* Export Button */}
                <button 
                  onClick={exportToCSV}
                  disabled={!allIssues || allIssues.length === 0}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {!allIssues && <Loading text="Loading issues..." />}

            {allIssues && allIssues.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Issues Found
                </h3>
                <p className="text-gray-600">
                  All data quality checks are passing!
                </p>
              </div>
            )}

            {allIssues && allIssues.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Severity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Detected
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {issues.map((issue) => (
                        <tr 
                          key={issue.issue_id} 
                          className={clsx(
                            "hover:bg-gray-50 transition-colors",
                            issue.account_id && "cursor-pointer"
                          )}
                          onClick={() => handleIssueClick(issue)}
                          title={issue.account_id ? "Click to view advocate record" : undefined}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getSeverityIcon(issue.severity)}
                              <span
                                className={clsx(
                                  'ml-2 px-2.5 py-1 text-xs font-medium rounded-full border',
                                  getSeverityColor(issue.severity)
                                )}
                              >
                                {issue.severity}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.issue_type}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {issue.issue_description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(issue.detected_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {issue.resolved ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolved
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Open
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

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
                          {' '}issues
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

