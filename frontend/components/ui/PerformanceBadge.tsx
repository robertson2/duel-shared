import React from 'react';
import clsx from 'clsx';
import { Crown, Medal, Award, Star } from 'lucide-react';

export type TierType = 'platinum' | 'gold' | 'silver' | 'bronze' | 'starter';

interface PerformanceBadgeProps {
  tier: TierType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({
  tier,
  size = 'md',
  showIcon = true,
}) => {
  const config = {
    platinum: {
      label: 'Platinum',
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: Crown,
    },
    gold: {
      label: 'Gold',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: Medal,
    },
    silver: {
      label: 'Silver',
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: Award,
    },
    bronze: {
      label: 'Bronze',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: Star,
    },
    starter: {
      label: 'Starter',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Star,
    },
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const { label, color, icon: Icon } = config[tier];

  return (
    <span
      className={clsx(
        'inline-flex items-center font-semibold rounded-full border',
        color,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon className={clsx(iconSizes[size], 'mr-1')} />}
      {label}
    </span>
  );
};

