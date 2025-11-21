import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { 
  Target, 
  Users2, 
  TrendingUp, 
  Scan,
  ChevronRight 
} from 'lucide-react';

interface AnalyticsCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}

export default function AnalyticsPage() {
  const categories: AnalyticsCategory[] = [
    {
      id: 'champions',
      title: 'Champion Advocates',
      description: 'Identify top performers across all metrics, high-value converters, and engagement champions',
      icon: Target,
      href: '/analytics/champions',
      color: 'text-yellow-500',
    },
    {
      id: 'segments',
      title: 'Advocate Segments',
      description: 'View performance tiers, activity levels, and conversion efficiency groups',
      icon: Users2,
      href: '/analytics/segments',
      color: 'text-blue-500',
    },
    {
      id: 'outliers',
      title: 'Pattern Detection',
      description: 'Discover sales outliers, engagement anomalies, and unusual conversion patterns',
      icon: TrendingUp,
      href: '/analytics/outliers',
      color: 'text-purple-500',
    },
    {
      id: 'platform-fit',
      title: 'Platform-Brand Fit',
      description: 'Analyze which platforms work best for specific brands',
      icon: Scan,
      href: '/analytics/platform-fit',
      color: 'text-green-500',
    },
  ];

  return (
    <>
      <Head>
        <title>Analytics Hub - Advocacy Platform</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Analytics Hub"
          subtitle="Advanced insights and pattern detection"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link key={category.id} href={category.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className={`p-3 rounded-lg bg-gray-50`}>
                            <Icon className={`w-6 h-6 ${category.color}`} />
                          </div>
                          <h3 className="ml-4 text-lg font-semibold text-gray-900">
                            {category.title}
                          </h3>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600">
                        {category.description}
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="mt-8">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Insights
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Available Analytics Queries</span>
                    <span className="font-semibold text-gray-900">15+</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Data Refresh Rate</span>
                    <span className="font-semibold text-gray-900">30 seconds</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Advanced Segmentation</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

