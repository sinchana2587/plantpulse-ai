import React from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  ArrowRight,
  Droplets,
  Sun,
  ShieldCheck,
  FileText,
  BookOpen,
  Sparkles,
  Printer,
  ChevronRight,
  Sprout,
  Activity,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { ScanDiagnosisResult } from '../services/scanAnalysisService';
import { StageBadge } from './StageBadge';
import { useLanguage } from '../context/LanguageContext';

interface PlantScanAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantName: string;
  cropType: string;
  cropVariety: string;
  photoUrl?: string | null;
  diagnosis: ScanDiagnosisResult;
  onNavigateToDatasets?: (cropId: string) => void;
  onGenerateReport?: () => void;
}

export const PlantScanAnalysisModal: React.FC<PlantScanAnalysisModalProps> = ({
  isOpen,
  onClose,
  plantName,
  cropType,
  cropVariety,
  photoUrl,
  diagnosis,
  onNavigateToDatasets,
  onGenerateReport,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-green-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Plant Scan & Growth Diagnosis</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  AI Vision Scan
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 font-medium">
                {plantName} • {cropType} ({cropVariety})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Top Scan Overview & Growth Stage */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            {photoUrl && (
              <div className="md:col-span-4 shrink-0">
                <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 shadow-xs relative bg-slate-900">
                  <img
                    src={photoUrl}
                    alt={plantName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] text-white font-semibold">
                    Analyzed Photograph
                  </div>
                </div>
              </div>
            )}

            <div className={`${photoUrl ? 'md:col-span-8' : 'md:col-span-12'} space-y-3 flex flex-col justify-between`}>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Detected Growth Stage:
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    {diagnosis.confidenceScore}% Confidence
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StageBadge stage={diagnosis.currentStage} size="lg" />
                </div>
              </div>

              {/* Time taken to growth */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-500 block text-[11px] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Time Taken to Current Growth:
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {diagnosis.daysSincePlanting} days
                  </span>
                  <span className="text-[10px] text-slate-400 block">since sowing baseline</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-500 block text-[11px] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    Typical Stage Duration:
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {diagnosis.typicalStageDuration}
                  </span>
                  <span className="text-[10px] text-slate-400 block">for {cropType}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lifecycle Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                Phenological Lifecycle Progression
              </span>
              <span className="text-emerald-700">{diagnosis.lifecycleProgressPct}% Completed</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
              {diagnosis.stagesProgression.map((s, idx) => (
                <div
                  key={idx}
                  title={`${s.stage} (${s.days})`}
                  className={`h-full flex-1 transition-all ${
                    s.status === 'completed'
                      ? 'bg-emerald-600'
                      : s.status === 'current'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium px-0.5">
              {diagnosis.stagesProgression.map((s, idx) => (
                <span
                  key={idx}
                  className={s.status === 'current' ? 'text-amber-800 font-bold' : ''}
                >
                  {s.stage}
                </span>
              ))}
            </div>
          </div>

          {/* 1. Next Stage of the Plant */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-amber-900 text-xs uppercase tracking-wider block mb-0.5">
                Upcoming Next Stage:
              </span>
              <div className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                <span>{diagnosis.nextStageName}</span>
                <ArrowRight className="w-4 h-4 text-amber-700" />
              </div>
              <p className="text-slate-600 mt-1">
                Estimated transition window in <strong className="text-slate-900">~{diagnosis.estimatedDaysToNextStage} days</strong> based on Growing Degree Days (GDD) accumulation.
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs shrink-0 self-start sm:self-auto border border-amber-300">
              Next Milestone: ~{diagnosis.estimatedDaysToNextStage}d
            </span>
          </div>

          {/* 2. Proper Growth Care Actions (Things to do for proper growth) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Things to Do for Proper Growth ({diagnosis.currentStage} Stage)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {diagnosis.careChecklist.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{item.title}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        item.priority === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Nutrition & Nutrient Health Status */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-700" />
                Nutritional Status & Fertilizer Requirements
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {diagnosis.nutritionGuidance.healthStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="font-bold text-slate-700 block mb-0.5">Recommended N-P-K Ratio:</span>
                <span className="font-extrabold text-emerald-800 text-sm block">
                  {diagnosis.nutritionGuidance.npkRatio}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Focus: <strong>{diagnosis.nutritionGuidance.focusNutrient}</strong>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="font-bold text-slate-700 block mb-0.5">Essential Micronutrients:</span>
                <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                  {diagnosis.nutritionGuidance.micronutrients.map((micro, i) => (
                    <li key={i}>{micro}</li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 italic pt-1">
              Agronomist Note: {diagnosis.nutritionGuidance.advice}
            </p>
          </div>

          {/* 4. Watering Schedule & Optimal Timing */}
          <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-2 text-xs">
            <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-blue-600" />
              Optimal Watering Schedule & Timing
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-white border border-blue-200">
                <span className="text-[11px] text-slate-500 block">Best Time to Water:</span>
                <span className="text-sm font-black text-blue-900 block mt-0.5">
                  {diagnosis.wateringSchedule.optimalTime}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Before solar peak to prevent fungal disease & evaporative loss
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-blue-200">
                <span className="text-[11px] text-slate-500 block">Target Root Moisture:</span>
                <span className="text-sm font-black text-blue-900 block mt-0.5">
                  {diagnosis.wateringSchedule.targetMoistureBand}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Method: {diagnosis.wateringSchedule.irrigationMethod}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-blue-200">
                <span className="text-[11px] text-slate-500 block">Application Frequency:</span>
                <span className="text-sm font-black text-blue-900 block mt-0.5">
                  {diagnosis.wateringSchedule.frequency}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/80 border border-blue-200 text-[11px] text-blue-900 font-medium">
              💧 {diagnosis.wateringSchedule.urgencyNote}
            </div>
          </div>
        </div>

        {/* Modal Footer with Report & Dataset Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onGenerateReport && (
              <button
                type="button"
                onClick={onGenerateReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Generate Plant Report (PDF / Print)</span>
              </button>
            )}

            {onNavigateToDatasets && (
              <button
                type="button"
                onClick={() => onNavigateToDatasets(diagnosis.cropKnowledgeId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 shadow-2xs cursor-pointer transition-all"
              >
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span>Inspect in Dataset Library</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
