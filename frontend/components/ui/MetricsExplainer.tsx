import React from 'react';
import { Card, CardHeader } from './Card';
import { Info } from 'lucide-react';

export const MetricsExplainer: React.FC = () => {
  return (
    <Card>
      <CardHeader
        title="Understanding Your Metrics"
        subtitle="What each score measures"
      />
      <div className="px-6 pb-6 space-y-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">Engagement Score</h4>
            <p className="text-sm text-gray-600">
              Measures <strong>quality of interactions</strong>: Likes + (Comments × 2) + (Shares × 3)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Use this to identify advocates who create content that resonates with audiences.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <span className="text-lg">🚀</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">Impact Score</h4>
            <p className="text-sm text-gray-600">
              Measures <strong>total campaign impact</strong>: (Engagement Score × 0.7) + (Reach × 0.0003)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Use this to identify advocates who combine high engagement with broad distribution.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-lg">📈</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">Engagement Rate</h4>
            <p className="text-sm text-gray-600">
              Measures <strong>efficiency per view</strong>: (Total Engagements / Reach) × 100
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Use this to identify content with high conversion from views to actions.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-900">
              <strong>Pro tip:</strong> High engagement + low reach = Great content needing distribution.
              High reach + low engagement = Content needs improvement.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

