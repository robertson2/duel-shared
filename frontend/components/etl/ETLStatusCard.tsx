import React, { useState, useEffect } from 'react';
import { Play, Clock, CheckCircle, XCircle, Loader, AlertCircle, StopCircle, AlertTriangle } from 'lucide-react';
import useSWR from 'swr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface ETLStatusCardProps {
  onETLTriggered?: () => void;
}

interface ETLSchedule {
  nextScheduledRun: string;
  lastRunTime?: string;
  lastRunStatus?: string;
  scheduleInterval: string;
  timezone: string;
  deploymentActive?: boolean;
}

interface ETLStatus {
  dag_run_id?: string;
  state?: string;
  start_date?: string;
  end_date?: string;
  execution_date?: string;
  currentTask?: string;
  progress?: number;
  orchestration_available?: boolean;
  message?: string;
}

interface PendingFiles {
  count: number;
  files: Array<{
    filename: string;
    size_mb: number;
  }>;
  total_size_mb: number;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function ETLStatusCard({ onETLTriggered }: ETLStatusCardProps) {
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');
  const [runDuration, setRunDuration] = useState<string>('');
  const [triggering, setTriggering] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch ETL schedule
  const { data: schedule, error: scheduleError } = useSWR<ETLSchedule>(
    `${API_BASE_URL}/api/v1/etl/schedule`,
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  );

  // Fetch ETL status
  const { data: status, error: statusError } = useSWR<ETLStatus>(
    `${API_BASE_URL}/api/v1/etl/status`,
    fetcher,
    { refreshInterval: 2000 } // Refresh every 2 seconds
  );

  // Fetch pending files count
  const { data: pendingFiles } = useSWR<PendingFiles>(
    `${API_BASE_URL}/api/v1/etl/pending-files`,
    fetcher,
    { refreshInterval: 5000 } // Refresh every 5 seconds
  );

  // Update countdown timer every second
  useEffect(() => {
    if (!schedule?.nextScheduledRun) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const nextRun = new Date(schedule.nextScheduledRun).getTime();
      const difference = nextRun - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeUntilNext(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeUntilNext('Running now...');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [schedule]);

  // Update run duration for running ETL
  useEffect(() => {
    if (status?.state === 'running' && status?.start_date) {
      const updateDuration = () => {
        const startTime = new Date(status.start_date!).getTime();
        const now = new Date().getTime();
        const duration = Math.floor((now - startTime) / 1000);
        
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        setRunDuration(`${mins}m ${secs}s`);
      };

      updateDuration();
      const interval = setInterval(updateDuration, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const handleTriggerETL = async () => {
    setTriggering(true);
    setTriggerResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/etl/trigger`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTriggerResult({
          success: true,
          message: data.message || 'ETL pipeline triggered successfully!',
        });
        
        // Refresh the history after triggering
        if (onETLTriggered) {
          setTimeout(() => {
            onETLTriggered();
          }, 1000); // Wait 1 second for the flow to register
        }
      } else {
        setTriggerResult({
          success: false,
          message: data.error || data.details || 'Failed to trigger ETL pipeline',
        });
      }
    } catch (error) {
      setTriggerResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to trigger ETL. Is Prefect running?',
      });
    } finally {
      setTriggering(false);
    }
  };

  const handleCancelETL = async () => {
    if (!status?.dag_run_id) return;

    setCancelling(true);
    setTriggerResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/etl/cancel/${status.dag_run_id}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTriggerResult({
          success: true,
          message: data.message || 'ETL pipeline cancelled successfully!',
        });
        
        // Refresh the history after cancelling
        if (onETLTriggered) {
          setTimeout(() => {
            onETLTriggered();
          }, 1000);
        }
      } else {
        setTriggerResult({
          success: false,
          message: data.error || 'Failed to cancel ETL pipeline',
        });
      }
    } catch (error) {
      setTriggerResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel ETL',
      });
    } finally {
      setCancelling(false);
    }
  };

  const isRunning = status?.state === 'running';
  const isQueued = status?.state === 'queued';
  const hasPendingFiles = pendingFiles && pendingFiles.count > 0;
  const canTrigger = !isRunning && !isQueued && !triggering && status?.orchestration_available !== false && hasPendingFiles;

  const getStatusBadge = (state?: string) => {
    switch (state) {
      case 'running':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Loader className="w-3 h-3 mr-1 animate-spin" />
            Running
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Queued
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Idle
          </span>
        );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-gray-600" />
          ETL Pipeline Control
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Prefect Status Warning */}
        {status?.orchestration_available === false && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Prefect Not Available</p>
              <p className="text-xs text-yellow-700 mt-1">
                Unable to connect to Prefect. Please ensure Prefect server is running.
              </p>
            </div>
          </div>
        )}

        {/* Current Status Section */}
        {isRunning && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Loader className="w-5 h-5 text-blue-600 mr-2 animate-spin" />
                <span className="text-sm font-semibold text-blue-900">ETL Pipeline Running</span>
              </div>
              {getStatusBadge(status?.state)}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Duration:</span>
                <span className="font-mono text-blue-900">{runDuration}</span>
              </div>
              
              {status?.currentTask && (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Current Task:</span>
                  <span className="font-medium text-blue-900">{status.currentTask}</span>
                </div>
              )}

              {/* Progress Bar */}
              {status?.progress !== undefined && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-blue-700 mb-1">
                    <span>Progress</span>
                    <span>{status.progress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${status.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deployment Not Active Warning */}
        {schedule && schedule.deploymentActive === false && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-orange-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-orange-900 mb-1">
                  ⚠️ Scheduled ETL Not Running
                </h4>
                <p className="text-xs text-orange-800 mb-2">
                  The ETL deployment is not active. Scheduled runs every 60 minutes will not execute automatically.
                </p>
                <p className="text-xs text-orange-700 mb-2">
                  <strong>To enable automatic runs:</strong>
                </p>
                <div className="bg-orange-100 rounded px-3 py-2 text-xs font-mono text-orange-900">
                  scripts\deploy-prefect.bat
                </div>
                <p className="text-xs text-orange-700 mt-2">
                  Keep the deployment script running to enable scheduled ETL runs. You can still trigger runs manually below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Files Counter */}
        {pendingFiles && pendingFiles.count > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {pendingFiles.count} file{pendingFiles.count !== 1 ? 's' : ''} waiting to be processed
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Total size: {pendingFiles.total_size_mb} MB
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Schedule Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Clock className="w-4 h-4 text-gray-600 mr-2" />
              <p className="text-xs font-medium text-gray-600 uppercase">Next Scheduled Run</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{timeUntilNext || 'Loading...'}</p>
            <p className="text-xs text-gray-500 mt-1">Runs every 60 minutes</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <CheckCircle className="w-4 h-4 text-gray-600 mr-2" />
              <p className="text-xs font-medium text-gray-600 uppercase">Last Run</p>
            </div>
            {schedule?.lastRunTime ? (
              <>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(schedule.lastRunTime)}
                </p>
                <div className="mt-2">
                  {getStatusBadge(schedule.lastRunStatus)}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">No runs yet</p>
            )}
          </div>
        </div>

        {/* Trigger/Cancel Buttons */}
        <div className="space-y-3">
          {isRunning || isQueued ? (
            <>
              <button
                onClick={handleCancelETL}
                disabled={cancelling}
                className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all ${
                  cancelling
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg'
                }`}
              >
                {cancelling ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <StopCircle className="w-5 h-5 mr-2" />
                    Cancel ETL Run
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center">
                ETL is currently {isRunning ? 'running' : 'queued'}. Click to cancel.
              </p>
            </>
          ) : (
            <>
              <button
                onClick={handleTriggerETL}
                disabled={!canTrigger}
                className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all ${
                  canTrigger
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {triggering ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Triggering...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Trigger ETL Now
                  </>
                )}
              </button>
              
              {!canTrigger && !triggering && (
                <p className="text-xs text-gray-500 text-center">
                  {status?.orchestration_available === false
                    ? 'Prefect is not available'
                    : !hasPendingFiles
                    ? 'No files to process'
                    : 'Unable to trigger ETL'}
                </p>
              )}
            </>
          )}
        </div>

        {/* Trigger Result */}
        {triggerResult && (
          <div
            className={`rounded-lg p-4 flex items-start ${
              triggerResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {triggerResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={`text-sm ${
                triggerResult.success ? 'text-green-900' : 'text-red-900'
              }`}
            >
              {triggerResult.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


