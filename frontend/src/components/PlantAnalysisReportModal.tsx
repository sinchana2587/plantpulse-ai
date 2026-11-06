import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  Droplets,
  Sun,
  Thermometer,
  ShieldAlert,
  Info,
  Check,
  Award,
  Layers,
  Leaf,
  Activity,
  ThumbsUp,
  ThumbsDown,
  Eye,
  BookOpen
} from 'lucide-react';
import { PlantAnalysisResponse } from '../types';
import { StageBadge } from './StageBadge';
import { api } from '../api/client';

interface PlantAnalysisReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: PlantAnalysisResponse | null;
  onFeedbackSubmitted?: () => void;
}

export const PlantAnalysisReportModal: React.FC<PlantAnalysisReportModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onFeedbackSubmitted,
}) => {
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  if (!isOpen || !analysis) return null;

  const handleFeedback = async (type: 'accurate' | 'inaccurate') => {
    setIsSubmittingFeedback(true);
    try {
      await api.submitAnalysisFeedback(analysis.id, type);
      setFeedbackSent(type);
      if (onFeedbackSubmitted) onFeedbackSubmitted();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'optimal':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'low stress':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'moderate concern':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-rose-700 bg-rose-50 border-rose-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-4">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  AI Plant Growth & Health Intelligence Report
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Verified Analysis
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {analysis.plant_overview.name} ({analysis.plant_overview.crop_type} - {analysis.plant_overview.crop_variety}) • {new Date(analysis.analysis_timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors shadow-2xs"
              title="Print or export as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Sections A through I */}
        <div className="p-6 sm:p-8 space-y-8 overflow-y-auto print:p-0">
          {/* SECTION A: Plant Overview & Photo Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80">
            <div className="md:col-span-1 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 relative h-48 md:h-full min-h-[180px]">
              {analysis.image_url ? (
                <img
                  src={analysis.image_url}
                  alt={analysis.plant_overview.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <Leaf className="w-10 h-10 mb-2" />
                  <span className="text-xs">No photograph stored</span>
                </div>
              )}
              <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-900/70 text-white backdrop-blur-xs">
                Analyzed Specimen
              </div>
            </div>

            <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Section A • Plant Overview
                  </span>
                  <span className="text-xs text-slate-500">
                    ID: {analysis.plant_overview.id.substring(0, 8)}...
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {analysis.plant_overview.name}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Location: <strong>{analysis.plant_overview.location}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold">Crop Type</span>
                  <span className="text-xs font-bold text-slate-800">{analysis.plant_overview.crop_type}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold">Cultivar</span>
                  <span className="text-xs font-bold text-slate-800">{analysis.plant_overview.crop_variety}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold">Days in Ground</span>
                  <span className="text-xs font-bold text-emerald-800">{analysis.plant_overview.days_since_planting} days</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold">Planted Date</span>
                  <span className="text-xs font-bold text-slate-800">{analysis.plant_overview.planting_date}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B: Current Stage Classification & Botanical Visual Cues */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Section B • Morphological Stage & Visual Cues
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Crop Growth Stage Classification
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <StageBadge stage={analysis.predicted_stage} size="lg" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">AI Vision Model Confidence</span>
                  <span className="text-sm font-black text-emerald-700">
                    {Math.round(analysis.confidence_score * 100)}%
                  </span>
                </div>
                <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(analysis.confidence_score * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  {analysis.model_metadata.model_transparency_note}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Extracted Botanical Indicators
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px]">Canopy Coverage:</span>{' '}
                    <strong className="text-slate-800">{analysis.botanical_visual_cues.canopy_coverage_pct}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Green Leaf Index (GLI):</span>{' '}
                    <strong className="text-slate-800">{analysis.botanical_visual_cues.green_leaf_index}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Flower Bloom Ratio:</span>{' '}
                    <strong className="text-slate-800">{Math.round(analysis.botanical_visual_cues.flower_bloom_ratio * 1000) / 10}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Ripening Fruit Pigment:</span>{' '}
                    <strong className="text-slate-800">{Math.round(analysis.botanical_visual_cues.fruit_ripening_pigment_ratio * 1000) / 10}%</strong>
                  </div>
                </div>
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {analysis.botanical_visual_cues.visual_stage_markers.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200 text-slate-700">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION C & D: Growth Progress, GDD Thermal Units & Future Milestones */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Section C & D • Phenological Trajectory & Milestone Forecasting
            </span>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Cumulative Thermal Time (GDD)</span>
                  <div className="text-lg font-black text-slate-900">
                    {analysis.growth_progress.accumulated_gdd}{' '}
                    <span className="text-xs font-normal text-slate-500">degree-days (Base {analysis.growth_progress.gdd_base_temperature}°C)</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Progress to Next Stage</span>
                  <div className="text-lg font-black text-emerald-700">
                    {analysis.growth_progress.percent_towards_next_milestone}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Est. Days to Next Transition</span>
                  <div className="text-lg font-black text-slate-900">
                    {analysis.growth_progress.estimated_days_to_next_stage > 0
                      ? `~ ${analysis.growth_progress.estimated_days_to_next_stage} days`
                      : 'Achieved'}
                  </div>
                </div>
              </div>

              {/* Milestones Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Predicted Phenological Transitions:</span>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-left">
                        <th className="py-2 font-semibold">Developmental Milestone</th>
                        <th className="py-2 font-semibold">Estimated Date Window</th>
                        <th className="py-2 font-semibold">Remaining</th>
                        <th className="py-2 font-semibold">Physiological Event</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.future_development.predicted_milestones.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 font-bold text-slate-800 flex items-center gap-2">
                            {m.days_remaining === 0 ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            {m.milestone_name}
                          </td>
                          <td className="py-2.5 text-slate-600">{m.target_date_range}</td>
                          <td className="py-2.5">
                            {m.days_remaining === 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Completed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                ~{m.days_remaining} d
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-slate-500 text-[11px]">{m.key_physiological_events}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-slate-600">
                    Projected Harvest Window: <strong>{analysis.future_development.estimated_harvest_window}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Total cycle: ~{analysis.future_development.total_estimated_cycle_days} days</span>
              </div>
            </div>
          </div>

          {/* SECTION E: Plant Health Assessment & Symptoms */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Section E • Plant Health & Problem Assessment
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Botanical Condition & Stress Detection
                </h3>
              </div>
              <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${getHealthColor(analysis.health_assessment.overall_health_status)}`}>
                Health Score: {analysis.health_assessment.overall_health_score}/100 ({analysis.health_assessment.overall_health_status})
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                {analysis.health_assessment.botanical_explanation}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Chlorosis (Yellowing)</span>
                  <span className="font-bold text-slate-800">{analysis.health_assessment.chlorosis_risk}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Moisture Stress</span>
                  <span className="font-bold text-slate-800">{analysis.health_assessment.moisture_stress_risk}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Thermal Stress</span>
                  <span className="font-bold text-slate-800">{analysis.health_assessment.thermal_stress_risk}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Wilting Risk</span>
                  <span className="font-bold text-slate-800">{analysis.health_assessment.wilting_risk}</span>
                </div>
              </div>

              {analysis.health_assessment.detected_symptoms.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Specific Symptoms Evaluated:</span>
                  <div className="space-y-2">
                    {analysis.health_assessment.detected_symptoms.map((symp, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{symp.symptom_name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            symp.severity === 'Normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Severity: {symp.severity}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          <strong>Visual Evidence:</strong> {symp.visual_evidence}
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          Stress Source: {symp.probable_stress_source} • Area: {symp.affected_area}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION F: Environmental Microclimate Telemetry Correlation */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Section F • Environmental Microclimate Correlation
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold">Soil Moisture</span>
                </div>
                <div className="text-xl font-black text-slate-900">
                  {analysis.environmental_correlation.recorded_soil_moisture !== null ? `${analysis.environmental_correlation.recorded_soil_moisture}%` : 'N/A'}
                </div>
                <p className="text-[11px] text-slate-500">
                  Optimal: {analysis.environmental_correlation.optimal_soil_moisture_range}
                </p>
                <p className="text-[11px] text-slate-700 font-medium">
                  {analysis.environmental_correlation.soil_moisture_evaluation}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Thermometer className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">Ambient Temperature</span>
                </div>
                <div className="text-xl font-black text-slate-900">
                  {analysis.environmental_correlation.recorded_temperature !== null ? `${analysis.environmental_correlation.recorded_temperature}°C` : 'N/A'}
                </div>
                <p className="text-[11px] text-slate-500">
                  Optimal: {analysis.environmental_correlation.optimal_temperature_range}
                </p>
                <p className="text-[11px] text-slate-700 font-medium">
                  {analysis.environmental_correlation.temperature_evaluation}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold">Sunlight Exposure</span>
                </div>
                <div className="text-xl font-black text-slate-900">
                  {analysis.environmental_correlation.recorded_sunlight_hours !== null ? `${analysis.environmental_correlation.recorded_sunlight_hours} hrs` : 'N/A'}
                </div>
                <p className="text-[11px] text-slate-500">
                  Optimal: {analysis.environmental_correlation.optimal_sunlight_range}
                </p>
                <p className="text-[11px] text-slate-700 font-medium">
                  {analysis.environmental_correlation.sunlight_evaluation}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION G & H: Precautions, Cultural Practices & Next Recommended Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Section G • Grounded Agronomic Precautions
              </span>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Irrigation Schedule & Timing:</span>
                  <p className="text-slate-600 mt-0.5">{analysis.recommendations.irrigation_schedule_advice}</p>
                  <p className="text-emerald-700 font-semibold mt-1">Best Time: {analysis.recommendations.optimal_watering_time}</p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-800 block">Nutrition & Soil Care:</span>
                  <p className="text-slate-600 mt-0.5">{analysis.recommendations.soil_nutrient_management}</p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-800 block">Non-Chemical Plant Care:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 mt-1">
                    {analysis.recommendations.non_chemical_precautions.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Section H • Next Recommended Actions
              </span>
              <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-3 text-xs">
                <span className="font-bold text-emerald-950 block">Action Checklist:</span>
                <div className="space-y-2">
                  {analysis.next_recommended_actions.map((act, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-100">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-slate-700">{act}</span>
                    </div>
                  ))}
                </div>

                {/* Next Best Observation Card */}
                <div className="mt-3 p-3 rounded-xl bg-white border border-emerald-300 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <Eye className="w-4 h-4 text-emerald-700" />
                    <span>Next Best Photographic Observation</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Window: <strong>{analysis.next_best_observation.recommended_date_range}</strong>
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Focus: <strong>{analysis.next_best_observation.recommended_focus_area}</strong>
                  </p>
                  <p className="text-slate-500 text-[10px] leading-relaxed pt-1">
                    {analysis.next_best_observation.action_guidance}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION I: Technical Metadata, Citations & Disclaimer */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Section I • Technical Architecture & ICAR/FAO Citations
              </span>
              <span className="text-[10px] text-slate-500">
                Inference Latency: <strong>{analysis.model_metadata.inference_time_ms} ms</strong> • Model: {analysis.model_metadata.model_name} (v{analysis.model_metadata.model_version})
              </span>
            </div>

            {analysis.model_metadata.academic_citations.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Verified Agronomic Sources:
                </span>
                <div className="flex flex-wrap gap-2">
                  {analysis.model_metadata.academic_citations.map((cite, i) => (
                    <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span><strong>{cite.source}:</strong> {cite.citation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-slate-200/60">
              Disclaimer: PlantPulse AI analysis reports are synthesized from biophysical Growing Degree Day algorithms, botanical computer vision feature extraction, and ICAR/FAO horticultural literature. They provide decision support for cultural crop management and do not replace mandatory on-site inspection by a certified agricultural extension officer for severe quarantine pathogens.
            </p>
          </div>

          {/* Farmer Verification / Feedback Widget */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Was this AI Growth Analysis accurate?</span>
              <p className="text-[11px] text-slate-500">
                Your feedback calibrates our localized botanical phenology models.
              </p>
            </div>

            {feedbackSent ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <Check className="w-4 h-4" />
                <span>Thank you! Feedback recorded ({feedbackSent}).</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback('accurate')}
                  disabled={isSubmittingFeedback}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors disabled:opacity-50"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Accurate</span>
                </button>
                <button
                  onClick={() => handleFeedback('inaccurate')}
                  disabled={isSubmittingFeedback}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors disabled:opacity-50"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>Needs Adjustment</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
