import React, { forwardRef, useImperativeHandle } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Loader, Calendar, ExternalLink } from 'lucide-react';
import useSWR from 'swr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const PREFECT_DASHBOARD_URL = process.env.NEXT_PUBLIC_PREFECT_DASHBOARD_URL || 'http://localhost:4200';

interface ETLRun {
  dag_run_id: string;
  state: string;
  execution_date: string;
  start_date?: string;
  end_date?: string;
  duration_seconds?: number;
  run_type: string;
}

interface ETLHistory {
  runs: ETLRun[];
  total: number;
  orchestration_available: boolean;
  message?: string;
}

export interface ETLRunHistoryRef {
  refresh: () => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export const ETLRunHistory = forwardRef<ETLRunHistoryRef>((props, ref) => {
  const { data: history, error, isLoading, mutate } = useSWR<ETLHistory>(
    `${API_BASE_URL}/api/v1/etl/history?limit=5`,
    fetcher,
    { refreshInterval: 10000 } // Refresh every 10 seconds
  );

  // Expose refresh method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: () => {
      mutate();
    }
  }));

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'queued':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (state: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium";
    
    switch (state) {
      case 'success':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'running':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'queued':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getRunTypeBadge = (runType: string) => {
    if (runType === 'manual') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
          Manual
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
        Scheduled
      </span>
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Show relative time for recent runs
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    // Otherwise show formatted date
    return date.toLocaleString();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-gray-600" />
              ETL Run History
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Last 5 pipeline executions
            </p>
          </div>
          <div className="flex items-center gap-4">
            {history && history.total > 0 && (
              <div className="text-sm text-gray-500">
                {history.total} run{history.total !== 1 ? 's' : ''}
              </div>
            )}
            <a
              href={PREFECT_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
            >
              <span className="mr-1">Open Prefect Dashboard</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
        {history && !history.orchestration_available && history.runs.length > 0 && (
          <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800">
              ℹ️ {history.message || 'Showing data from database'}
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading run history...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">Unable to load run history</p>
            <p className="text-sm text-gray-600">
              {history?.message || 'An error occurred loading history'}
            </p>
          </div>
        ) : history.runs.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No ETL runs yet</p>
            <p className="text-sm text-gray-500 mt-1">Trigger a manual run or wait for the scheduled execution</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Run ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.runs.map((run) => (
                <tr key={run.dag_run_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(run.state)}
                      <span className={`ml-2 ${getStatusBadge(run.state)}`}>
                        {run.state.charAt(0).toUpperCase() + run.state.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">
                      {run.dag_run_id.split('_').slice(-2).join('_')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRunTypeBadge(run.run_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(run.execution_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatDuration(run.duration_seconds)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});

ETLRunHistory.displayName = 'ETLRunHistory';


