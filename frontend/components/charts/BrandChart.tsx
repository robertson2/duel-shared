import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import { BrandPerformance } from '@/lib/api';
import { BarChart3 } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface BrandChartProps {
  data: BrandPerformance[];
  limit?: number;
}

export const BrandChart: React.FC<BrandChartProps> = ({ data, limit = 10 }) => {
  const { formatCurrency, getCurrencySymbol } = useCurrency();
  
  const chartData = data
    .filter((item) => item.brand && item.brand !== 'Unknown')
    .slice(0, limit)
    .map((item) => ({
      brand: item.brand,
      fullBrand: item.brand,
      sales: Number(item.total_sales || 0),
      engagement: Number(item.avg_engagement_score || 0),
      impact: Number(item.avg_impact_score || 0),
      engagementRate: Number(item.avg_engagement_rate || 0),
      advocates: item.total_advocates || 0,
    }))
    .sort((a, b) => b.sales - a.sales); // Sort by sales descending (highest at top)

  const COLORS = [
    '#0ea5e9',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#a855f7',
    '#d946ef',
    '#ec4899',
    '#f43f5e',
    '#ef4444',
    '#f97316',
  ];

  // Show empty state if no data
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader
          title="Top Brands"
          subtitle="Sales and engagement performance by brand"
        />
        <div className="p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Brand Data Available
          </h3>
          <p className="text-gray-600">
            Brand performance will appear here once you import advocate data.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={`Top ${limit} Brands`}
        subtitle="Sales and engagement performance by brand"
      />
      <ResponsiveContainer width="100%" height={450}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            tickFormatter={(value) => formatCurrency(value, { minimumFractionDigits: 0 })}
          />
          <YAxis 
            dataKey="brand" 
            type="category" 
            width={120}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              padding: '12px',
            }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-md shadow-lg p-3">
                    <p className="font-semibold text-gray-900 mb-2">
                      {data.fullBrand || label}
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Total Sales:</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(data.sales, { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Avg Engagement:</span>
                        <span className="font-medium text-gray-900">
                          {Math.round(data.engagement)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Avg Impact:</span>
                        <span className="font-medium text-gray-900">
                          {Math.round(data.impact)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Engagement Rate:</span>
                        <span className="font-medium text-gray-900">
                          {Math.round(data.engagementRate)}%
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Total Advocates:</span>
                        <span className="font-medium text-gray-900">
                          {data.advocates.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="sales" name="sales">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 px-6 pb-4">
        <p className="text-xs text-gray-500 italic">
          💡 Hover over bars to see detailed metrics including engagement score and impact score
        </p>
      </div>
    </Card>
  );
};

