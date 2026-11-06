import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Sparkles,
  Calendar,
  MapPin,
  Camera,
  Layers,
  ArrowLeftRight,
  Edit2,
  CheckCircle,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Activity,
  FileText,
  Clock,
  Eye,
  Check,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';
import {
  Plant,
  Observation,
  Forecast,
  GrowthStage,
  PlantAnalysisResponse,
  PlantProblemResponse
} from '../types';
import { StageBadge } from '../components/StageBadge';
import { MilestoneTimeline } from '../components/MilestoneTimeline';
import { ForecastCard } from '../components/ForecastCard';
import { EnvironmentalChart } from '../components/EnvironmentalChart';
import { ObservationModal } from '../components/ObservationModal';
import { PhotoComparisonModal } from '../components/PhotoComparisonModal';
import { PlantScanAnalysisModal } from '../components/PlantScanAnalysisModal';
import { PlantAnalysisReportModal } from '../components/PlantAnalysisReportModal';
import { AnalysePlantModal } from '../components/AnalysePlantModal';
import { ReportProblemModal } from '../components/ReportProblemModal';
import { GeometricInspectorModal } from '../components/GeometricInspectorModal';
import { DigitalTwinRadarCard } from '../components/DigitalTwinRadarCard';
import { generateScanDiagnosis, ScanDiagnosisResult } from '../services/scanAnalysisService';
import { Scan, HeartPulse } from 'lucide-react';

interface PlantDetailViewProps {
  plantId: string;
  onBack: () => void;
  onPlantUpdated: () => void;
  onNavigateToTreatment?: () => void;
}

const STAGES: GrowthStage[] = ['Seedling', 'Vegetative', 'Flowering', 'Fruit Formation', 'Maturity'];
const BANANA_STAGES = ['Vegetative', 'Pseudostem Emergence', 'Inflorescence', 'Fruit Development', 'Harvest Maturity'];

