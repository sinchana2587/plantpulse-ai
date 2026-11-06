import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Upload,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Check,
  BookOpen,
  ArrowRight,
  RefreshCw,
  HeartPulse
} from 'lucide-react';
import { api } from '../api/client';
import { PlantProblemResponse } from '../types';
import { VoiceFieldControl } from './VoiceFieldControl';

interface ReportProblemModalProps {
  plantId: string;
  plantName: string;
  cropType: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (problem: PlantProblemResponse) => void;
  onNavigateToTreatment?: () => void;
}

const CATEGORIES = [
  'Leaf Yellowing / Chlorosis',
  'Wilting / Drooping',
  'Stunted Growth',
  'Foliar Spotting / Lesions',
  'Flower or Fruit Drop',
  'Pest / Insect Damage',
  'Other / Unspecified Stress'
];

const AFFECTED_PARTS = [
  'Whole plant',
  'Lower leaves',
  'Upper canopy / Shoot tips',
  'Flowers / Inflorescence',
  'Fruit / Pods',
  'Stem collar & Roots'
];

const PROCESSING_STAGES = [
  'Submitting plant information & microclimate telemetry',
  'Processing photograph & computer vision features',
  'Analysing visible symptoms & foliar pigmentation',
  'Reviewing historical sensor records & GDD context',
  'Correlating with ICAR / FAO agronomic benchmarks',
  'Formulating evidence-based treatment regimen'
];

