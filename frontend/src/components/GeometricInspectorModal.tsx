import React, { useState, useEffect } from 'react';
import {
  X,
  Scan,
  Maximize2,
  Activity,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info,
  Calendar,
  Sparkles,
  Camera,
  Scale
} from 'lucide-react';
import { api } from '../api/client';
import { GeometricAnalysisResult, Observation } from '../types';

interface GeometricInspectorModalProps {
  plantId: string;
  plantName: string;
  cropType: string;
  isOpen: boolean;
  onClose: () => void;
  observations: Observation[];
}

export const GeometricInspectorModal: React.FC<GeometricInspectorModalProps> = ({
  plantId,
  plantName,
  cropType,
  isOpen,
  onClose,
  observations,
}) => {
  const [selectedObsId, setSelectedObsId] = useState<string>(
    observations.find((o) => o.image_path)?.id || ''
  );
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [activeResult, setActiveResult] = useState<GeometricAnalysisResult | null>(null);
  const [historyResults, setHistoryResults] = useState<GeometricAnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'overlay' | 'mask' | 'original'>('overlay');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, plantId]);

  const loadHistory = async () => {
    try {
      const history = await api.getPlantGeometricAnalyses(plantId);
      setHistoryResults(history);
      if (history.length > 0 && !activeResult) {
        setActiveResult(history[0]);
      }
    } catch (err: any) {
      console.warn('Could not load geometric analysis history:', err);
    }
  };

  if (!isOpen) return null;

  const handleCustomFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setCustomFile(f);
      setFilePreview(URL.createObjectURL(f));
      setSelectedObsId(''); // override observation selector
    }
  };

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const formData = new FormData();
      if (customFile) {
        formData.append('image', customFile);
      } else if (selectedObsId) {
        formData.append('observation_id', selectedObsId);
      }

      const result = await api.runGeometricAnalysis(plantId, formData);
      setActiveResult(result);
      setHistoryResults((prev) => [result, ...prev]);
    } catch (err: any) {
      console.error('Geometric inspection error:', err);
      setError(err.message || 'Failed to execute OpenCV geometric anomaly analysis.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-4">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center shadow-xs">
              <Scan className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Geometric Anomaly Inspector
              </h2>
              <p className="text-xs text-slate-500">
                {plantName} ({cropType}) • OpenCV Morphological & Boundary Analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Controls Bar: Source Selection & Trigger */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Select Existing Observation */}
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Select Observation Photograph:
                </label>
                <select
                  value={selectedObsId}
                  disabled={isRunning || !!customFile}
                  onChange={(e) => {
                    setSelectedObsId(e.target.value);
                    setCustomFile(null);
                    setFilePreview(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">Latest recorded photograph</option>
                  {observations
                    .filter((o) => o.image_path)
                    .map((obs) => (
                      <option key={obs.id} value={obs.id}>
                        {obs.ai_growth_stage || 'Observation'} ({new Date(obs.observation_date).toLocaleDateString()})
                      </option>
                    ))}
                </select>
              </div>

              {/* Or Upload Custom Image */}
              <div className="sm:w-48">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Or Upload New Photo:
                </label>
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition-colors">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{customFile ? customFile.name : 'Choose File'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomFileChange}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={isRunning}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 self-end sm:self-auto"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Computing OpenCV Geometry...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Geometric Analysis</span>
                </>
              )}
            </button>
          </div>

          {/* Active Inspection Presentation */}
          {activeResult ? (
            <div className="space-y-6">
              {/* Image Previews & View Mode Switcher */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Computer Vision Visualization:
                  </span>
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                    <button
                      onClick={() => setActiveViewMode('overlay')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeViewMode === 'overlay'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Contour Overlays
                    </button>
                    <button
                      onClick={() => setActiveViewMode('mask')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeViewMode === 'mask'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Binary Mask
                    </button>
                    <button
                      onClick={() => setActiveViewMode('original')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeViewMode === 'original'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Original
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Interactive Image Display */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-square flex items-center justify-center">
                    <img
                      src={
                        activeViewMode === 'overlay'
                          ? activeResult.processed_overlay_url
                          : activeViewMode === 'mask'
                          ? activeResult.mask_image_url
                          : activeResult.original_image_url
                      }
                      alt="Geometric Analysis"
                      className="w-full h-full object-contain"
                    />
                    {activeViewMode === 'overlay' && (
                      <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-slate-900/80 backdrop-blur-md text-[10px] text-white flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Contours
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Convex Hull
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> BBox
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Centroid
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Anomaly Status & Interpretation */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Anomaly Badge */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">Anomaly Index:</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              activeResult.anomaly_score >= 0.5
                                ? 'bg-rose-100 text-rose-800'
                                : activeResult.anomaly_score >= 0.25
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Score: {activeResult.anomaly_score.toFixed(2)} ({activeResult.reliability} Confidence)
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {activeResult.interpretation}
                        </p>
                      </div>

                      {/* Anomaly Flags List */}
                      {activeResult.anomaly_flags.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-800">Structural Anomaly Indicators:</span>
                          {activeResult.anomaly_flags.map((flag, i) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2"
                            >
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>{flag}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Scale Disclaimer Alert */}
                    <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                      <Scale className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed">
                        {activeResult.limitations_disclaimer}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Geometric Measurements Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800">
                  Extracted Geometric Features (OpenCV):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Leaf Area (px)</span>
                    <p className="text-sm font-black text-slate-900">{activeResult.leaf_area_px.toLocaleString()} px</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Perimeter (px)</span>
                    <p className="text-sm font-black text-slate-900">{activeResult.perimeter_px.toLocaleString()} px</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Aspect Ratio (W/H)</span>
                    <p className="text-sm font-black text-slate-900">{activeResult.aspect_ratio}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Circularity (4πA/P²)</span>
                    <p className="text-sm font-black text-slate-900">{activeResult.circularity}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Convexity (A / Ahull)</span>
                    <p className="text-sm font-black text-slate-900">{activeResult.convexity}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Asymmetry Index</span>
                    <p className="text-sm font-black text-slate-900">{activeResult.asymmetry_index}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Canopy Coverage</span>
                    <p className="text-sm font-black text-slate-900">{activeResult.canopy_coverage_pct}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Longitudinal ΔArea</span>
                    <p className={`text-sm font-black ${
                      activeResult.relative_area_change_pct < -15
                        ? 'text-rose-600'
                        : activeResult.relative_area_change_pct > 30
                        ? 'text-emerald-600'
                        : 'text-slate-900'
                    }`}>
                      {activeResult.relative_area_change_pct > 0 ? '+' : ''}{activeResult.relative_area_change_pct}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Scan className="w-10 h-10 text-slate-300 stroke-[1.5]" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">No Geometric Analysis Computed Yet</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Click 'Run Geometric Analysis' above to measure contour circularity, convexity, asymmetry, and canopy coverage.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            OpenCV Computer Vision Engine • PlantPulse Phenology Suite
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
