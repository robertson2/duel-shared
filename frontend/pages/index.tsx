import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { Loading, LoadingCard } from '@/components/ui/Loading';
import { PlatformChart } from '@/components/charts/PlatformChart';
import { BrandChart } from '@/components/charts/BrandChart';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { InsightCard } from '@/components/ui/InsightCard';
import {
  Users,
  TrendingUp,
  Target,
  AlertCircle,
  Trophy,
  Zap,
  Award,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { MetricsExplainer } from '@/components/ui/MetricsExplainer';
import Link from 'next/link';
import { useCurrency } from '@/contexts/CurrencyContext';


// Currency icon component that displays £ or $ based on currency
const CurrencyIcon: React.FC<{ className?: string }> = ({ className }) => {
  const { currency } = useCurrency();
  const symbol = currency === 'GBP' ? '£' : '$';
  return (
    <span 
      className={className} 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontWeight: 'bold',
        fontSize: '2rem'
      }}
    >
      {symbol}
    </span>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  
  const { data: dashboardStats, error: dashboardError } = useSWR(
    'dashboard-stats',
    () => apiClient.getDashboardStats(),
    { refreshInterval: 30000 }
  );

  const { data: salesSummary, error: salesError } = useSWR(
    'sales-summary',
    () => apiClient.getSalesSummary(),
    { refreshInterval: 30000 }
  );

  const { data: topAccounts, error: accountsError } = useSWR(
    'top-accounts',
    () => apiClient.getTopAccounts('engagement', 20),
    { refreshInterval: 30000 }
  );

  const { data: platformData, error: platformError } = useSWR(
    'platform-performance',
    () => apiClient.getPlatformPerformance(),
    { refreshInterval: 30000 }
  );

  const { data: brandData, error: brandError } = useSWR(
    'brand-performance',
    () => apiClient.getBrandPerformance(15),
    { refreshInterval: 30000 }
  );

  const { data: dqSummary, error: dqError } = useSWR(
    'data-quality-summary',
    () => apiClient.getDataQualitySummary(),
    { refreshInterval: 60000 }
  );

  // Calculate aggregate KPIs from comprehensive dashboard stats
  const totalAccounts = dashboardStats?.total_advocate_accounts || 0;
  const totalRevenue = dashboardStats?.total_revenue || 0;
  const avgSaleValue = dashboardStats?.avg_sale_amount || 0;
  const conversionRate = dashboardStats?.program_conversion_rate_pct || 0;

  // Calculate highest engagement account
  const highestEngagementAccount = topAccounts && topAccounts.length > 0
    ? topAccounts.reduce((max, a) => 
        (a.total_engagement_score || 0) > (max.total_engagement_score || 0) ? a : max, 
        topAccounts[0]
      )
    : null;

  const isLoading =
    !dashboardStats && !salesSummary && !topAccounts && !platformData && !brandData && !dqSummary;
  const hasError = dashboardError || salesError || accountsError || platformError || brandError || dqError;

  // Handle error state
  if (hasError) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <div className="text-center p-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Error
            </h2>
            <p className="text-gray-600">
              Unable to connect to the API. Please ensure the backend server is running on{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">
                http://127.0.0.1:8000
              </code>
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </Card>
      </main>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </main>
    );
  }

  // Main dashboard render
  return (
    <>
      <Head>
        <title>Advocacy Platform Dashboard</title>
        <meta name="description" content="Analytics dashboard for advocacy platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Monitor advocate performance and platform metrics in real-time
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue, { minimumFractionDigits: 0 })}
              icon={CurrencyIcon}
              iconColor="text-green-500"
              loading={!dashboardStats}
            />
            <StatCard
              title="Advocate Accounts"
              value={totalAccounts.toLocaleString()}
              icon={Users}
              iconColor="text-blue-500"
              loading={!dashboardStats}
            />
            <StatCard
              title="Avg Sale Value"
              value={formatCurrency(avgSaleValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              icon={TrendingUp}
              iconColor="text-purple-500"
              loading={!dashboardStats}
            />
            <StatCard
              title="Program Conv. Rate"
              value={`${Math.round(conversionRate)}%`}
              subtitle="Programs with sales"
              icon={Target}
              iconColor="text-orange-500"
              loading={!dashboardStats}
            />
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <InsightCard
              title="Top Performer"
              value={
                topAccounts === undefined 
                  ? 'Loading...' 
                  : topAccounts[0]?.email || 'No data'
              }
              subtitle={topAccounts?.[0]?.user_names || ''}
              trend="up"
              trendValue={formatCurrency(topAccounts?.[0]?.total_sales || 0, { minimumFractionDigits: 0 })}
              icon={Trophy}
              iconColor="text-yellow-500"
              onClick={() => {
                if (topAccounts?.[0]) {
                  router.push(`/advocates/${topAccounts[0].account_id}`);
                }
              }}
            />
            <InsightCard
              title="Highest Engagement"
              value={
                topAccounts === undefined
                  ? 'Loading...'
                  : highestEngagementAccount?.email || 'No data'
              }
              subtitle={highestEngagementAccount?.user_names || ''}
              trend="up"
              trendValue={highestEngagementAccount?.total_engagement_score?.toLocaleString() || '0'}
              icon={Zap}
              iconColor="text-blue-500"
              onClick={() => {
                if (highestEngagementAccount) {
                  router.push(`/advocates/${highestEngagementAccount.account_id}`);
                }
              }}
            />
            <InsightCard
              title="Total Programs"
              value={dashboardStats?.total_programs?.toLocaleString() || '0'}
              subtitle="Active campaigns"
              icon={Award}
              iconColor="text-purple-500"
              loading={!dashboardStats}
            />
          </div>

          {/* Charts and Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Platform Performance Chart */}
            <div className="lg:col-span-2">
              {platformData ? (
                <PlatformChart data={platformData} />
              ) : (
                <LoadingCard />
              )}
            </div>

            {/* Brand Performance Chart */}
            <div className="lg:col-span-2">
              {brandData ? (
                <BrandChart data={brandData} limit={10} />
              ) : (
                <LoadingCard />
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="mb-8">
            {topAccounts ? (
              <LeaderboardTable data={topAccounts} metric="engagement" />
            ) : (
              <LoadingCard />
            )}
          </div>

          {/* Metrics Explainer */}
          <div className="mb-8">
            <MetricsExplainer />
          </div>

          {/* Data Quality Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader title="Data Quality" subtitle="System health metrics" />
              {dqSummary ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Issues</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {dqSummary.total_issues?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Critical</span>
                    <span className="text-lg font-semibold text-red-600">
                      {dqSummary.critical_issues || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">High</span>
                    <span className="text-lg font-semibold text-orange-600">
                      {dqSummary.high_issues || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Resolution Rate</span>
                    <span className="text-lg font-semibold text-green-600">
                      {dqSummary.resolution_rate || 0}%
                    </span>
                  </div>
                </div>
              ) : (
                <Loading size="sm" />
              )}
            </Card>

            <Card>
              <CardHeader title="Platform Stats" subtitle="Overall metrics" />
              {dashboardStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Programs with Sales</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {dashboardStats.programs_with_sales?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Min Sale</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(dashboardStats.min_sale || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Max Sale</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(dashboardStats.max_sale || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Median Sale</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(dashboardStats.median_sale || 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <Loading size="sm" />
              )}
            </Card>

            <Card>
              <CardHeader title="Quick Actions" subtitle="Manage your platform" />
              <div className="flex flex-col gap-4">
                <Link href="/advocates">
                  <button className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
                    View All Advocates
                  </button>
                </Link>
                <Link href="/brands">
                  <button className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                    View Brands
                  </button>
                </Link>
                <Link href="/data-quality">
                  <button className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                    Data Quality
                  </button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

