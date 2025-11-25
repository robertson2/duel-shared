import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Save, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import {
  ChampionSettings,
  loadSettings,
  saveSettings,
  resetSettings,
  validateSettings,
  DEFAULT_CHAMPION_SETTINGS,
} from '@/lib/championSettings';

export default function ChampionSettingsPage() {

  const [settings, setSettings] = useState<ChampionSettings>(DEFAULT_CHAMPION_SETTINGS);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const handleSave = () => {
    const validationErrors = validateSettings(settings);
    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      saveSettings(settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
    }
  };

  const handleResetClick = () => {
    setShowResetModal(true);
  };

  const handleResetConfirm = () => {
    const defaults = resetSettings();
    setSettings(defaults);
    setErrors([]);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const updateOverall = (field: keyof ChampionSettings['overall'], value: number) => {
    setSettings((prev) => ({
      ...prev,
      overall: { ...prev.overall, [field]: value },
    }));
  };

  const updateEngagement = (
    field: keyof ChampionSettings['engagement'],
    value: number
  ) => {
    setSettings((prev) => ({
      ...prev,
      engagement: { ...prev.engagement, [field]: value },
    }));
  };

  const updateBalanced = (field: keyof ChampionSettings['balanced'], value: number) => {
    setSettings((prev) => ({
      ...prev,
      balanced: { ...prev.balanced, [field]: value },
    }));
  };

  const updateSales = (field: keyof ChampionSettings['sales'], value: number) => {
    setSettings((prev) => ({
      ...prev,
      sales: { ...prev.sales, [field]: value },
    }));
  };

  return (
    <>
      <Head>
        <title>Champion Settings - Analytics</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Champion Analytics Settings"
          subtitle="Configure thresholds and weights for champion categories"
          backLink="/analytics/champions"
          backLabel="Back to Champions"
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Messages */}
          {errors.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-sm font-semibold text-red-900">
                  Validation Errors
                </h3>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {saveStatus === 'success' && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-900">
                  Settings saved successfully!
                </span>
              </div>
            </div>
          )}

          {/* Overall Champions Settings */}
          <Card className="mb-6">
            <CardHeader
              title="Overall Champions"
              subtitle="Configure weights for the champion score formula"
            />
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-xs text-blue-700">
                  <strong>Champion Score =</strong> (Engagement × {settings.overall.engagementWeight}) + 
                  (Sales × {settings.overall.salesWeight}) + 
                  (Program Conv. Rate × 10 × {settings.overall.conversionWeight})
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Note: Weights must sum to 1.0 (100%). Program Conversion Rate is the % of programs that generated sales.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Engagement Weight: {settings.overall.engagementWeight.toFixed(2)} (
                  {(settings.overall.engagementWeight * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.overall.engagementWeight}
                  onChange={(e) =>
                    updateOverall('engagementWeight', parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Weight: {settings.overall.salesWeight.toFixed(2)} (
                  {(settings.overall.salesWeight * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.overall.salesWeight}
                  onChange={(e) =>
                    updateOverall('salesWeight', parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Program Conversion Weight: {settings.overall.conversionWeight.toFixed(2)} (
                  {(settings.overall.conversionWeight * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.overall.conversionWeight}
                  onChange={(e) =>
                    updateOverall('conversionWeight', parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Program Conversion Rate = (Programs with Sales / Total Programs) × 100
                </p>
              </div>

              <div className="pt-2">
                <p className="text-sm text-gray-600">
                  Total Weight:{' '}
                  <span
                    className={
                      Math.abs(
                        settings.overall.engagementWeight +
                          settings.overall.salesWeight +
                          settings.overall.conversionWeight -
                          1.0
                      ) < 0.01
                        ? 'text-green-600 font-semibold'
                        : 'text-red-600 font-semibold'
                    }
                  >
                    {(
                      settings.overall.engagementWeight +
                      settings.overall.salesWeight +
                      settings.overall.conversionWeight
                    ).toFixed(2)}{' '}
                    (
                    {(
                      (settings.overall.engagementWeight +
                        settings.overall.salesWeight +
                        settings.overall.conversionWeight) *
                      100
                    ).toFixed(0)}
                    %)
                  </span>
                </p>
              </div>
            </div>
          </Card>

          {/* Sales Champions Settings */}
          <Card className="mb-6">
            <CardHeader
              title="Sales Champions"
              subtitle="Configure minimum sales threshold"
            />
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Sales: ${settings.sales.minSales}
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={settings.sales.minSales}
                  onChange={(e) => updateSales('minSales', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Advocates with sales below this threshold will not appear in Sales Champions
                </p>
              </div>
            </div>
          </Card>

          {/* Engagement Champions Settings */}
          <Card className="mb-6">
            <CardHeader
              title="Engagement Champions"
              subtitle="Configure engagement thresholds and opportunity flags"
            />
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Engagement Score: {settings.engagement.minEngagement}
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={settings.engagement.minEngagement}
                  onChange={(e) =>
                    updateEngagement('minEngagement', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Opportunity Flags
                </h4>

                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h5 className="text-xs font-semibold text-yellow-900 mb-2">
                      High Potential - Needs Sales Optimization
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-700 mb-1">
                          Min. Engagement
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={settings.engagement.highPotentialEngagement}
                          onChange={(e) =>
                            updateEngagement(
                              'highPotentialEngagement',
                              parseFloat(e.target.value)
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-700 mb-1">
                          Max. Sales ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={settings.engagement.highPotentialMaxSales}
                          onChange={(e) =>
                            updateEngagement(
                              'highPotentialMaxSales',
                              parseFloat(e.target.value)
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="text-xs font-semibold text-blue-900 mb-2">
                      Medium Potential - Could Improve
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-700 mb-1">
                          Min. Engagement
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={settings.engagement.mediumPotentialEngagement}
                          onChange={(e) =>
                            updateEngagement(
                              'mediumPotentialEngagement',
                              parseFloat(e.target.value)
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-700 mb-1">
                          Max. Sales ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={settings.engagement.mediumPotentialMaxSales}
                          onChange={(e) =>
                            updateEngagement(
                              'mediumPotentialMaxSales',
                              parseFloat(e.target.value)
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Balanced Performers Settings */}
          <Card className="mb-6">
            <CardHeader
              title="Balanced Performers"
              subtitle="Configure minimum thresholds and normalization factors"
            />
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min. Engagement: {settings.balanced.minEngagement}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={settings.balanced.minEngagement}
                    onChange={(e) =>
                      updateBalanced('minEngagement', parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min. Sales ($): {settings.balanced.minSales}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={settings.balanced.minSales}
                    onChange={(e) =>
                      updateBalanced('minSales', parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Balance Score Normalization
                </h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-purple-700">
                    <strong>Balance Score =</strong> min(engagement/{settings.balanced.engagementNormalizer}, 
                    sales/{settings.balanced.salesNormalizer})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Engagement Normalizer: {settings.balanced.engagementNormalizer}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="100"
                      value={settings.balanced.engagementNormalizer}
                      onChange={(e) =>
                        updateBalanced(
                          'engagementNormalizer',
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sales Normalizer: {settings.balanced.salesNormalizer}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="100"
                      value={settings.balanced.salesNormalizer}
                      onChange={(e) =>
                        updateBalanced('salesNormalizer', parseFloat(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={handleResetClick}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </button>

              <button
                onClick={handleSave}
                className="flex items-center px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </button>
            </div>
          </div>
        </div>

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          onConfirm={handleResetConfirm}
          title="Reset Settings to Defaults?"
          message="This will reset all champion analytics settings to their default values. This action cannot be undone."
          confirmText="Reset to Defaults"
          cancelText="Cancel"
          variant="warning"
        />

        {/* Toast Notification */}
        {saveStatus === 'success' && (
          <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
            <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3">
              <CheckCircle className="w-5 h-5" />
              <div>
                <div className="font-semibold">Settings Saved!</div>
                <div className="text-sm text-green-100">Your changes have been applied successfully</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

