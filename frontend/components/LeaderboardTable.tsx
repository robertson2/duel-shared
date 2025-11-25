import React from 'react';
import { Card, CardHeader } from './ui/Card';
import { Trophy, Medal, Award } from 'lucide-react';
import clsx from 'clsx';
import { useCurrency } from '@/contexts/CurrencyContext';
import { parseSales } from '@/lib/api';

interface LeaderboardItem {
  account_id: string;
  email: string;
  total_users: number;
  user_names: string | null;
  total_engagement_score?: number | null;
  total_impact_score?: number | null;
  avg_engagement_rate?: number | null;
  total_sales?: number | string | null;
  programs_with_sales?: number | null;
  program_conversion_rate?: number | null;
  total_programs?: number | null;
  total_tasks?: number | null;
}

interface LeaderboardTableProps {
  data: LeaderboardItem[];
  metric?: 'engagement' | 'sales';
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  data,
  metric = 'engagement',
}) => {
  const { formatCurrency } = useCurrency();
  
  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-medium text-gray-500">#{index + 1}</span>;
  };

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Show empty state if no data
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader
          title="Advocate Leaderboard"
          subtitle={`Ranked by ${metric === 'sales' ? 'total sales' : 'engagement score'}`}
        />
        <div className="p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Advocates Yet
          </h3>
          <p className="text-gray-600">
            Start importing advocate data to see your leaderboard here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={`Top ${data.length} Advocate Accounts`}
        subtitle={`Ranked by ${metric === 'sales' ? 'total sales' : 'engagement score'}`}
      />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex flex-col items-end">
                  <span>Engagement</span>
                  <span className="text-[10px] font-normal text-gray-400 normal-case">Quality</span>
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex flex-col items-end">
                  <span>Impact</span>
                  <span className="text-[10px] font-normal text-gray-400 normal-case">Total Effect</span>
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex flex-col items-end">
                  <span>Eng. Rate</span>
                  <span className="text-[10px] font-normal text-gray-400 normal-case">Efficiency</span>
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sales
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Programs
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr
                key={item.account_id}
                className={clsx(
                  'hover:bg-gray-50 transition-colors',
                  index < 3 && 'bg-blue-50/30'
                )}
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(index)}
                  </div>
                </td>
                <td className="px-4 py-4 max-w-xs">
                  <div className="text-sm font-medium text-gray-900 truncate" title={item.user_names || 'Anonymous'}>
                    {item.user_names || 'Anonymous'}
                  </div>
                  <div className="text-sm text-gray-500 truncate" title={item.email}>
                    {item.email}
                  </div>
                  {item.total_users > 1 && (
                    <div className="text-xs text-blue-600 mt-1">
                      {item.total_users} users
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                  <div className="font-medium text-green-600">
                    {formatNumber(item.total_engagement_score ?? 0)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                  <div className="font-medium text-purple-600">
                    {item.total_impact_score 
                      ? formatNumber(Math.round(item.total_impact_score))
                      : '0'}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                  <div className="font-medium text-blue-600">
                    {item.avg_engagement_rate 
                      ? `${Math.round(item.avg_engagement_rate)}%`
                      : 'N/A'}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                  {formatCurrency(parseSales(item.total_sales || null), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                  {item.total_programs || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

