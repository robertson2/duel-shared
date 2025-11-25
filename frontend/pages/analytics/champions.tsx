import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import useSWR from 'swr';
import { apiClient, parseSales } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/layout/PageHeader';
import { Trophy, DollarSign, TrendingUp, Target, Settings } from 'lucide-react';
import { useChampionSettings } from '@/hooks/useChampionSettings';
import { useCurrency } from '@/contexts/CurrencyContext';

type ChampionType = 'overall' | 'sales' | 'engagement' | 'balanced';

export default function ChampionsPage() {
  const [championType, setChampionType] = useState<ChampionType>('overall');
  const { settings, isLoaded } = useChampionSettings();
  const { formatCurrency } = useCurrency();

  // Build settings params based on champion type
  const getSettingsParams = () => {
    const params: Record<string, number> = {};
    
    if (championType === 'overall') {
      params.engagement_weight = settings.overall.engagementWeight;
      params.sales_weight = settings.overall.salesWeight;
      params.conversion_weight = settings.overall.conversionWeight;
    } else if (championType === 'sales') {
      params.min_sales = settings.sales.minSales;
    } else if (championType === 'engagement') {
      params.min_engagement = settings.engagement.minEngagement;
      params.high_potential_eng = settings.engagement.highPotentialEngagement;
      params.high_potential_sales = settings.engagement.highPotentialMaxSales;
      params.med_potential_eng = settings.engagement.mediumPotentialEngagement;
      params.med_potential_sales = settings.engagement.mediumPotentialMaxSales;
    } else if (championType === 'balanced') {
      params.balanced_min_eng = settings.balanced.minEngagement;
      params.balanced_min_sales = settings.balanced.minSales;
      params.eng_normalizer = settings.balanced.engagementNormalizer;
      params.sales_normalizer = settings.balanced.salesNormalizer;
    }
    
    return params;
  };

  // Fetch champions using the dedicated champions endpoint with settings
  const { data: champions, error, isLoading } = useSWR(
    isLoaded ? ['champions', championType, settings] : null,
    () => apiClient.getChampions(championType, 50, getSettingsParams()),
    { refreshInterval: 30000 }
  );

  const tabs = [
    { id: 'overall' as ChampionType, label: 'Overall Champions', icon: Trophy },
    { id: 'sales' as ChampionType, label: 'Sales Champions', icon: DollarSign },
    { id: 'engagement' as ChampionType, label: 'Engagement Champions', icon: TrendingUp },
    { id: 'balanced' as ChampionType, label: 'Balanced Performers', icon: Target },
  ];

  return (
    <>
      <Head>
        <title>Champion Advocates - Analytics</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Champion Advocates"
          subtitle="Your top performing advocate accounts"
          backLink="/analytics"
          backLabel="Back to Analytics"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setChampionType(tab.id)}
                      className={`
                        flex items-center py-4 px-1 border-b-2 font-medium text-sm
                        ${
                          championType === tab.id
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Info Cards */}
          {championType === 'overall' && champions && champions.length > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-900 flex items-center">
                  <Trophy className="w-4 h-4 mr-2" />
                  Champion Score Explained
                </h3>
                <Link
                  href="/analytics/settings?tab=champions"
                  className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Settings className="w-3 h-3 mr-1.5" />
                  Configure
                </Link>
              </div>
              
              <div className="mb-3">
                <p className="text-xs text-blue-700 mb-2">
                  The <strong>Champion Score</strong> is a weighted metric combining three key performance areas:
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="font-semibold text-gray-900">
                      {(settings.overall.engagementWeight * 100).toFixed(0)}% Engagement
                    </div>
                    <div className="text-gray-600">Social media activity</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="font-semibold text-gray-900">
                      {(settings.overall.salesWeight * 100).toFixed(0)}% Sales
                    </div>
                    <div className="text-gray-600">Revenue generated</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="font-semibold text-gray-900">
                      {(settings.overall.conversionWeight * 100).toFixed(0)}% Program Conv.
                    </div>
                    <div className="text-gray-600">Program success rate</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-blue-200 pt-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">Why This Metric Matters:</p>
                <ul className="text-xs text-blue-700 space-y-1.5">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Holistic Performance:</strong> Identifies advocates who excel across multiple dimensions, not just one metric</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Strategic Recognition:</strong> Use for ambassador programs, case studies, and premium rewards</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Balanced Growth:</strong> Prevents over-focusing on sales alone while ignoring brand awareness value</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Fair Comparison:</strong> Accounts with high engagement but lower sales still get recognized for their influence</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {championType === 'sales' && champions && champions.length > 0 && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-green-900 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Sales Champions Explained
                </h3>
                <Link
                  href="/analytics/settings?tab=champions"
                  className="flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Settings className="w-3 h-3 mr-1.5" />
                  Configure
                </Link>
              </div>
              
              <div className="mb-3">
                <p className="text-xs text-green-700 mb-2">
                  <strong>Sales Champions</strong> are ranked by total revenue generated. Key metrics include:
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="font-semibold text-gray-900">Total Sales</div>
                    <div className="text-gray-600">Total revenue generated</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="font-semibold text-gray-900">Sales/Program</div>
                    <div className="text-gray-600">Revenue efficiency</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="font-semibold text-gray-900">Conv. Rate</div>
                    <div className="text-gray-600">Program success rate</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-green-200 pt-3">
                <p className="text-xs font-semibold text-green-900 mb-2">Why This Metric Matters:</p>
                <ul className="text-xs text-green-700 space-y-1.5">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span><strong>Direct ROI:</strong> Identifies advocates who generate the most revenue for your business</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span><strong>Performance Bonuses:</strong> Use for commission structures and sales-based incentive programs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span><strong>High-Value Relationships:</strong> Prioritize support and exclusive opportunities for top converters</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span><strong>Best Practices:</strong> Study their approach to replicate success with other advocates</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {championType === 'balanced' && champions && champions.length > 0 && (
            <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-purple-900 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Balanced Performers Explained
                </h3>
                <Link
                  href="/analytics/settings?tab=champions"
                  className="flex items-center px-3 py-1.5 text-xs font-medium text-purple-700 bg-white border border-purple-300 rounded-md hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <Settings className="w-3 h-3 mr-1.5" />
                  Configure
                </Link>
              </div>
              
              <div className="mb-3">
                <p className="text-xs text-purple-700 mb-2">
                  <strong>Balanced Performers</strong> excel at both engagement and sales. Balance Score measures the minimum of normalized performance - both dimensions must be strong.
                </p>
                <div className="bg-white border border-gray-200 rounded p-2 text-xs mb-3">
                  <div className="font-semibold text-gray-900 mb-1">Requirements:</div>
                  <div className="text-gray-600 space-y-1">
                    <div>• Engagement Score ≥ {settings.balanced.minEngagement}</div>
                    <div>• Total Sales ≥ ${settings.balanced.minSales}</div>
                    <div>• Ranked by: min(engagement/{settings.balanced.engagementNormalizer.toLocaleString()}, sales/{settings.balanced.salesNormalizer.toLocaleString()})</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-purple-200 pt-3">
                <p className="text-xs font-semibold text-purple-900 mb-2">Why This Metric Matters:</p>
                <ul className="text-xs text-purple-700 space-y-1.5">
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    <span><strong>Well-Rounded Excellence:</strong> Identifies advocates who are great at building awareness AND driving sales</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    <span><strong>Ambassador Programs:</strong> Perfect candidates for leadership roles and mentorship positions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    <span><strong>Sustainable Growth:</strong> These advocates deliver consistent value across all program goals</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    <span><strong>Case Studies:</strong> Their balanced approach makes them ideal for showcasing program success</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {championType === 'engagement' && champions && champions.length > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-amber-900 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Engagement Champions Explained
                </h3>
                <Link
                  href="/analytics/settings?tab=champions"
                  className="flex items-center px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-md hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  <Settings className="w-3 h-3 mr-1.5" />
                  Configure
                </Link>
              </div>
              
              <div className="mb-3">
                <p className="text-xs text-amber-700 mb-2">
                  <strong>Engagement Champions</strong> generate high social media activity (≥{settings.engagement.minEngagement} engagement score). Look for opportunity flags to identify optimization potential:
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="font-semibold text-yellow-800">High Potential</div>
                    <div className="text-gray-600">
                      &gt;{settings.engagement.highPotentialEngagement} eng, &lt;${settings.engagement.highPotentialMaxSales.toLocaleString()} sales
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="font-semibold text-blue-800">Medium Potential</div>
                    <div className="text-gray-600">
                      &gt;{settings.engagement.mediumPotentialEngagement} eng, &lt;${settings.engagement.mediumPotentialMaxSales.toLocaleString()} sales
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="font-semibold text-green-800">Engaged</div>
                    <div className="text-gray-600">Good balance</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-amber-200 pt-3">
                <p className="text-xs font-semibold text-amber-900 mb-2">Why This Metric Matters:</p>
                <ul className="text-xs text-amber-700 space-y-1.5">
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-2">•</span>
                    <span><strong>Brand Awareness:</strong> These advocates drive reach, impressions, and social proof for your brand</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-2">•</span>
                    <span><strong>Coaching Opportunities:</strong> High engagement with low sales signals untapped conversion potential</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-2">•</span>
                    <span><strong>Content Optimization:</strong> Teach them better CTAs and sales techniques to improve conversion</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-500 mr-2">•</span>
                    <span><strong>Audience Building:</strong> Their influence creates the foundation for future sales growth</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <Card>
            <div className="px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {tabs.find(t => t.id === championType)?.label || 'Champions'}
                </h2>
                <p className="text-sm text-gray-600">
                  Top {champions?.length || 0} performing accounts
                </p>
              </div>
            </div>

            {isLoading && <Loading text="Loading champions..." />}

            {error && (
              <div className="p-6 text-center text-red-600">
                Error loading champions. Please try again.
              </div>
            )}

            {champions && champions.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No champions found for the selected criteria.
              </div>
            )}

            {champions && champions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      {championType === 'overall' && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Champion Score
                        </th>
                      )}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Engagement
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sales
                      </th>
                      {championType === 'sales' && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sales/Program
                        </th>
                      )}
                      {championType === 'engagement' && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Opportunity
                        </th>
                      )}
                      {championType === 'balanced' && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Balance Score
                        </th>
                      )}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Programs
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conv. Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {champions.map((champion, index) => (
                      <tr key={champion.account_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index < 3 && (
                              <Trophy className={`w-4 h-4 mr-2 ${
                                index === 0 ? 'text-yellow-400' :
                                index === 1 ? 'text-gray-400' :
                                'text-amber-600'
                              }`} />
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              #{index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="text-sm font-medium text-gray-900 truncate" title={champion.user_names || 'Anonymous'}>
                            {champion.user_names || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-500 truncate" title={champion.email}>
                            {champion.email}
                          </div>
                        </td>
                        {championType === 'overall' && (
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-bold text-primary-600">
                              {champion.champion_score?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
                            </div>
                            <div className="text-xs text-gray-500">
                              Efficiency: {champion.efficiency_score?.toFixed(4) || '0.0000'}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {champion.total_engagement_score?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                          {formatCurrency(parseSales(champion.total_sales), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {championType === 'sales' && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {formatCurrency(champion.sales_per_program || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        )}
                        {championType === 'engagement' && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              champion.opportunity_flag === 'High Potential - Needs Sales Optimization' ? 'bg-yellow-100 text-yellow-800' :
                              champion.opportunity_flag === 'Medium Potential - Could Improve' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {champion.opportunity_flag || 'Engaged'}
                            </span>
                          </td>
                        )}
                        {championType === 'balanced' && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-primary-600">
                            {champion.balance_score?.toFixed(2) || '0.00'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {champion.total_programs || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {champion.program_conversion_rate ? `${champion.program_conversion_rate.toFixed(1)}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

