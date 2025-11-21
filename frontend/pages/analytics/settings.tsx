import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Settings, Save, RotateCcw, AlertCircle, CheckCircle, Trophy, TrendingUp, UsersRound } from 'lucide-react';
import {
  ChampionSettings,
  loadSettings as loadChampionSettings,
  saveSettings as saveChampionSettings,
  resetSettings as resetChampionSettings,
  validateSettings as validateChampionSettings,
  DEFAULT_CHAMPION_SETTINGS,
} from '@/lib/championSettings';
import {
  OutlierSettings,
  loadSettings as loadOutlierSettings,
  saveSettings as saveOutlierSettings,
  resetSettings as resetOutlierSettings,
  validateSettings as validateOutlierSettings,
  DEFAULT_OUTLIER_SETTINGS,
} from '@/lib/outlierSettings';
import {
  SegmentSettings,
  loadSettings as loadSegmentSettings,
  saveSettings as saveSegmentSettings,
  resetSettings as resetSegmentSettings,
  validateSettings as validateSegmentSettings,
  DEFAULT_SEGMENT_SETTINGS,
} from '@/lib/segmentSettings';

type SettingsTab = 'champions' | 'outliers' | 'segments';

export default function AnalyticsSettingsPage() {
  const router = useRouter();
  const { tab } = router.query;

  const [activeTab, setActiveTab] = useState<SettingsTab>('champions');
  const [championSettings, setChampionSettings] = useState<ChampionSettings>(DEFAULT_CHAMPION_SETTINGS);
  const [outlierSettings, setOutlierSettings] = useState<OutlierSettings>(DEFAULT_OUTLIER_SETTINGS);
  const [segmentSettings, setSegmentSettings] = useState<SegmentSettings>(DEFAULT_SEGMENT_SETTINGS);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    setChampionSettings(loadChampionSettings());
    setOutlierSettings(loadOutlierSettings());
    setSegmentSettings(loadSegmentSettings());
  }, []);

  useEffect(() => {
    if (tab === 'outliers') {
      setActiveTab('outliers');
    } else if (tab === 'segments') {
      setActiveTab('segments');
    } else {
      setActiveTab('champions');
    }
  }, [tab]);

  const handleSave = () => {
    let validationErrors: string[] = [];

    if (activeTab === 'champions') {
      validationErrors = validateChampionSettings(championSettings);
      if (validationErrors.length === 0) {
        saveChampionSettings(championSettings);
      }
    } else if (activeTab === 'outliers') {
      validationErrors = validateOutlierSettings(outlierSettings);
      if (validationErrors.length === 0) {
        saveOutlierSettings(outlierSettings);
      }
    } else if (activeTab === 'segments') {
      validationErrors = validateSegmentSettings(segmentSettings);
      if (validationErrors.length === 0) {
        saveSegmentSettings(segmentSettings);
      }
    }

    setErrors(validationErrors);

    if (validationErrors.length === 0) {
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
    if (activeTab === 'champions') {
      const defaults = resetChampionSettings();
      setChampionSettings(defaults);
    } else if (activeTab === 'outliers') {
      const defaults = resetOutlierSettings();
      setOutlierSettings(defaults);
    } else if (activeTab === 'segments') {
      const defaults = resetSegmentSettings();
      setSegmentSettings(defaults);
    }
    setErrors([]);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 3000);
    setShowResetModal(false);
  };

  // Champion settings updates
  const updateChampionOverall = (field: keyof ChampionSettings['overall'], value: number) => {
    setChampionSettings((prev) => ({
      ...prev,
      overall: { ...prev.overall, [field]: value },
    }));
  };

  const updateChampionEngagement = (field: keyof ChampionSettings['engagement'], value: number) => {
    setChampionSettings((prev) => ({
      ...prev,
      engagement: { ...prev.engagement, [field]: value },
    }));
  };

  const updateChampionBalanced = (field: keyof ChampionSettings['balanced'], value: number) => {
    setChampionSettings((prev) => ({
      ...prev,
      balanced: { ...prev.balanced, [field]: value },
    }));
  };

  const updateChampionSales = (field: keyof ChampionSettings['sales'], value: number) => {
    setChampionSettings((prev) => ({
      ...prev,
      sales: { ...prev.sales, [field]: value },
    }));
  };

  // Outlier settings updates
  const updateSalesOutliers = (field: keyof OutlierSettings['salesOutliers'], value: number) => {
    setOutlierSettings((prev) => ({
      ...prev,
      salesOutliers: { ...prev.salesOutliers, [field]: value },
    }));
  };

  const updateEngagementAnomalies = (field: keyof OutlierSettings['engagementAnomalies'], value: number) => {
    setOutlierSettings((prev) => ({
      ...prev,
      engagementAnomalies: { ...prev.engagementAnomalies, [field]: value },
    }));
  };

  const updateEfficientConverters = (field: keyof OutlierSettings['efficientConverters'], value: number) => {
    setOutlierSettings((prev) => ({
      ...prev,
      efficientConverters: { ...prev.efficientConverters, [field]: value },
    }));
  };

  // Segment settings updates
  const updateSegmentTier = (field: keyof SegmentSettings['performanceTiers'], value: number) => {
    setSegmentSettings((prev) => ({
      ...prev,
      performanceTiers: { ...prev.performanceTiers, [field]: value },
    }));
  };

  const updateSegmentActivity = (field: keyof SegmentSettings['activitySegments'], value: number) => {
    setSegmentSettings((prev) => ({
      ...prev,
      activitySegments: { ...prev.activitySegments, [field]: value },
    }));
  };

  const updateSegmentEfficiency = (field: keyof SegmentSettings['conversionEfficiency'], value: number) => {
    setSegmentSettings((prev) => ({
      ...prev,
      conversionEfficiency: { ...prev.conversionEfficiency, [field]: value },
    }));
  };

  return (
    <>
      <Head>
        <title>Analytics Settings</title>
      </Head>

      <main className="min-h-screen bg-gray-50">
        <PageHeader
          title="Analytics Settings"
          subtitle="Configure thresholds and parameters for all analytics features"
          backLink="/analytics"
          backLabel="Back to Analytics"
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('champions')}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === 'champions'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Champions
                </button>
                <button
                  onClick={() => setActiveTab('segments')}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === 'segments'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <UsersRound className="w-5 h-5 mr-2" />
                  Segments
                </button>
                <button
                  onClick={() => setActiveTab('outliers')}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === 'outliers'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Outliers
                </button>
              </nav>
            </div>
          </div>

          {/* Status Messages */}
          {errors.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-sm font-semibold text-red-900">Validation Errors</h3>
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

          {/* Champion Settings */}
          {activeTab === 'champions' && (
            <div className="space-y-6">
              {/* Overall Champions Settings */}
              <Card>
                <CardHeader
                  title="Overall Champions"
                  subtitle="Configure weights for the champion score formula"
                />
                <div className="p-6 space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-xs text-blue-700">
                      <strong>Champion Score =</strong> (Engagement × {championSettings.overall.engagementWeight}) +
                      (Sales × {championSettings.overall.salesWeight}) +
                      (Program Conv. Rate × 10 × {championSettings.overall.conversionWeight})
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Note: Weights must sum to 1.0 (100%). Program Conversion Rate is the % of programs that generated sales.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Engagement Weight: {championSettings.overall.engagementWeight.toFixed(2)} (
                      {(championSettings.overall.engagementWeight * 100).toFixed(0)}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={championSettings.overall.engagementWeight}
                      onChange={(e) => updateChampionOverall('engagementWeight', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sales Weight: {championSettings.overall.salesWeight.toFixed(2)} (
                      {(championSettings.overall.salesWeight * 100).toFixed(0)}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={championSettings.overall.salesWeight}
                      onChange={(e) => updateChampionOverall('salesWeight', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Program Conversion Weight: {championSettings.overall.conversionWeight.toFixed(2)} (
                      {(championSettings.overall.conversionWeight * 100).toFixed(0)}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={championSettings.overall.conversionWeight}
                      onChange={(e) => updateChampionOverall('conversionWeight', parseFloat(e.target.value))}
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
                            championSettings.overall.engagementWeight +
                              championSettings.overall.salesWeight +
                              championSettings.overall.conversionWeight -
                              1.0
                          ) < 0.01
                            ? 'text-green-600 font-semibold'
                            : 'text-red-600 font-semibold'
                        }
                      >
                        {(
                          championSettings.overall.engagementWeight +
                          championSettings.overall.salesWeight +
                          championSettings.overall.conversionWeight
                        ).toFixed(2)}{' '}
                        (
                        {(
                          (championSettings.overall.engagementWeight +
                            championSettings.overall.salesWeight +
                            championSettings.overall.conversionWeight) *
                          100
                        ).toFixed(0)}
                        %)
                      </span>
                    </p>
                  </div>
                </div>
              </Card>

              {/* Sales Champions Settings */}
              <Card>
                <CardHeader title="Sales Champions" subtitle="Configure minimum sales threshold" />
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Sales: ${championSettings.sales.minSales}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={championSettings.sales.minSales}
                      onChange={(e) => updateChampionSales('minSales', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Advocates with sales below this threshold will not appear in Sales Champions
                    </p>
                  </div>
                </div>
              </Card>

              {/* Engagement Champions Settings */}
              <Card>
                <CardHeader
                  title="Engagement Champions"
                  subtitle="Configure engagement thresholds and opportunity flags"
                />
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Engagement Score: {championSettings.engagement.minEngagement}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={championSettings.engagement.minEngagement}
                      onChange={(e) => updateChampionEngagement('minEngagement', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Opportunity Flags</h4>

                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-yellow-900 mb-2">
                          High Potential - Needs Sales Optimization
                        </h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">Min. Engagement</label>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={championSettings.engagement.highPotentialEngagement}
                              onChange={(e) =>
                                updateChampionEngagement('highPotentialEngagement', parseFloat(e.target.value))
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">Max. Sales ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={championSettings.engagement.highPotentialMaxSales}
                              onChange={(e) =>
                                updateChampionEngagement('highPotentialMaxSales', parseFloat(e.target.value))
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-blue-900 mb-2">Medium Potential - Could Improve</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">Min. Engagement</label>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={championSettings.engagement.mediumPotentialEngagement}
                              onChange={(e) =>
                                updateChampionEngagement('mediumPotentialEngagement', parseFloat(e.target.value))
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">Max. Sales ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={championSettings.engagement.mediumPotentialMaxSales}
                              onChange={(e) =>
                                updateChampionEngagement('mediumPotentialMaxSales', parseFloat(e.target.value))
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
              <Card>
                <CardHeader
                  title="Balanced Performers"
                  subtitle="Configure minimum thresholds and normalization factors"
                />
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min. Engagement: {championSettings.balanced.minEngagement}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={championSettings.balanced.minEngagement}
                        onChange={(e) => updateChampionBalanced('minEngagement', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min. Sales ($): {championSettings.balanced.minSales}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={championSettings.balanced.minSales}
                        onChange={(e) => updateChampionBalanced('minSales', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Balance Score Normalization</h4>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-purple-700">
                        <strong>Balance Score =</strong> min(engagement/{championSettings.balanced.engagementNormalizer},
                        sales/{championSettings.balanced.salesNormalizer})
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Engagement Normalizer: {championSettings.balanced.engagementNormalizer}
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="100"
                          value={championSettings.balanced.engagementNormalizer}
                          onChange={(e) =>
                            updateChampionBalanced('engagementNormalizer', parseFloat(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sales Normalizer: {championSettings.balanced.salesNormalizer}
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="100"
                          value={championSettings.balanced.salesNormalizer}
                          onChange={(e) => updateChampionBalanced('salesNormalizer', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Outlier Settings */}
          {activeTab === 'outliers' && (
            <div className="space-y-6">
              {/* Sales Outliers Settings */}
              <Card>
                <CardHeader title="Sales Outliers" subtitle="Configure detection parameters for unusual sales transactions" />
                <div className="p-6 space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-xs text-blue-700">
                      Sales outliers are detected using statistical analysis (Z-scores). A higher z-score means more significant deviation from the average.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Results: {outlierSettings.salesOutliers.limit}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      value={outlierSettings.salesOutliers.limit}
                      onChange={(e) => updateSalesOutliers('limit', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of outliers to display (10-100)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Z-Score: {outlierSettings.salesOutliers.minZScore.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={outlierSettings.salesOutliers.minZScore}
                      onChange={(e) => updateSalesOutliers('minZScore', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Higher values = only extreme outliers (default: 2.0 = 2 standard deviations)
                    </p>
                  </div>
                </div>
              </Card>

              {/* Engagement Anomalies Settings */}
              <Card>
                <CardHeader
                  title="Engagement Anomalies"
                  subtitle="Configure detection parameters for unusual engagement patterns"
                />
                <div className="p-6 space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <p className="text-xs text-purple-700">
                      Engagement anomalies identify viral content (high performers) and underperforming posts using statistical variance.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Results: {outlierSettings.engagementAnomalies.limit}
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="20"
                      value={outlierSettings.engagementAnomalies.limit}
                      onChange={(e) => updateEngagementAnomalies('limit', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of anomalies to display (20-200)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Z-Score: {outlierSettings.engagementAnomalies.minZScore.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={outlierSettings.engagementAnomalies.minZScore}
                      onChange={(e) => updateEngagementAnomalies('minZScore', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lower values = more sensitive (default: 1.5 captures more anomalies)
                    </p>
                  </div>
                </div>
              </Card>

              {/* Efficient Converters Settings */}
              <Card>
                <CardHeader
                  title="Efficient Converters"
                  subtitle="Configure thresholds for quality-over-quantity pattern detection"
                />
                <div className="p-6 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-xs text-green-700">
                      Efficient converters have high sales despite lower engagement, indicating high-intent audiences.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Results: {outlierSettings.efficientConverters.limit}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      value={outlierSettings.efficientConverters.limit}
                      onChange={(e) => updateEfficientConverters('limit', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of efficient converters to display (10-100)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Sales ($): {outlierSettings.efficientConverters.minSales}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={outlierSettings.efficientConverters.minSales}
                        onChange={(e) => updateEfficientConverters('minSales', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Engagement: {outlierSettings.efficientConverters.maxEngagement}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={outlierSettings.efficientConverters.maxEngagement}
                        onChange={(e) => updateEfficientConverters('maxEngagement', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Efficiency Ratio: {outlierSettings.efficientConverters.minEfficiency.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.05"
                      value={outlierSettings.efficientConverters.minEfficiency}
                      onChange={(e) => updateEfficientConverters('minEfficiency', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Sales Efficiency = Total Sales / Total Engagement Score
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Segment Settings Tab */}
          {activeTab === 'segments' && (
            <div className="space-y-6">
              {/* Performance Tiers */}
              <Card>
                <CardHeader
                  title="Performance Tier Thresholds"
                  subtitle="Set minimum engagement and sales thresholds for each performance tier"
                />
                <div className="p-6 space-y-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-900">
                      Accounts must meet <strong>BOTH</strong> engagement and sales thresholds to qualify for a tier. 
                      Bronze tier uses OR logic (either threshold).
                    </p>
                  </div>

                  {/* Platinum Tier */}
                  <div className="border-b pb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      💎 Platinum Tier
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Engagement Score
                        </label>
                        <input
                          type="number"
                          value={segmentSettings.performanceTiers.platinumEngagement}
                          onChange={(e) => updateSegmentTier('platinumEngagement', parseFloat(e.target.value))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Sales ($)
                        </label>
                        <input
                          type="number"
                          value={segmentSettings.performanceTiers.platinumSales}
                          onChange={(e) => updateSegmentTier('platinumSales', parseFloat(e.target.value))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gold Tier */}
                  <div className="border-b pb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      🥇 Gold Tier
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Engagement Score
                        </label>
                        <input
                          type="number"
                          value={segmentSettings.performanceTiers.goldEngagement}
                          onChange={(e) => updateSegmentTier('goldEngagement', parseFloat(e.target.value))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Sales ($)
                        </label>
                        <input
                          type="number"
                          value={segmentSettings.performanceTiers.goldSales}
                          onChange={(e) => updateSegmentTier('goldSales', parseFloat(e.target.value))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Silver Tier */}
                  <div className="border-b pb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      🥈 Silver Tier
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Engagement Score
                        </label>
                        <input
                          type="number"
                          value={segmentSettings.performanceTiers.silverEngagement}
                          onChange={(e) => updateSegmentTier('silverEngagement', parseFloat(e.target.value))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Sales ($)
                        </label>
                        <input
                          type="number"
                          value={segmentSettings.performanceTiers.silverSales}
                          onChange={(e) => updateSegmentTier('silverSales', parseFloat(e.target.value))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bronze Tier */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      🥉 Bronze Tier (OR Logic)
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Engagement Score (OR)
                        </label>
                        <input
                          type="number"
                          value={segmentSettings.performanceTiers.bronzeEngagement}
                          onChange={(e) => updateSegmentTier('bronzeEngagement', parseFloat(e.target.value))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Sales (OR) ($)
                        </label>
                        <input
                          type="number"
                          value={segmentSettings.performanceTiers.bronzeSales}
                          onChange={(e) => updateSegmentTier('bronzeSales', parseFloat(e.target.value))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Bronze tier qualifies if EITHER threshold is met. Starter tier includes everyone else.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Activity Segments */}
              <Card>
                <CardHeader
                  title="Activity Segment Thresholds"
                  subtitle="Define activity levels based on program and task participation"
                />
                <div className="p-6 space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      Activity levels require <strong>BOTH</strong> programs and tasks to meet thresholds (AND logic).
                    </p>
                  </div>

                  {/* Activity Levels */}
                  <div className="border-b pb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Activity Levels</h4>
                    
                    <div className="space-y-4">
                      {/* Highly Active */}
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🟢 Highly Active - Minimum Programs
                          </label>
                          <input
                            type="number"
                            value={segmentSettings.activitySegments.highlyActivePrograms}
                            onChange={(e) => updateSegmentActivity('highlyActivePrograms', parseFloat(e.target.value))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🟢 Highly Active - Minimum Tasks
                          </label>
                          <input
                            type="number"
                            value={segmentSettings.activitySegments.highlyActiveTasks}
                            onChange={(e) => updateSegmentActivity('highlyActiveTasks', parseFloat(e.target.value))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      {/* Active */}
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🔵 Active - Minimum Programs
                          </label>
                          <input
                            type="number"
                            value={segmentSettings.activitySegments.activePrograms}
                            onChange={(e) => updateSegmentActivity('activePrograms', parseFloat(e.target.value))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🔵 Active - Minimum Tasks
                          </label>
                          <input
                            type="number"
                            value={segmentSettings.activitySegments.activeTasks}
                            onChange={(e) => updateSegmentActivity('activeTasks', parseFloat(e.target.value))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      {/* Moderately Active */}
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🟡 Moderately Active - Minimum Programs
                          </label>
                          <input
                            type="number"
                            value={segmentSettings.activitySegments.moderatePrograms}
                            onChange={(e) => updateSegmentActivity('moderatePrograms', parseFloat(e.target.value))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🟡 Moderately Active - Minimum Tasks
                          </label>
                          <input
                            type="number"
                            value={segmentSettings.activitySegments.moderateTasks}
                            onChange={(e) => updateSegmentActivity('moderateTasks', parseFloat(e.target.value))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Value Levels */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Value Segments</h4>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🟣 High Value - Minimum Sales ($)
                        </label>
                        <input
                          type="number"
                          value={segmentSettings.activitySegments.highValueSales}
                          onChange={(e) => updateSegmentActivity('highValueSales', parseFloat(e.target.value))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🔵 Medium Value - Minimum Sales ($)
                        </label>
                        <input
                          type="number"
                          value={segmentSettings.activitySegments.mediumValueSales}
                          onChange={(e) => updateSegmentActivity('mediumValueSales', parseFloat(e.target.value))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Low Value = any sales below medium threshold. No Sales Yet = $0 in sales.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Conversion Efficiency */}
              <Card>
                <CardHeader
                  title="Conversion Efficiency Thresholds"
                  subtitle="Set efficiency ratio thresholds (Sales ÷ Engagement Score)"
                />
                <div className="p-6 space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-900 mb-2">
                      <strong>Efficiency Ratio = Total Sales ÷ Total Engagement Score</strong>
                    </p>
                    <p className="text-xs text-green-800">
                      Example: $5,000 in sales ÷ 1,000 engagement = 5.0 efficiency ratio
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🟢 Super Converters - Minimum Efficiency
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={segmentSettings.conversionEfficiency.superConverterThreshold}
                        onChange={(e) => updateSegmentEfficiency('superConverterThreshold', parseFloat(e.target.value))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Exceptional converters - quality audience with strong sales skills
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🔵 High Converters - Minimum Efficiency
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={segmentSettings.conversionEfficiency.highConverterThreshold}
                        onChange={(e) => updateSegmentEfficiency('highConverterThreshold', parseFloat(e.target.value))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Strong converters - consistent performance
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🟡 Average Converters - Minimum Efficiency
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={segmentSettings.conversionEfficiency.averageConverterThreshold}
                        onChange={(e) => updateSegmentEfficiency('averageConverterThreshold', parseFloat(e.target.value))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Standard converters - room for improvement
                      </p>
                    </div>

                    <p className="text-xs text-gray-500">
                      Low Converters = below Average threshold. These advocates may need training or better product-audience fit.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

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
          message="This will reset all settings in the current tab to their default values. This action cannot be undone."
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

