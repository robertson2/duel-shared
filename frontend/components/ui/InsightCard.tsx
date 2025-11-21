import React from 'react';
import { Card } from './Card';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface InsightCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  iconColor = 'text-primary-600',
  onClick,
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Card
      className={clsx(
        'hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          {Icon && <Icon className={clsx('w-5 h-5', iconColor)} />}
        </div>
        
        <div className="mb-2">
          <div className="text-3xl font-bold text-gray-900 truncate">{value}</div>
        </div>

        {(subtitle || trend) && (
          <div className="flex items-center justify-between gap-2">
            {subtitle && (
              <p className="text-sm text-gray-500 truncate flex-1 min-w-0">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div
                className={clsx(
                  'flex items-center text-sm font-medium',
                  trend === 'up' && 'text-green-600',
                  trend === 'down' && 'text-red-600',
                  trend === 'neutral' && 'text-gray-600'
                )}
              >
                <TrendIcon className="w-4 h-4 mr-1" />
                {trendValue}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

