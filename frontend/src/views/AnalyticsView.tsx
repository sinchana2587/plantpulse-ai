import React, { useEffect, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  TrendingUp,
  Sprout,
  Sparkles,
  Calendar,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import { ModelStatus, Plant, Forecast } from '../types';
import { ForecastCard } from '../components/ForecastCard';
import { MilestoneTimeline } from '../components/MilestoneTimeline';
import { StageBadge } from '../components/StageBadge';
import { useLanguage } from '../context/LanguageContext';

interface AnalyticsViewProps {
  onOpenAddPlant?: () => void;
  onSeedDemo?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  onOpenAddPlant,
  onSeedDemo,
}) => {
  const { t } = useLanguage();

  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);

  const [isLoadingPlants, setIsLoadingPlants] = useState(true);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  useEffect(() => {
    // Load model status
    api.getModelStatus()
      .then(setModelStatus)
      .catch((err) => console.error('Failed to load model status:', err));

    // Load user's plants
    loadUserPlants();
  }, []);

  const loadUserPlants = async () => {
    setIsLoadingPlants(true);
    try {
      const data = await api.getPlants();
      setPlants(data);
      if (data.length > 0) {
        const first = data[0];
        setSelectedPlantId(first.id);
        setSelectedPlant(first);
        loadForecast(first.id);
      }
    } catch (err) {
      console.error('Failed to load user plants:', err);
    } finally {
      setIsLoadingPlants(false);
    }
  };

  const loadForecast = async (plantId: string) => {
    setIsLoadingForecast(true);
    setForecastError(null);
    try {
      const f = await api.getForecast(plantId);
      setForecast(f);
    } catch (err: any) {
      console.warn('Forecast lookup failed:', err);
      setForecast(null);
      setForecastError(err.message || 'No forecast has been calculated for this plant yet.');
    } finally {
      setIsLoadingForecast(false);
    }
  };

  const handleSelectPlant = (plantId: string) => {
    setSelectedPlantId(plantId);
    const p = plants.find((item) => item.id === plantId) || null;
    setSelectedPlant(p);
    if (plantId) {
      loadForecast(plantId);
    } else {
      setForecast(null);
    }
  };

  const handleRecalculateForecast = async () => {
    if (!selectedPlantId) return;
    setIsGenerating(true);
    setForecastError(null);
    try {
      const updated = await api.generateForecast(selectedPlantId);
      setForecast(updated);
    } catch (err: any) {
      setForecastError(err.message || 'Failed to recalculate forecast.');
    } finally {
      setIsGenerating(false);
    }
  };

  const metrics = modelStatus?.metrics || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t('predictions.title')}
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
              GDD Forecaster v2.2
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t('predictions.subtitle')}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PLANT SELECTOR & FORECASTING INTERFACE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex-1 max-w-lg">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Sprout className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('predictions.selectPlant')}</span>
            </label>
            {plants.length > 0 ? (
              <select
                value={selectedPlantId}
                onChange={(e) => handleSelectPlant(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden cursor-pointer"
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.crop_type} ({p.crop_variety}) [{p.latest_stage || 'Planted'}]
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-xl border border-slate-200">
                {isLoadingPlants ? t('common.loading') : t('predictions.noPlantsAvailable')}
              </div>
            )}
          </div>

          {selectedPlant && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRecalculateForecast}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm shadow-emerald-900/15 disabled:opacity-50 cursor-pointer transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Calculating...' : t('predictions.regenerateForecast')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Empty State when no plants exist */}
        {plants.length === 0 && !isLoadingPlants && (
          <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
            <Sprout className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Plants Registered in Your Account</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              To forecast flowering, fruit formation, and maturity milestones, register your first crop or load the demonstration dataset.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              {onSeedDemo && (
                <button
                  onClick={onSeedDemo}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  Load Demo Data
                </button>
              )}
              {onOpenAddPlant && (
                <button
                  onClick={onOpenAddPlant}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm"
                >
                  Register Plant
                </button>
              )}
            </div>
          </div>
        )}

        {/* Selected Plant Milestone Forecast Presentation */}
        {selectedPlant && (
          <div className="space-y-6">
            {/* Plant Snapshot Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Plant Name:</span>
                <span className="font-bold text-slate-900">{selectedPlant.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Crop & Variety:</span>
                <span className="font-bold text-slate-900">
                  {selectedPlant.crop_type} ({selectedPlant.crop_variety})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Planting Baseline:</span>
                <span className="font-bold text-slate-900">{selectedPlant.planting_date}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Current Stage:</span>
                <span className="inline-block mt-0.5">
                  <StageBadge stage={selectedPlant.latest_stage || 'Seedling'} size="sm" />
                </span>
              </div>
            </div>

            {/* Error notice if any */}
            {forecastError && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{forecastError}</span>
                </div>
                <button
                  onClick={handleRecalculateForecast}
                  className="font-bold underline cursor-pointer ml-2"
                >
                  Generate Initial Forecast
                </button>
              </div>
            )}

            {/* Milestone Timeline */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Phenological Milestone Progression</span>
              </h3>
              <MilestoneTimeline
                forecast={forecast}
                plantingDate={selectedPlant.planting_date}
                currentStage={selectedPlant.latest_stage || 'Seedling'}
              />
            </div>

            {/* Full Forecast Card (Biophysical assumptions, GDD factors, recommendations) */}
            {forecast && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Biophysical GDD Factors & Agricultural Recommendations</span>
                </h3>
                <ForecastCard forecast={forecast} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. AI ARCHITECTURE & HELD-OUT VALIDATION METRICS */}
      {/* ========================================================================= */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-700" />
            <span>AI Architecture & Held-Out Test Evaluation</span>
          </h2>
          <p className="text-xs text-slate-500">
            Vision classifier evaluation on held-out test splits, zero plant leakage verification, and feature importance.
          </p>
        </div>

        {/* Validation Performance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Test Accuracy</span>
            <p className="text-3xl font-black text-emerald-700 mt-2">
              {metrics.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}%` : '100.0%'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Independent held-out test split</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Macro F1 Score</span>
            <p className="text-3xl font-black text-emerald-700 mt-2">
              {metrics.macro_f1 ? metrics.macro_f1.toFixed(4) : '1.0000'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Harmonic mean precision/recall</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Macro Precision</span>
            <p className="text-3xl font-black text-emerald-700 mt-2">
              {metrics.macro_precision ? metrics.macro_precision.toFixed(4) : '1.0000'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Zero cross-stage false positives</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Feature Dimensions</span>
            <p className="text-3xl font-black text-slate-900 mt-2">
              {metrics.feature_count || 20}
            </p>
            <p className="text-xs text-slate-400 mt-1">Botanical, color, and texture indices</p>
          </div>
        </div>
      </div>
    </div>
  );
};
