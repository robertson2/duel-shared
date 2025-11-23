import React, { useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Upload, CheckCircle, XCircle, File as FileIcon, Loader, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { ETLStatusCard } from '@/components/etl/ETLStatusCard';
import { ETLRunHistory, ETLRunHistoryRef } from '@/components/etl/ETLRunHistory';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const PREFECT_DASHBOARD_URL = process.env.NEXT_PUBLIC_PREFECT_DASHBOARD_URL || 'http://localhost:4200';

export default function ImportsPage() {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    files?: string[];
  } | null>(null);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearDataToast, setClearDataToast] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const etlHistoryRef = useRef<ETLRunHistoryRef>(null);

  // Auto-dismiss clear data toast after 5 seconds
  React.useEffect(() => {
    if (clearDataToast) {
      const timer = setTimeout(() => {
        setClearDataToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [clearDataToast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    setUploadResult(null);
    
    const allowedExtensions = ['json', 'zip', 'gz', 'tar', 'tgz', 'rar'];
    const filesArray = Array.from(files);
    
    // Validate all files
    for (const file of filesArray) {
      const fileName = file.name.toLowerCase();
      const isValid = allowedExtensions.some(ext => 
        fileName.endsWith(`.${ext}`) || fileName.includes(`.tar.${ext}`)
      );
      
      if (!isValid) {
        setUploadResult({
          success: false,
          message: `Invalid file type: ${file.name}. Allowed: JSON, ZIP, TAR, GZ, TAR.GZ, TGZ, RAR`,
        });
        return;
      }
    }

    setUploading(true);
    console.log(`Uploading ${filesArray.length} file(s) to:`, `${API_BASE_URL}/api/v1/upload`);

    try {
      const formData = new FormData();
      
      // Append all files
      filesArray.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/upload`, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      
      const result = await response.json();
      console.log('Response result:', result);

      if (response.ok && result.success) {
        setUploadResult({
          success: true,
          message: result.message,
          files: result.files,
        });
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setUploadResult({
          success: false,
          message: result.error || result.message || 'Upload failed',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed. Is the backend running?',
      });
    } finally {
      setUploading(false);
      // Reset file input on error too
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearAllData = async () => {
    console.log('=== handleClearAllData called ===');
    setClearing(true);
    
    try {
      console.log('Clearing all data...');
      console.log('API URL:', `${API_BASE_URL}/api/v1/data/clear-all`);
      
      const response = await fetch(`${API_BASE_URL}/api/v1/data/clear-all`, {
        method: 'DELETE',
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);

      if (response.ok) {
        setShowClearDataConfirm(false);
        setClearDataToast({
          success: true,
          message: result.message || 'All database data cleared successfully',
        });
      } else {
        setShowClearDataConfirm(false);
        setClearDataToast({
          success: false,
          message: result.error || 'Failed to clear database',
        });
      }
    } catch (error) {
      console.error('Clear data error:', error);
      setShowClearDataConfirm(false);
      setClearDataToast({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to clear database. Is the backend running?',
      });
    } finally {
      setClearing(false);
      console.log('=== handleClearAllData finished ===');
    }
  };

  return (
    <>
      <Head>
        <title>Data Imports - Advocacy Platform</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Data Imports"
          subtitle="Upload and manage data imports"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Instructions Section */}
          <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">Instructions</h3>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li className="pl-2">
                    Upload the relevant data files using the upload section below.
                  </li>
                  <li className="pl-2">
                    Once files have been uploaded, you can either wait for the next ETL run (details are in the countdown below), or trigger the run manually using the "Trigger ETL Now" button.
                  </li>
                  <li className="pl-2">
                    Once triggered, you can see details of the run in the history log table or by opening the{' '}
                    <a
                      href={PREFECT_DASHBOARD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-800 underline font-medium inline-flex items-center"
                    >
                      Prefect dashboard
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                    .
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Danger Zone - Clear Database */}
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900">Danger Zone</h3>
                  <p className="text-xs text-red-700 mt-1">
                    Clear all data from the database. This action cannot be undone.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClearDataConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-700 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                Clear All Database Data
              </button>
            </div>
          </div>

          <Card>
            <CardHeader title="Upload Data" subtitle="Accepts JSON and archive files (multiple files supported)" />

            <div className="p-6">
              <div
                className={`relative border-4 border-dashed rounded-lg p-12 text-center transition-colors ${
                  dragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".json,.zip,.gz,.tar,.tar.gz,.tgz,.rar"
                  onChange={handleChange}
                  disabled={uploading}
                  multiple
                />

                {uploading ? (
                  <>
                    <Loader className="w-16 h-16 text-primary-600 mx-auto mb-4 animate-spin" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Uploading...
                    </h3>
                    <p className="text-gray-600">Please wait</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Upload Files
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Drag and drop files here, or click to select (multiple files supported)
                    </p>
                    <button
                      onClick={onButtonClick}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Select Files
                    </button>
                    <p className="text-sm text-gray-500 mt-4">
                      Accepted formats: .json, .zip, .tar, .gz, .tar.gz, .tgz, .rar
                    </p>
                  </>
                )}
              </div>

              {/* Upload Result */}
              {uploadResult && (
                <div
                  className={`mt-4 p-4 rounded-lg flex items-start ${
                    uploadResult.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {uploadResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        uploadResult.success ? 'text-green-900' : 'text-red-900'
                      }`}
                    >
                      {uploadResult.message}
                    </p>
                    {uploadResult.files && uploadResult.files.length > 0 && (
                      <div className="mt-2 max-h-48 overflow-y-auto">
                        <ul className="text-sm text-green-800">
                          {uploadResult.files.map((file, idx) => (
                            <li key={idx} className="flex items-center py-1">
                              <FileIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                              {file}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* ETL Pipeline Control and Run History - Side by Side */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ETL Pipeline Control Section - 1/3 width */}
            <div className="lg:col-span-1">
              <ETLStatusCard onETLTriggered={() => etlHistoryRef.current?.refresh()} />
            </div>

            {/* ETL Run History Section - 2/3 width */}
            <div className="lg:col-span-2">
              <ETLRunHistory ref={etlHistoryRef} />
            </div>
          </div>
        </div>

        {/* Clear All Database Data Confirmation Modal */}
        {showClearDataConfirm && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              // Only close if clicking the backdrop, not the modal content
              if (e.target === e.currentTarget) {
                setShowClearDataConfirm(false);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-xl font-bold text-red-900 mb-3">
                    ⚠️ DANGER: Clear All Database Data
                  </h3>
                  <div className="text-sm text-gray-700 mb-4 space-y-2">
                    <p className="font-semibold text-red-800">
                      This will PERMANENTLY DELETE all data from the database including:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>All advocate accounts and users</li>
                      <li>All programs and tasks</li>
                      <li>All social analytics data</li>
                      <li>All sales attribution records</li>
                      <li>All data quality records</li>
                    </ul>
                    <p className="font-bold text-red-900 mt-3">
                      THIS CANNOT BE UNDONE!
                    </p>
                    <p className="text-gray-600 mt-2">
                      Note: This only clears the database. Uploaded files in the data folder will remain.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Cancel button clicked');
                        setShowClearDataConfirm(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        console.log('Delete button clicked!');
                        e.preventDefault();
                        e.stopPropagation();
                        handleClearAllData();
                      }}
                      disabled={clearing}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {clearing ? 'Deleting...' : 'Yes, Delete All Data'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clear Data Toast Notification */}
        {clearDataToast && (
          <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
            <div
              className={`px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${
                clearDataToast.success
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {clearDataToast.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <div>
                <div className="font-semibold">
                  {clearDataToast.success ? 'Success!' : 'Error'}
                </div>
                <div
                  className={`text-sm ${
                    clearDataToast.success ? 'text-green-100' : 'text-red-100'
                  }`}
                >
                  {clearDataToast.message}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

