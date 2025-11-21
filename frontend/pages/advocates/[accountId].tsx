import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/layout/PageHeader';
import { PerformanceBadge, TierType } from '@/components/ui/PerformanceBadge';
import { StatCard } from '@/components/ui/StatCard';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  DollarSign,
  TrendingUp,
  Target,
  Calendar,
  Activity,
  Award,
  Users,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Download,
} from 'lucide-react';
import { parseSales } from '@/lib/api';
import clsx from 'clsx';

type TabType = 'overview' | 'programs' | 'sales' | 'social' | 'issues';

export default function AdvocateDetailPage() {
  const router = useRouter();
  const { accountId } = router.query;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { formatCurrency } = useCurrency();

  const { data: engagement, error } = useSWR(
    accountId ? ['account-engagement', accountId] : null,
    () => apiClient.getAccountEngagement(accountId as string),
    { refreshInterval: 30000 }
  );

  const { data: users } = useSWR(
    accountId ? ['account-users', accountId] : null,
    () => apiClient.getAccountUsers(accountId as string)
  );

  const { data: issues } = useSWR(
    accountId ? ['account-issues', accountId] : null,
    () => apiClient.getDataQualityIssuesByAccount(accountId as string),
    { refreshInterval: 60000 }
  );

  const { data: programs } = useSWR(
    accountId ? ['account-programs', accountId] : null,
    () => apiClient.getAccountPrograms(accountId as string),
    { refreshInterval: 30000 }
  );

  const { data: sales } = useSWR(
    accountId ? ['account-sales', accountId] : null,
    () => apiClient.getAccountSales(accountId as string, 100),
    { refreshInterval: 30000 }
  );

  const { data: socialAnalytics } = useSWR(
    accountId ? ['account-social-analytics', accountId] : null,
    () => apiClient.getAccountSocialAnalytics(accountId as string, 100),
    { refreshInterval: 30000 }
  );

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Account Not Found"
          subtitle="The requested account could not be found"
          backLink="/advocates"
          backLabel="Back to Advocates"
        />
      </main>
    );
  }

  if (!engagement) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading text="Loading advocate details..." />
      </main>
    );
  }

  const getTier = (): TierType => {
    const eng = engagement.total_engagement_score || 0;
    const sales = parseSales(engagement.total_sales);
    if (eng >= 50000 && sales >= 5000) return 'platinum';
    if (eng >= 20000 && sales >= 2000) return 'gold';
    if (eng >= 5000 && sales >= 500) return 'silver';
    if (eng >= 1000 || sales >= 100) return 'bronze';
    return 'starter';
  };

  const conversionRate = engagement.program_conversion_rate || 0;

  const efficiencyScore = engagement.total_engagement_score
    ? parseSales(engagement.total_sales) / engagement.total_engagement_score
    : 0;

  const issuesCount = issues?.length || 0;
  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'programs' as TabType, label: 'Programs' },
    { id: 'sales' as TabType, label: 'Sales History' },
    { id: 'social' as TabType, label: 'Social Analytics' },
    { id: 'issues' as TabType, label: `Data Quality Issues${issuesCount > 0 ? ` (${issuesCount})` : ''}` },
  ];

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

  // Export functions for each table
  const exportProgramsToCSV = () => {
    if (!programs || programs.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Brand', 'Campaign', 'Start Date', 'End Date', 'Tasks', 'Engagement', 'Sales'];
    const rows = programs.map((program: any) => [
      program.brand || '',
      program.program_name || '',
      program.started_at ? new Date(program.started_at).toLocaleDateString() : '',
      program.completed_at ? new Date(program.completed_at).toLocaleDateString() : '',
      program.tasks || 0,
      program.total_engagement || 0,
      parseSales(program.total_sales)
    ]);

    downloadCSV(headers, rows, `programs_${engagement.email}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportSalesToCSV = () => {
    if (!sales || sales.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Brand', 'Campaign', 'Amount', 'Order ID', 'User'];
    const rows = sales.map((sale: any) => [
      new Date(sale.attributed_at).toLocaleDateString(),
      sale.brand || '',
      sale.program_name || '',
      parseSales(sale.amount),
      sale.order_id || '',
      sale.user_name || ''
    ]);

    downloadCSV(headers, rows, `sales_${engagement.email}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportSocialToCSV = () => {
    if (!socialAnalytics || socialAnalytics.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Platform', 'Brand', 'Likes', 'Comments', 'Shares', 'Reach', 'Engagement Score'];
    const rows = socialAnalytics.map((analytics: any) => [
      new Date(analytics.measured_at).toLocaleDateString(),
      analytics.platform || '',
      analytics.brand || '',
      analytics.likes || 0,
      analytics.comments || 0,
      analytics.shares || 0,
      analytics.reach || 0,
      analytics.engagement_score || 0
    ]);

    downloadCSV(headers, rows, `social_analytics_${engagement.email}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportIssuesToCSV = () => {
    if (!issues || issues.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Severity', 'Type', 'Description', 'Detected', 'Status'];
    const rows = issues.map((issue: any) => [
      issue.severity || '',
      issue.issue_type || '',
      issue.issue_description || '',
      new Date(issue.detected_at).toLocaleDateString(),
      issue.resolved ? 'Resolved' : 'Open'
    ]);

    downloadCSV(headers, rows, `issues_${engagement.email}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Helper function to download CSV
  const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
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
        <title>{engagement.user_names || 'Advocate'} - Details</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title={engagement.user_names || 'Anonymous Advocate'}
          subtitle={engagement.email}
          backLink="/advocates"
          backLabel="Back to Advocates"
          actions={
            <>
              <PerformanceBadge tier={getTier()} size="lg" />
              {engagement.total_users > 1 && (
                <div className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                  <Users className="w-4 h-4 mr-1" />
                  {engagement.total_users} users
                </div>
              )}
            </>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            <StatCard
              title="Total Sales"
              value={formatCurrency(parseSales(engagement.total_sales), { minimumFractionDigits: 0 })}
              icon={DollarSign}
              iconColor="text-green-500"
            />
            <StatCard
              title="Engagement"
              value={(engagement.total_engagement_score || 0).toLocaleString()}
              icon={TrendingUp}
              iconColor="text-blue-500"
            />
            <StatCard
              title="Program Conv. Rate"
              value={`${Math.round(conversionRate)}%`}
              subtitle="Programs with sales"
              icon={Target}
              iconColor="text-purple-500"
            />
            <StatCard
              title="Efficiency"
              value={efficiencyScore.toFixed(2)}
              subtitle="Sales per engagement"
              icon={Award}
              iconColor="text-yellow-500"
            />
              <StatCard
              title="Converting Programs"
              value={`${engagement.programs_with_sales || 0} / ${engagement.total_programs || 0}`}
              icon={Activity}
              iconColor="text-pink-500"
            />
          </div>
          

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      py-4 px-1 border-b-2 font-medium text-sm
                      ${
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <Card>
            {activeTab === 'overview' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Account Overview
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Engagement Breakdown
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Likes:</span>
                        <span className="font-medium">
                          {(engagement.total_likes || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Comments:</span>
                        <span className="font-medium">
                          {(engagement.total_comments || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Shares:</span>
                        <span className="font-medium">
                          {(engagement.total_shares || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Reach:</span>
                        <span className="font-medium">
                          {(engagement.total_reach || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Associated Users
                    </h4>
                    {users && users.length > 0 ? (
                      <div className="space-y-2">
                        {users.map((user) => (
                          <div
                            key={user.user_id}
                            className="p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'Anonymous'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 space-x-3">
                              {user.instagram_handle && (
                                <span>IG: @{user.instagram_handle}</span>
                              )}
                              {user.tiktok_handle && (
                                <span>TT: @{user.tiktok_handle}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No user details available</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'programs' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Programs
                  </h3>
                  {programs && programs.length > 0 && (
                    <button 
                      onClick={exportProgramsToCSV}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>

                {!programs && <Loading text="Loading programs..." />}

                {programs && programs.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Programs Found
                    </h3>
                    <p className="text-gray-600">
                      This advocate hasn't participated in any programs yet.
                    </p>
                  </div>
                )}

                {programs && programs.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Campaign
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date Range
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tasks
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Engagement
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sales
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {programs.map((program: any) => (
                          <tr key={program.program_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {program.brand || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {program.program_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {program.started_at && program.completed_at ? (
                                <>
                                  {new Date(program.started_at).toLocaleDateString()} -{' '}
                                  {new Date(program.completed_at).toLocaleDateString()}
                                </>
                              ) : program.started_at ? (
                                new Date(program.started_at).toLocaleDateString()
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {program.tasks || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(program.total_engagement || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {program.has_sales ? (
                                <span className="text-green-600 font-medium">
                                  {formatCurrency(parseSales(program.total_sales), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-gray-400">No sales</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sales' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Sales History
                  </h3>
                  {sales && sales.length > 0 && (
                    <button 
                      onClick={exportSalesToCSV}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>

                {!sales && <Loading text="Loading sales history..." />}

                {sales && sales.length === 0 && (
                  <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Sales Found
                    </h3>
                    <p className="text-gray-600">
                      This advocate hasn't generated any sales yet.
                    </p>
                  </div>
                )}

                {sales && sales.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Campaign
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sales.map((sale: any) => (
                          <tr key={sale.attribution_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(sale.attributed_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {sale.brand || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {sale.program_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                              {formatCurrency(parseSales(sale.amount), { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {sale.order_id || 'N/A'}
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              <div className="text-sm text-gray-500 truncate" title={sale.user_name || 'N/A'}>
                                {sale.user_name || 'N/A'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'social' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Social Analytics
                  </h3>
                  {socialAnalytics && socialAnalytics.length > 0 && (
                    <button 
                      onClick={exportSocialToCSV}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>

                {!socialAnalytics && <Loading text="Loading social analytics..." />}

                {socialAnalytics && socialAnalytics.length === 0 && (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Analytics Found
                    </h3>
                    <p className="text-gray-600">
                      This advocate hasn't posted any content with analytics yet.
                    </p>
                  </div>
                )}

                {socialAnalytics && socialAnalytics.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Platform
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Likes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Comments
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Shares
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reach
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Engagement Score
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {socialAnalytics.map((analytics: any) => (
                          <tr key={analytics.analytics_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(analytics.measured_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {analytics.platform || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {analytics.brand || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(analytics.likes || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(analytics.comments || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(analytics.shares || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(analytics.reach || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {(analytics.engagement_score || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'issues' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Data Quality Issues
                  </h3>
                  {issues && issues.length > 0 && (
                    <button 
                      onClick={exportIssuesToCSV}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>

                {!issues && <Loading text="Loading issues..." />}

                {issues && issues.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Issues Found
                    </h3>
                    <p className="text-gray-600">
                      All data quality checks are passing for this advocate!
                    </p>
                  </div>
                )}

                {issues && issues.length > 0 && (
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
                          <tr key={issue.issue_id} className="hover:bg-gray-50">
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
                )}
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

