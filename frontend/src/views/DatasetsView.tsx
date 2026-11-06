import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Database,
  FileText,
  Search,
  ExternalLink,
  Printer,
  ChevronRight,
  Thermometer,
  Droplets,
  Sun,
  ShieldAlert,
  Sprout,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Layers,
  Sparkles,
  Check,
  X,
  Play,
  Eye,
  Scale,
  Loader2
} from 'lucide-react';
import { api } from '../api/client';
import {
  CropAgronomyProfile,
  TrainingDatasetItem,
  PlantReportResponse,
  Plant,
  DiseaseDatasetItem,
  DiseaseDatasetInferenceResponse,
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import { StageBadge } from '../components/StageBadge';

export const DatasetsView: React.FC = () => {
  const { t, language } = useLanguage();

  const [activeSubTab, setActiveSubTab] = useState<'disease_gallery' | 'profiles' | 'training' | 'reports'>('disease_gallery');

  // Disease Dataset Gallery state
  const [diseaseDatasets, setDiseaseDatasets] = useState<DiseaseDatasetItem[]>([]);
  const [selectedDiseaseItem, setSelectedDiseaseItem] = useState<DiseaseDatasetItem | null>(null);
  const [cropFilter, setCropFilter] = useState<'all' | 'tomato'>('all');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'healthy' | 'disease'>('all');
  const [isInferringId, setIsInferringId] = useState<string | null>(null);
  const [inferenceResult, setInferenceResult] = useState<DiseaseDatasetInferenceResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Crop Profiles state
  const [profiles, setProfiles] = useState<CropAgronomyProfile[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<string>('tomato');
  const [searchCrop, setSearchCrop] = useState('');
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // Training Datasets state
  const [trainingDatasets, setTrainingDatasets] = useState<TrainingDatasetItem[]>([]);
  const [isLoadingTraining, setIsLoadingTraining] = useState(false);

  // Plant Reports state
  const [userPlants, setUserPlants] = useState<Plant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [plantReport, setPlantReport] = useState<PlantReportResponse | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useEffect(() => {
    loadDiseaseDatasets();
    loadProfiles();
    loadTrainingDatasets();
    loadUserPlants();
  }, []);

  const loadDiseaseDatasets = async () => {
    try {
      const data = await api.getDiseaseDatasets();
      setDiseaseDatasets(data);
    } catch (err) {
      console.error('Failed to load disease datasets:', err);
    }
  };

  const handleTryInference = async (datasetId: string) => {
    setIsInferringId(datasetId);
    setInferenceResult(null);
    try {
      const res = await api.tryDiseaseDatasetImage(datasetId);
      setInferenceResult(res);
    } catch (err: any) {
      console.error('Inference failed:', err);
      alert(err.message || 'Inference failed on sample image');
    } finally {
      setIsInferringId(null);
    }
  };

  const loadProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const data = await api.getCropAgronomyProfiles();
      setProfiles(data);
      if (data.length > 0 && !selectedCropId) {
        setSelectedCropId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load crop profiles:', err);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const loadTrainingDatasets = async () => {
    setIsLoadingTraining(true);
    try {
      const data = await api.getTrainingDatasets();
      setTrainingDatasets(data);
    } catch (err) {
      console.error('Failed to load training datasets:', err);
    } finally {
      setIsLoadingTraining(false);
    }
  };

  const loadUserPlants = async () => {
    try {
      const data = await api.getPlants();
      setUserPlants(data);
      if (data.length > 0) {
        setSelectedPlantId(data[0].id);
        fetchReport(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load user plants for report:', err);
    }
  };

  const fetchReport = async (plantId: string) => {
    if (!plantId) return;
    setIsLoadingReport(true);
    try {
      const report = await api.getPlantReport(plantId);
      setPlantReport(report);
    } catch (err) {
      console.error('Failed to fetch plant report:', err);
      setPlantReport(null);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleSelectPlant = (plantId: string) => {
    setSelectedPlantId(plantId);
    fetchReport(plantId);
  };

  const activeProfile = profiles.find((p) => p.id === selectedCropId) || profiles[0];

  const filteredProfiles = profiles.filter((p) => {
    const q = searchCrop.toLowerCase();
    return (
      p.crop_name.toLowerCase().includes(q) ||
      p.scientific_name.toLowerCase().includes(q) ||
      Object.values(p.common_names || {}).some((cn) => cn.toLowerCase().includes(q))
    );
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t('datasets.title')}
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
              Agronomy v2.4
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t('datasets.subtitle')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 print:hidden overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('disease_gallery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'disease_gallery'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
            <span>Plant Disease Gallery</span>
          </button>
          <button
            onClick={() => setActiveSubTab('profiles')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'profiles'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t('datasets.tabProfiles')}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('training')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'training'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t('datasets.tabTraining')}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'reports'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('datasets.tabReports')}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB: PLANT DISEASE GALLERY */}
      {/* ========================================================================= */}
      {activeSubTab === 'disease_gallery' && (
        <div className="space-y-6">
          {/* Section Banner & Filter Toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Plant Disease Reference Gallery & Live Inference
                </h2>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                Authentic, licensed agricultural pathology image samples from PlantVillage and Mendeley Data research archives.
                Inspect characteristic symptoms and evaluate live model inference with transparent ground-truth comparison.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                <button
                  onClick={() => setCropFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    cropFilter === 'all' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Crops
                </button>
                <button
                  onClick={() => setCropFilter('tomato')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    cropFilter === 'tomato' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tomato
                </button>
              </div>

              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                <button
                  onClick={() => setConditionFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    conditionFilter === 'all' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All States
                </button>
                <button
                  onClick={() => setConditionFilter('disease')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    conditionFilter === 'disease' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Diseased
                </button>
                <button
                  onClick={() => setConditionFilter('healthy')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    conditionFilter === 'healthy' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Healthy
                </button>
              </div>
            </div>
          </div>

          {/* Inference Result Modal / Drawer if present */}
          {inferenceResult && (
            <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                    Live Model Inference & Ground-Truth Benchmark Output
                  </h3>
                </div>
                <button
                  onClick={() => setInferenceResult(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Known Dataset Label (Ground Truth):</span>
                  <p className="text-xs font-bold text-emerald-300">{inferenceResult.known_dataset_label}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Model Predicted Condition:</span>
                  <p className="text-xs font-bold text-white">{inferenceResult.model_predicted_condition}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Agreement & Confidence:</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inferenceResult.agreement_status.includes('matches')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {inferenceResult.agreement_status.includes('matches') ? 'Agreement' : 'Disagreement'}
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      Conf: {(inferenceResult.model_confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Botanical Indicators & Explanation */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
                  <span>Green Canopy: {(inferenceResult.botanical_indicators.green_canopy_ratio * 100).toFixed(1)}%</span>
                  <span>Chlorosis: {(inferenceResult.botanical_indicators.chlorosis_ratio * 100).toFixed(1)}%</span>
                  <span>Necrosis: {(inferenceResult.botanical_indicators.necrosis_ratio * 100).toFixed(1)}%</span>
                  <span>Latency: {inferenceResult.botanical_indicators.inference_time_ms}ms</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {inferenceResult.evaluation_notes}
                </p>
                {!inferenceResult.agreement_status.includes('matches') && (
                  <p className="text-[11px] text-amber-300 italic pt-1">
                    Notice: Disagreement is transparently reported without model suppression. Visual lesion patterns may display overlapping chlorotic stress cues.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {diseaseDatasets
              .filter((item) => {
                if (cropFilter !== 'all' && item.crop.toLowerCase() !== cropFilter) return false;
                if (conditionFilter === 'healthy' && !item.is_healthy) return false;
                if (conditionFilter === 'disease' && item.is_healthy) return false;
                return true;
              })
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Image Preview */}
                    <div className="relative aspect-4/3 bg-slate-950 overflow-hidden group">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md text-[10px] font-black text-white uppercase tracking-wider">
                          {item.crop}
                        </span>
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider ${
                          item.is_healthy
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-rose-500/90 text-white'
                        }`}>
                          {item.is_healthy ? 'HEALTHY BASELINE' : 'PATHOGEN'}
                        </span>
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/70 text-[9px] font-mono text-slate-300">
                        {item.image_count_in_dataset.toLocaleString()} verified samples
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          {item.title}
                        </h3>
                        <p className="text-xs italic text-slate-500 font-serif">
                          {item.scientific_name}
                        </p>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Symptoms */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Key Diagnostic Symptoms:
                        </span>
                        <ul className="space-y-1 text-xs text-slate-700">
                          {item.typical_symptoms.slice(0, 3).map((sym, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                              <span>{sym}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* License & Source */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[160px]">{item.dataset_source}</span>
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {item.license.split(' ')[0]} {item.license.split(' ')[1] || ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedDiseaseItem(item);
                        setIsDetailModalOpen(true);
                      }}
                      className="flex-1 py-2 px-3 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-colors text-center"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleTryInference(item.id)}
                      disabled={isInferringId === item.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                    >
                      {isInferringId === item.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Inferring...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Try Example Image</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Specimen Detail Modal */}
          {isDetailModalOpen && selectedDiseaseItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">
                      Pathology Specimen Record
                    </span>
                    <h2 className="text-xl font-black text-slate-900">
                      {selectedDiseaseItem.title}
                    </h2>
                    <p className="text-xs italic text-slate-500 font-serif">
                      {selectedDiseaseItem.scientific_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="aspect-16/9 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200">
                  <img
                    src={selectedDiseaseItem.image_url}
                    alt={selectedDiseaseItem.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">Causal Organism:</span>
                    <p className="text-slate-600">{selectedDiseaseItem.causal_organism}</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block">Dataset Class Label:</span>
                    <p className="font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md inline-block">
                      {selectedDiseaseItem.class_label}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block">Botanical Description:</span>
                    <p className="text-slate-700 leading-relaxed">{selectedDiseaseItem.description}</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block mb-1">Characteristic Field Symptoms:</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {selectedDiseaseItem.typical_symptoms.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[11px] text-slate-500">
                    <div><span className="font-bold text-slate-700">Source Repository:</span> {selectedDiseaseItem.dataset_source}</div>
                    <div><span className="font-bold text-slate-700">Distribution License:</span> {selectedDiseaseItem.license}</div>
                    <div><span className="font-bold text-slate-700">Dataset Specimen Pool:</span> {selectedDiseaseItem.image_count_in_dataset.toLocaleString()} photographic files</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleTryInference(selectedDiseaseItem.id);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Inference on Specimen</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CROP AGRONOMIC PROFILES */}
      {/* ========================================================================= */}
      {activeSubTab === 'profiles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Crop List & Search */}
          <div className="lg:col-span-4 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={t('datasets.searchCrops')}
                value={searchCrop}
                onChange={(e) => setSearchCrop(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
              {filteredProfiles.map((crop) => {
                const isSelected = crop.id === selectedCropId;
                const vernacularName = crop.common_names?.[language] || crop.common_names?.['en'];
                return (
                  <button
                    key={crop.id}
                    onClick={() => setSelectedCropId(crop.id)}
                    className={`w-full text-left p-3.5 flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/80 border-l-4 border-emerald-600 text-emerald-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        <Sprout className="w-4 h-4 text-emerald-600" />
                        <span>{crop.crop_name}</span>
                        {vernacularName && (
                          <span className="text-xs font-normal text-slate-500">
                            ({vernacularName})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] italic text-slate-500 mt-0.5">
                        {crop.scientific_name}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Agronomic Profile Detail */}
          <div className="lg:col-span-8">
            {activeProfile ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <span>{activeProfile.crop_name}</span>
                      <span className="text-sm font-semibold italic text-slate-500">
                        {activeProfile.scientific_name}
                      </span>
                    </h2>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                      <span>English: {activeProfile.common_names?.en}</span>
                      <span>•</span>
                      <span>ಕನ್ನಡ: {activeProfile.common_names?.kn}</span>
                      <span>•</span>
                      <span>हिन्दी: {activeProfile.common_names?.hi}</span>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Source: {activeProfile.dataset_source}
                  </span>
                </div>

                {/* Biophysical Baselines Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Thermometer className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t('datasets.baseTemp')}</span>
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {activeProfile.base_temperature_c}°C
                    </div>
                    <div className="text-[10px] text-slate-400">Cutoff: {activeProfile.cutoff_temperature_c}°C</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Sun className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t('datasets.optimalTemp')}</span>
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {activeProfile.optimal_temperature_c.min}°C – {activeProfile.optimal_temperature_c.max}°C
                    </div>
                    <div className="text-[10px] text-slate-400">Daytime baseline</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Droplets className="w-3.5 h-3.5 text-sky-600" />
                      <span>{t('datasets.optimalMoisture')}</span>
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {activeProfile.optimal_soil_moisture_pct.min}% – {activeProfile.optimal_soil_moisture_pct.max}%
                    </div>
                    <div className="text-[10px] text-slate-400">Volumetric water content</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{t('datasets.optimalPh')}</span>
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {activeProfile.optimal_soil_ph.min} – {activeProfile.optimal_soil_ph.max}
                    </div>
                    <div className="text-[10px] text-slate-400">Root zone buffer</div>
                  </div>
                </div>

                {/* Growth Stage Progression Breakdown */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>{t('datasets.stageBreakdown')}</span>
                  </h3>
                  <div className="space-y-3">
                    {activeProfile.critical_growth_stages.map((stg) => (
                      <div
                        key={stg.stage_name}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                              {stg.order}
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {stg.stage_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>Duration: ~{stg.typical_duration_days} days</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-800">
                              Min GDD: {stg.min_gdd_threshold}°C-days
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs mt-2 pt-2 border-t border-slate-200">
                          <div>
                            <span className="font-bold text-slate-700 block mb-1">Visual Indicators:</span>
                            <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                              {stg.visual_characteristics.map((vc, i) => (
                                <li key={i}>{vc}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="font-bold text-emerald-800 block mb-1">Recommended Practices:</span>
                            <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                              {stg.recommended_practices.map((rp, i) => (
                                <li key={i}>{rp}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="font-bold text-rose-800 block mb-1">Key Risks:</span>
                            <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                              {stg.key_risks.map((kr, i) => (
                                <li key={i}>{kr}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stress Factors & Institutional References */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                    <h4 className="font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                      <ShieldAlert className="w-4 h-4 text-amber-700" />
                      <span>{t('datasets.stressFactors')}</span>
                    </h4>
                    <ul className="list-disc list-inside text-amber-950 space-y-1">
                      {activeProfile.common_stress_factors.map((sf, i) => (
                        <li key={i}>{sf}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                      <BookOpen className="w-4 h-4 text-emerald-700" />
                      <span>{t('datasets.references')}</span>
                    </h4>
                    <ul className="list-disc list-inside text-slate-600 space-y-1">
                      {activeProfile.icar_fao_references.map((ref, i) => (
                        <li key={i}>{ref}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                {t('common.loading')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI TRAINING DATASETS */}
      {/* ========================================================================= */}
      {activeSubTab === 'training' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Authentic Computer Vision Repositories:</span> PlantPulse AI's convolutional growth-stage classification models are trained and benchmarked against standardized, peer-reviewed agricultural imagery corpuses with multi-expert phenological labels.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainingDatasets.map((ds) => (
              <div
                key={ds.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {ds.dataset_name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {ds.provider} ({ds.publication_year})
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-800">
                      {ds.benchmark_accuracy} Accuracy
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {ds.description}
                  </p>

                  <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                    <div className="flex justify-between text-slate-600">
                      <span className="font-semibold text-slate-700">{t('datasets.totalImages')}:</span>
                      <span className="font-bold text-slate-900">{ds.total_images.toLocaleString()} images</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="font-semibold text-slate-700">{t('datasets.license')}:</span>
                      <span className="font-mono text-slate-800">{ds.license}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="font-semibold text-slate-700">Supported Crops:</span>
                      <span className="text-slate-900">{ds.supported_crops.join(', ')}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {ds.annotated_growth_stages.map((stg) => (
                        <span key={stg} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {stg}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <a
                    href={ds.reference_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    <span>{t('datasets.viewExternal')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MY PLANT REPORTS (Printable / PDF) */}
      {/* ========================================================================= */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          {/* Plant Selector Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('datasets.selectPlantReport')}
              </label>
              <select
                value={selectedPlantId}
                onChange={(e) => handleSelectPlant(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              >
                {userPlants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.crop_type} - {p.crop_variety})
                  </option>
                ))}
              </select>
            </div>

            {plantReport && (
              <button
                onClick={handlePrint}
                className="self-end sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md shadow-emerald-900/20 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>{t('datasets.printReport')}</span>
              </button>
            )}
          </div>

          {/* Report Display Container */}
          {isLoadingReport ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              {t('common.loading')}
            </div>
          ) : plantReport ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 print:shadow-none print:border-none print:p-0">
              {/* Report Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-emerald-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      PLANTPULSE AI CROP AGRONOMY DOSSIER
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Individual Phenological Milestone and Biophysical Diagnostic Report
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs text-slate-500">
                  <div className="font-mono text-slate-700 font-bold">Plant ID: {plantReport.plant_id.slice(0, 8)}</div>
                  <div>Report Date: {new Date(plantReport.report_generated_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Plant Meta Details Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Plant Name / Tag:</span>
                  <span className="font-bold text-slate-900 text-sm">{plantReport.plant_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Crop & Variety:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {plantReport.crop_type} ({plantReport.crop_variety})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Phenology:</span>
                  <span className="font-bold text-emerald-800 text-sm">
                    {plantReport.current_stage}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sowing / Planting Date:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {plantReport.planting_date}
                  </span>
                </div>
              </div>

              {/* Observation & Microclimate Summary Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Field Observation Summary */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('datasets.observationHistory')}</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-600">Total Recorded Observations:</span>
                      <span className="font-bold text-slate-900">{plantReport.observation_summary.total_observations}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-600">Monitoring Duration:</span>
                      <span className="font-bold text-slate-900">{plantReport.observation_summary.days_monitored} days</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-600">Initial Observation:</span>
                      <span className="font-medium text-slate-800">{plantReport.observation_summary.first_observation_date || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-600">Latest Observation:</span>
                      <span className="font-medium text-slate-800">{plantReport.observation_summary.latest_observation_date || 'N/A'}</span>
                    </div>
                    <div className="pt-1">
                      <span className="text-slate-600 block mb-1">Stages Observed:</span>
                      <div className="flex flex-wrap gap-1">
                        {plantReport.observation_summary.stages_observed.map((stg) => (
                          <span key={stg} className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                            {stg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Microclimate Summary */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t('datasets.microclimateOverview')}</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <span className="text-slate-500 block text-[10px]">Mean Temperature:</span>
                      <span className="text-sm font-bold text-slate-900">
                        {plantReport.microclimate_summary.mean_temperature_c !== null
                          ? `${plantReport.microclimate_summary.mean_temperature_c}°C`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <span className="text-slate-500 block text-[10px]">Mean Soil Moisture:</span>
                      <span className="text-sm font-bold text-slate-900">
                        {plantReport.microclimate_summary.mean_soil_moisture_pct !== null
                          ? `${plantReport.microclimate_summary.mean_soil_moisture_pct}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <span className="text-slate-500 block text-[10px]">Mean Relative Humidity:</span>
                      <span className="text-sm font-bold text-slate-900">
                        {plantReport.microclimate_summary.mean_humidity_pct !== null
                          ? `${plantReport.microclimate_summary.mean_humidity_pct}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <span className="text-slate-500 block text-[10px]">Precipitation / Sunlight:</span>
                      <span className="text-sm font-bold text-slate-900">
                        {plantReport.microclimate_summary.total_rainfall_mm ?? 0}mm / {plantReport.microclimate_summary.mean_sunlight_hours ?? 0}h
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 text-right">
                    Verified telemetry readings: {plantReport.microclimate_summary.readings_count}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {plantReport.agricultural_recommendations && plantReport.agricultural_recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Targeted Agronomic Actions</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {plantReport.agricultural_recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border text-xs ${
                          rec.severity === 'warning'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        }`}
                      >
                        <div className="font-bold mb-0.5">{rec.title}</div>
                        <p className="text-[11px] leading-relaxed opacity-90">{rec.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scientific Limitations & Sign-off */}
              <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div className="font-bold text-slate-700">Biophysical Disclaimers & Model Bounds:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {plantReport.limitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              No registered plant selected. Register a plant to generate agronomic reports.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
