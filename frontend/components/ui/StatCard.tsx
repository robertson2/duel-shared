import React from 'react';
import { Card } from './Card';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-primary-500',
  loading = false,
}) => {
  return (
    <Card className="animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
          {loading ? (
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          )}
          {change !== undefined && !loading && (
            <div className="flex items-center mt-2">
              <span
                className={clsx(
                  'text-sm font-medium',
                  change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
                )}
              >
                {change > 0 && '+'}
                {change}%
              </span>
              {changeLabel && <span className="text-sm text-gray-500 ml-2">{changeLabel}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('p-3 rounded-full bg-gray-50', iconColor)}>
            <Icon className="w-8 h-8" />
          </div>
        )}
      </div>
    </Card>
  );
};

