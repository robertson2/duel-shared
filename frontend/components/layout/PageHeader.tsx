import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backLink?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backLink,
  backLabel = 'Back',
  actions,
}) => {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            {backLink && (
              <Link
                href={backLink}
                className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {backLabel}
              </Link>
            )}
            <h1 className="text-3xl font-bold text-gray-900 truncate max-w-2xl" title={title}>{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-gray-500 truncate max-w-2xl" title={subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center space-x-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
};

