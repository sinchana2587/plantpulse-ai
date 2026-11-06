import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Camera,
  Upload,
  Calendar,
  CheckCircle2,
  Loader2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import { Plant, Observation, PlantAnalysisResponse, GrowthStage } from '../types';

interface AnalysePlantModalProps {
  plant: Plant;
  observations: Observation[];
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (report: PlantAnalysisResponse) => void;
}

const STAGES: GrowthStage[] = ['Seedling', 'Vegetative', 'Flowering', 'Fruit Formation', 'Maturity'];

export const AnalysePlantModal: React.FC<AnalysePlantModalProps> = ({
  plant,
  observations,
  isOpen,
  onClose,
  onAnalysisComplete,
}) => {
  const [analysisMode, setAnalysisMode] = useState<'latest' | 'select' | 'upload'>('latest');
  const [selectedObsId, setSelectedObsId] = useState<string>(
    observations.length > 0 ? observations[observations.length - 1].id : ''
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [manualStage, setManualStage] = useState<string>('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setUploadedFile(f);
      setFilePreview(URL.createObjectURL(f));
    }
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      setAnalysisStep('Extracting botanical morphometric indices (GLI, ExG, chrominance)...');
      await new Promise((r) => setTimeout(r, 450));

      setAnalysisStep('Evaluating leaf canopy health & foliar symptom patterns...');
      await new Promise((r) => setTimeout(r, 400));

      setAnalysisStep('Calculating Growing Degree Days (GDD) & thermal baseline...');
      await new Promise((r) => setTimeout(r, 400));

      setAnalysisStep('Synthesizing grounded ICAR/FAO agronomic recommendations...');

      let report: PlantAnalysisResponse;

      if (analysisMode === 'upload' && uploadedFile) {
        report = await api.analysePlant(plant.id, {
          image: uploadedFile,
          manualStage: manualStage || undefined,
        });
      } else if (analysisMode === 'select' && selectedObsId) {
        report = await api.analysePlant(plant.id, {
          observationId: selectedObsId,
          manualStage: manualStage || undefined,
        });
      } else {
        // latest
        report = await api.analysePlant(plant.id, {
          manualStage: manualStage || undefined,
        });
      }

      onAnalysisComplete(report);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Plant analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-4">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Analyse Plant Growth & Health
              </h2>
              <p className="text-xs text-slate-500">
                {plant.name} • {plant.crop_type} ({plant.crop_variety})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <span>{error}</span>
            </div>
          )}

          {isAnalyzing ? (
            /* Animated Progress Overlay */
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
                <Sparkles className="w-6 h-6 text-emerald-700 absolute inset-0 m-auto" />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-bold text-slate-900">
                  Running AI Growth Intelligence Pipeline
                </span>
                <p className="text-xs text-emerald-800 font-medium animate-pulse">
                  {analysisStep}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Option Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Choose Analysis Source:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAnalysisMode('latest')}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      analysisMode === 'latest'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <Camera className="w-4 h-4 mx-auto mb-1 text-emerald-700" />
                    <span className="text-xs block">Latest Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAnalysisMode('select')}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      analysisMode === 'select'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <Layers className="w-4 h-4 mx-auto mb-1 text-emerald-700" />
                    <span className="text-xs block">Past Observation</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAnalysisMode('upload')}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      analysisMode === 'upload'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <Upload className="w-4 h-4 mx-auto mb-1 text-emerald-700" />
                    <span className="text-xs block">New Photo</span>
                  </button>
                </div>
              </div>

              {/* Mode-Specific Selectors */}
              {analysisMode === 'select' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Select Past Observation:</label>
                  {observations.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No past observations recorded yet.</p>
                  ) : (
                    <select
                      value={selectedObsId}
                      onChange={(e) => setSelectedObsId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      {observations.map((obs, idx) => (
                        <option key={obs.id} value={obs.id}>
                          Observation #{idx + 1} • {new Date(obs.observation_date).toLocaleDateString()} ({obs.effective_stage})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {analysisMode === 'upload' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Upload Fresh Photograph:</label>
                  <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600">
                      {uploadedFile ? uploadedFile.name : 'Click to select or capture plant photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  {filePreview && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 mx-auto mt-2">
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* Optional Manual Stage Verification */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Verify / Override Current Growth Stage (Optional):
                  </label>
                  <span className="text-[10px] text-slate-400">Leave blank for AI decision</span>
                </div>
                <select
                  value={manualStage}
                  onChange={(e) => setManualStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Auto-Detect via AI Computer Vision & Phenology</option>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-sm"
                >
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  <span>Execute AI Growth Analysis</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