export const PlantDetailView: React.FC<PlantDetailViewProps> = ({
  plantId,
  onBack,
  onPlantUpdated,
  onNavigateToTreatment,
}) => {
  const [plant, setPlant] = useState<Plant | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [reportedProblems, setReportedProblems] = useState<PlantProblemResponse[]>([]);
  const [analysesHistory, setAnalysesHistory] = useState<PlantAnalysisResponse[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isForecasting, setIsForecasting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'growth' | 'digital-twin' | 'problems' | 'analyses'>('growth');

  // Modals
  const [isObsModalOpen, setIsObsModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isAnalyseModalOpen, setIsAnalyseModalOpen] = useState(false);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGeometricModalOpen, setIsGeometricModalOpen] = useState(false);

  // Active Analysis Report
  const [activeAnalysisReport, setActiveAnalysisReport] = useState<PlantAnalysisResponse | null>(null);

  // Legacy Scan Modal State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [activeDiagnosis, setActiveDiagnosis] = useState<ScanDiagnosisResult | null>(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  // Stage correction state
  const [editingObsId, setEditingObsId] = useState<string | null>(null);
  const [newStageValue, setNewStageValue] = useState<string>('');
  const [analyzingObsId, setAnalyzingObsId] = useState<string | null>(null);

  const loadData = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [plantData, obsData, fcData, probData, anaData] = await Promise.all([
        api.getPlant(plantId),
        api.getObservations(plantId),
        api.getForecast(plantId).catch(() => null),
        api.getPlantProblems(plantId).catch(() => []),
        api.getPlantAnalyses(plantId).catch(() => []),
      ]);
      setPlant(plantData);
      setObservations(obsData);
      setForecast(fcData);
      setReportedProblems(probData);
      setAnalysesHistory(anaData);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load plant details.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [plantId]);

  const handleRecalculateForecast = async () => {
    setIsForecasting(true);
    try {
      const updatedFc = await api.generateForecast(plantId);
      setForecast(updatedFc);
      onPlantUpdated();
    } catch (err: any) {
      alert(`Forecast calculation error: ${err.message}`);
    } finally {
      setIsForecasting(false);
    }
  };

  const handleObservationSaved = async (newObs: Observation) => {
    await loadData();
    onPlantUpdated();
    if (newObs.image_path) {
      handleTriggerAnalysis(newObs.id);
    }
  };

  const handleCorrectStage = async (obsId: string) => {
    if (!newStageValue) return;
    try {
      await api.correctObservationStage(obsId, newStageValue);
      setEditingObsId(null);
      loadData();
      onPlantUpdated();
    } catch (err: any) {
      alert(`Error updating stage: ${err.message}`);
    }
  };

  // Run full AI Analysis on a specific observation
  const handleTriggerAnalysis = async (obsId: string) => {
    setAnalyzingObsId(obsId);
    try {
      const report = await api.analysePlant(plantId, { observationId: obsId });
      setActiveAnalysisReport(report);
      setIsReportModalOpen(true);
      await loadData();
      onPlantUpdated();
    } catch (err: any) {
      alert(`AI Analysis failed: ${err.message}`);
    } finally {
      setAnalyzingObsId(null);
    }
  };

  const handleAnalysisComplete = (report: PlantAnalysisResponse) => {
    setActiveAnalysisReport(report);
    setIsReportModalOpen(true);
    loadData();
    onPlantUpdated();
  };

  const handleProblemReported = (problem: PlantProblemResponse) => {
    loadData(true);
  };

  if (isLoading || !plant) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-40 bg-slate-200 rounded-3xl animate-pulse" />
        <div className="h-96 bg-slate-200 rounded-3xl animate-pulse" />
      </div>
    );
  }

  const effectiveStage =
    observations.length > 0
      ? observations[observations.length - 1].effective_stage
      : 'Seedling';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Crop Inventory</span>
      </button>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Plant Hero Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                {plant.crop_type}
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                {plant.crop_variety}
              </span>
              {plant.is_demo && (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                  Demo Dataset
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {plant.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Planted: <strong className="text-slate-700">{plant.planting_date}</strong></span>
              </div>
              {plant.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{plant.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-slate-400" />
                <span>{observations.length} Longitudinal Observation(s)</span>
              </div>
            </div>
          </div>

          {/* Right Action Control Center */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Prominent ANALYSE PLANT Action */}
            <button
              onClick={() => setIsAnalyseModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition-all shadow-md active:scale-98"
              title="Run AI Botanical Growth & Health Intelligence Engine"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>ANALYSE PLANT</span>
            </button>

            {/* Geometric Anomaly Inspector */}
            <button
              onClick={() => setIsGeometricModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-colors shadow-2xs"
              title="Inspect leaf boundary, circularity, convexity, and symmetry"
            >
              <Scan className="w-3.5 h-3.5 text-indigo-600" />
              <span>Geometric Inspector</span>
            </button>

            {/* Treatment & Recovery Plan */}
            <button
              onClick={() => {
                if (onNavigateToTreatment) {
                  onNavigateToTreatment();
                } else {
                  window.location.href = '/treatment';
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors shadow-2xs"
              title="Open treatment regimen and interactive recovery tracking"
            >
              <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
              <span>Treatment Plan</span>
            </button>

            {/* REPORT A PLANT PROBLEM */}
            <button
              onClick={() => setIsProblemModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 transition-colors shadow-2xs"
              title="Report plant stress, yellowing, wilting, or pests"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Report Problem</span>
            </button>

            <button
              onClick={() => setIsObsModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-700" />
              <span>Add Observation</span>
            </button>

            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Compare photographs across different dates"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
              <span>Compare</span>
            </button>
          </div>
        </div>

        {/* Current Active Growth Stage Banner */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Current Morphological Stage:
            </span>
            <StageBadge stage={effectiveStage} size="lg" />
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            {observations.length > 0 && observations[observations.length - 1].confidence_score && (
              <div>
                AI Model Confidence:{' '}
                <strong className="text-emerald-700 font-bold">
                  {Math.round(observations[observations.length - 1].confidence_score! * 100)}%
                </strong>
              </div>
            )}
            {analysesHistory.length > 0 && (
              <button
                onClick={() => {
                  setActiveAnalysisReport(analysesHistory[0]);
                  setIsReportModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Latest Report</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('growth')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'growth'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Growth & Telemetry
        </button>

        <button
          onClick={() => setActiveTab('digital-twin')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'digital-twin'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Plant Digital Twin & Radar</span>
        </button>

        <button
          onClick={() => setActiveTab('problems')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'problems'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Problem Reports ({reportedProblems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analyses')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'analyses'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Analysis History ({analysesHistory.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: Growth & Telemetry */}
      {activeTab === 'growth' && (
        <div className="space-y-8">
          {/* Phenological Development Trajectory (Milestones) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <MilestoneTimeline
              forecast={forecast}
              plantingDate={plant.planting_date}
              currentStage={effectiveStage}
            />
          </div>

          {/* Forecast Explainability & Recommendations Card */}
          {forecast && <ForecastCard forecast={forecast} />}

          {/* Longitudinal Environmental Telemetry Chart */}
          <EnvironmentalChart observations={observations} />

          {/* Chronological Photographic Observations Log */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">Chronological Observations History</h2>
                <p className="text-xs text-slate-500">
                  Recorded photographs, environmental telemetry, and growth stage classifications
                </p>
              </div>

              <button
                onClick={() => setIsObsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Observation
              </button>
            </div>

            {observations.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Camera className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-800">No photograph or growth observation has been submitted yet.</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Submit your first plant photograph and microclimate telemetry to initialize continuous growth stage tracking and phenological predictions.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => setIsObsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add First Observation</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {observations.map((obs, idx) => (
                  <div
                    key={obs.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-2xs flex flex-col md:flex-row gap-5 items-start"
                  >
                    {/* Observation Photo */}
                    <div className="w-full md:w-44 h-40 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                      {obs.image_path ? (
                        <img
                          src={obs.image_path}
                          alt={`Observation on ${new Date(obs.observation_date).toLocaleDateString()}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const fallback = (e.target as HTMLElement).parentElement?.querySelector('.img-fallback');
                            if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`img-fallback w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center ${obs.image_path ? 'hidden' : ''}`}>
                        <Camera className="w-8 h-8 mb-1" />
                        <span className="text-[10px]">No Photo Uploaded</span>
                      </div>
                    </div>

                    {/* Observation Details */}
                    <div className="flex-1 space-y-3 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              Observation #{idx + 1}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(obs.observation_date).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <StageBadge stage={obs.effective_stage} size="sm" />
                        </div>
                      </div>

                      {/* Stage Classification Data & Override */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Visual AI Classification
                          </span>
                          <p className="font-semibold text-slate-800">
                            {obs.ai_growth_stage ? obs.ai_growth_stage : 'Not yet analyzed'}
                            {obs.confidence_score && (
                              <span className="ml-1 text-emerald-700 font-bold">
                                ({Math.round(obs.confidence_score * 100)}%)
                              </span>
                            )}
                          </p>
                          {obs.model_version && (
                            <p className="text-[10px] text-slate-400">Model v{obs.model_version}</p>
                          )}
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Manual Verification
                          </span>
                          {editingObsId === obs.id ? (
                            <div className="flex items-center gap-1.5 pt-1">
                              <select
                                value={newStageValue}
                                onChange={(e) => setNewStageValue(e.target.value)}
                                className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                              >
                                <option value="">Select Stage</option>
                                {(plant.crop_type.toLowerCase() === 'banana' ? BANANA_STAGES : STAGES).map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleCorrectStage(obs.id)}
                                className="px-2 py-1 bg-emerald-700 text-white rounded text-xs font-bold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingObsId(null)}
                                className="px-2 py-1 text-slate-500 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                {obs.manual_growth_stage ? (
                                  <span className="text-emerald-700 font-bold">
                                    {obs.manual_growth_stage} (Manual)
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">None (AI Active)</span>
                                )}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingObsId(obs.id);
                                  setNewStageValue(obs.effective_stage);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                                title="Override growth stage"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Environmental Sensors & Trigger Action */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                        {obs.temperature !== null && obs.temperature !== undefined && (
                          <span><strong>Temp:</strong> {obs.temperature} °C</span>
                        )}
                        {obs.soil_moisture !== null && obs.soil_moisture !== undefined && (
                          <span><strong>Soil Moisture:</strong> {obs.soil_moisture} %</span>
                        )}
                        {obs.humidity !== null && obs.humidity !== undefined && (
                          <span><strong>Humidity:</strong> {obs.humidity} %</span>
                        )}
                        {obs.sunlight_hours !== null && obs.sunlight_hours !== undefined && (
                          <span><strong>Sunlight:</strong> {obs.sunlight_hours} hrs</span>
                        )}
                        {obs.rainfall !== null && obs.rainfall !== undefined && (
                          <span><strong>Rainfall:</strong> {obs.rainfall} mm</span>
                        )}

                        {obs.image_path && (
                          <button
                            onClick={() => handleTriggerAnalysis(obs.id)}
                            disabled={analyzingObsId === obs.id}
                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-colors"
                          >
                            {analyzingObsId === obs.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                            <span>Run AI Analysis Report</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Plant Digital Twin & Growth Radar */}
      {activeTab === 'digital-twin' && (
        <DigitalTwinRadarCard
          plantId={plant.id}
          plantName={plant.name}
          cropType={plant.crop_type}
          onRefresh={loadData}
        />
      )}

      {/* TAB CONTENT 3: Problem Reports & AI Diagnoses */}
      {activeTab === 'problems' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Farmer Problem Reports & AI Diagnoses
              </h2>
              <p className="text-xs text-slate-500">
                Log crop stress, foliar discoloration, wilting, or pest symptoms for grounded diagnosis
              </p>
            </div>
            <button
              onClick={() => setIsProblemModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report New Problem</span>
            </button>
          </div>

          {reportedProblems.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800">No problems have been reported for this plant.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                If you observe chlorosis, leaf curl, wilting, or pests, submit a report to generate an immediate cultural management plan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportedProblems.map((prob) => (
                <div
                  key={prob.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                        {prob.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        Reported: {new Date(prob.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span>Affected: <strong>{prob.affected_part}</strong></span>
                      <span>•</span>
                      <span>Spreading: <strong className="capitalize">{prob.is_spreading}</strong></span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 font-medium">
                    "{prob.description}"
                  </p>

                  {prob.analyses.length > 0 && (
                    <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-700" />
                          AI Agronomic Diagnosis:
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Severity: {prob.analyses[0].severity}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {prob.analyses[0].summary}
                      </p>

                      <div className="space-y-1">
                        <span className="font-semibold text-slate-800 block">Immediate Interventions:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                          {prob.analyses[0].recommended_actions.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-1 text-[11px] text-amber-800 flex items-start gap-1.5">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{prob.analyses[0].expert_guidance}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: Analysis Reports History */}
      {activeTab === 'analyses' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                AI Growth & Health Analysis Reports History
              </h2>
              <p className="text-xs text-slate-500">
                Archived comprehensive multi-stage diagnostic reports (Sections A through I)
              </p>
            </div>
            <button
              onClick={() => setIsAnalyseModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Run New Analysis</span>
            </button>
          </div>

          {analysesHistory.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800">No comprehensive analysis report generated yet.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Click "ANALYSE PLANT" to run the complete computer vision and phenology pipeline.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {analysesHistory.map((ana) => (
                <div
                  key={ana.id}
                  onClick={() => {
                    setActiveAnalysisReport(ana);
                    setIsReportModalOpen(true);
                  }}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all bg-white shadow-2xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {new Date(ana.analysis_timestamp).toLocaleString()}
                        </span>
                        <StageBadge stage={ana.predicted_stage} size="sm" />
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Health Score: <strong>{ana.health_assessment.overall_health_score}/100</strong> ({ana.health_assessment.overall_health_status}) • GDD: {ana.growth_progress.accumulated_gdd} units
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-emerald-700">
                      View Report (A–I)
                    </span>
                    <ChevronRight className="w-4 h-4 text-emerald-700" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}

      {/* Add Observation Modal */}
      <ObservationModal
        plantId={plant.id}
        plantName={plant.name}
        cropType={plant.crop_type}
        isOpen={isObsModalOpen}
        onClose={() => setIsObsModalOpen(false)}
        onSuccess={handleObservationSaved}
      />

      {/* Photo Comparison Modal */}
      <PhotoComparisonModal
        observations={observations}
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
      />

      {/* Trigger Plant Analysis Modal */}
      <AnalysePlantModal
        plant={plant}
        observations={observations}
        isOpen={isAnalyseModalOpen}
        onClose={() => setIsAnalyseModalOpen(false)}
        onAnalysisComplete={handleAnalysisComplete}
      />

      {/* Report A Problem Modal */}
      <ReportProblemModal
        plantId={plant.id}
        plantName={plant.name}
        cropType={plant.crop_type}
        isOpen={isProblemModalOpen}
        onClose={() => setIsProblemModalOpen(false)}
        onSuccess={handleProblemReported}
        onNavigateToTreatment={onNavigateToTreatment}
      />

      {/* Geometric Anomaly Inspector Modal */}
      <GeometricInspectorModal
        plantId={plant.id}
        plantName={plant.name}
        cropType={plant.crop_type}
        isOpen={isGeometricModalOpen}
        onClose={() => setIsGeometricModalOpen(false)}
        observations={observations}
      />

      {/* Full Plant Analysis Report Modal (Sections A through I) */}
      <PlantAnalysisReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        analysis={activeAnalysisReport}
        onFeedbackSubmitted={loadData}
      />

      {/* Legacy Plant Scan & Growth Diagnosis Modal */}
      {activeDiagnosis && (
        <PlantScanAnalysisModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          plantName={plant.name}
          cropType={plant.crop_type}
          cropVariety={plant.crop_variety}
          photoUrl={activePhotoUrl}
          diagnosis={activeDiagnosis}
          onGenerateReport={() => window.print()}
          onNavigateToDatasets={() => {
            setIsScanModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
