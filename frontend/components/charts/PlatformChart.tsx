import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import { PlatformPerformance } from '@/lib/api';
import { BarChart3 } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface PlatformChartProps {
  data: PlatformPerformance[];
}

export const PlatformChart: React.FC<PlatformChartProps> = ({ data }) => {
  const { formatCurrency } = useCurrency();
  
  const chartData = data.map((item) => ({
    platform: item.platform,
    sales: Number(item.total_sales || 0),
    engagement: Number(item.avg_engagement_score || 0),
    impact: Number(item.avg_impact_score || 0),
    engagementRate: Number(item.avg_engagement_rate || 0),
    tasks: item.total_tasks || 0,
  }));

  // Show empty state if no data
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader
          title="Platform Performance"
          subtitle="Sales, engagement, and impact metrics by platform"
        />
        <div className="p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Platform Data Available
          </h3>
          <p className="text-gray-600">
            Platform performance metrics will appear here once you import advocate data.
          </p>
        </div>
      </Card>
    );
  }

  // Format currency values in compact format (e.g., £8M)
  const formatCompactCurrency = (value: number): string => {
    if (value >= 1000000) {
      const millions = value / 1000000;
      // Show 1 decimal place if needed, otherwise whole number
      const formatted = millions % 1 === 0 ? millions.toString() : millions.toFixed(1);
      return `£${formatted}M`;
    } else if (value >= 1000) {
      const thousands = value / 1000;
      const formatted = thousands % 1 === 0 ? thousands.toString() : thousands.toFixed(1);
      return `£${formatted}K`;
    }
    return `£${value}`;
  };

  return (
    <Card>
      <CardHeader
        title="Platform Performance"
        subtitle="Sales, engagement, and impact metrics by platform"
      />
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="platform" 
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="left" 
            tick={{ fontSize: 16 }}
            tickFormatter={formatCompactCurrency}
          />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'Engagement Rate (%)') {
                return [`${Math.round(value)}%`, name];
              }
              if (name === 'Total Sales ($)') {
                return [formatCurrency(value, { minimumFractionDigits: 0 }), name];
              }
              if (name === 'Avg Engagement Score' || name === 'Avg Impact Score') {
                return [Math.round(value).toString(), name];
              }
              return [value.toFixed(1), name];
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="sales" fill="#0ea5e9" name="Total Sales ($)" />
          <Bar
            yAxisId="right"
            dataKey="engagement"
            fill="#10b981"
            name="Avg Engagement Score"
          />
          <Bar
            yAxisId="right"
            dataKey="impact"
            fill="#8b5cf6"
            name="Avg Impact Score"
          />
        </BarChart>
      </ResponsiveContainer>

    </Card>
  );
};