export const ReportProblemModal: React.FC<ReportProblemModalProps> = ({
  plantId,
  plantName,
  cropType,
  isOpen,
  onClose,
  onSuccess,
  onNavigateToTreatment,
}) => {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [affectedPart, setAffectedPart] = useState(AFFECTED_PARTS[0]);
  const [description, setDescription] = useState('');
  const [onsetDate, setOnsetDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSpreading, setIsSpreading] = useState<'yes' | 'no' | 'unsure'>('unsure');
  const [irrigationNotes, setIrrigationNotes] = useState('');
  const [fertilizerNotes, setFertilizerNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<PlantProblemResponse | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setFilePreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!description.trim() || description.length < 5) {
      setError('Please provide a detailed symptom description (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setCurrentStepIndex(0);

    // Multi-step progressive status animation
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < PROCESSING_STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 450);

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('affected_part', affectedPart);
      formData.append('description', description);
      formData.append('onset_date', onsetDate);
      formData.append('is_spreading', isSpreading);
      if (irrigationNotes) formData.append('irrigation_notes', irrigationNotes);
      if (fertilizerNotes) formData.append('fertilizer_notes', fertilizerNotes);
      if (selectedFile) formData.append('image', selectedFile);

      const result = await api.reportPlantProblem(plantId, formData);
      clearInterval(stepInterval);
      setCurrentStepIndex(PROCESSING_STAGES.length - 1);
      setDiagnosisResult(result);
      onSuccess(result);
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error('Diagnosis error:', err);
      let msg = 'Failed to submit problem report.';
      if (typeof err === 'string') msg = err;
      else if (err.message && err.message !== '[object Object]') msg = err.message;
      else if (err.detail) msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setDiagnosisResult(null);
    setDescription('');
    setSelectedFile(null);
    setFilePreview(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden my-4">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Report a Plant Growth Problem / Stress
              </h2>
              <p className="text-xs text-slate-500">
                {plantName} ({cropType}) • AI Agronomic Diagnosis
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {isSubmitting ? (
            /* Multi-step Progressive Status */
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-lg relative animate-pulse">
                <Sparkles className="w-8 h-8 text-emerald-700 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  AI Botanical & Pathogen Diagnosis in Progress
                </h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Correlating photograph computer vision features, farmer observations, and ICAR/FAO agronomic stress standards.
                </p>
              </div>

              {/* Progress Steps list */}
              <div className="w-full max-w-md bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-left text-xs">
                {PROCESSING_STAGES.map((stg, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={isDone ? 'text-slate-700 font-medium' : isCurrent ? 'text-emerald-900 font-bold' : 'text-slate-400'}>
                        {stg}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : diagnosisResult ? (
            /* AI Diagnosis Presentation View */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      AI Agronomic Diagnosis Generated
                    </span>
                  </div>
                  {diagnosisResult.analyses.length > 0 && (
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                      diagnosisResult.analyses[0].severity === 'Severe' || diagnosisResult.analyses[0].severity === 'High'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      Severity: {diagnosisResult.analyses[0].severity}
                    </span>
                  )}
                </div>
                {diagnosisResult.analyses.length > 0 && (
                  <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                    {diagnosisResult.analyses[0].summary}
                  </p>
                )}
              </div>

              {diagnosisResult.analyses.length > 0 && (
                <>
                  {/* Probable Causes */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800">Probable Causes Identified:</span>
                    <div className="space-y-2">
                      {diagnosisResult.analyses[0].probable_causes.map((c, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{c.cause}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.likelihood === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              Likelihood: {c.likelihood}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">{c.reasoning}</p>
                          <p className="text-slate-400 text-[10px]">Context: {c.supporting_evidence}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Immediate Recommended Actions */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800">Immediate Cultural Interventions:</span>
                    <div className="space-y-1.5">
                      {diagnosisResult.analyses[0].recommended_actions.map((act, i) => (
                        <div key={i} className="flex items-start gap-2 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100 text-xs">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-slate-700">{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Precautions to Prevent Spread */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800">Precautions to Prevent Spread:</span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {diagnosisResult.analyses[0].precautions.map((prec, i) => (
                        <li key={i}>{prec}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Follow-up & Agricultural Extension Guidance */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Follow-up & Extension Officer Advisory:</span>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      {diagnosisResult.analyses[0].expert_guidance}
                    </p>
                    <p className="text-amber-800 font-semibold text-[11px] pt-1">
                      Inspection Schedule: {diagnosisResult.analyses[0].follow_up_schedule}
                    </p>
                  </div>
                </>
              )}

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    handleResetAndClose();
                    if (onNavigateToTreatment) {
                      onNavigateToTreatment();
                    } else {
                      window.location.href = '/treatment';
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs"
                >
                  <HeartPulse className="w-4 h-4" />
                  <span>View Treatment & Recovery Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Save & Finish
                </button>
              </div>
            </div>
          ) : (
            /* Problem Submission Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Problem Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Affected Part */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Affected Plant Part *</label>
                  <select
                    value={affectedPart}
                    onChange={(e) => setAffectedPart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {AFFECTED_PARTS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Onset Date & Spreading */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Onset Date (First Noticed)</label>
                  <input
                    type="date"
                    value={onsetDate}
                    onChange={(e) => setOnsetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Is it spreading to neighboring leaves/plants?</label>
                  <div className="flex items-center gap-2 pt-1">
                    {(['yes', 'no', 'unsure'] as const).map((opt) => (
                      <label
                        key={opt}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          isSpreading === opt
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="is_spreading"
                          value={opt}
                          checked={isSpreading === opt}
                          onChange={() => setIsSpreading(opt)}
                          className="sr-only"
                        />
                        <span className="capitalize">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description with Voice Assistance */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Describe Symptoms & Observations *
                  </label>
                  <VoiceFieldControl
                    fieldName="symptoms"
                    fieldExplanation="Describe any visible leaf yellowing, wilting, spotting, or insect damage observed on this plant."
                    onDictate={(t) => setDescription((prev) => (prev ? `${prev} ${t}` : t))}
                  />
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. It has become dry and it is not growing. Whole plant foliage is yellowing."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Irrigation and Fertilizer Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Recent Irrigation Frequency</label>
                  <input
                    type="text"
                    value={irrigationNotes}
                    onChange={(e) => setIrrigationNotes(e.target.value)}
                    placeholder="e.g. 2L drip every morning"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Recent Fertiliser / Feed Application</label>
                  <input
                    type="text"
                    value={fertilizerNotes}
                    onChange={(e) => setFertilizerNotes(e.target.value)}
                    placeholder="e.g. Vermicompost 2 weeks ago"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Optional Photo Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Attach Photograph (Optional)</label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600">
                      {selectedFile ? selectedFile.name : 'Select or capture photo of affected part'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  {filePreview && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Diagnose Problem with AI</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
