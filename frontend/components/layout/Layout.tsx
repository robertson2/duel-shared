import React from 'react';
import { Sidebar } from './Sidebar';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { data: dqSummary } = useSWR(
    'data-quality-summary',
    () => apiClient.getDataQualitySummary(),
    { refreshInterval: 60000 }
  );

  const criticalIssues = dqSummary?.critical_issues || 0;
  const highIssues = dqSummary?.high_issues || 0;
  const totalIssues = criticalIssues + highIssues;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar issuesCount={totalIssues} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

