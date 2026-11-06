import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  Camera,
  Upload,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  Check,
  Leaf
} from 'lucide-react';
import { api } from '../api/client';
import { TreatmentPlan, Plant, TreatmentActionItem, RecoveryObservationItem } from '../types';

interface TreatmentRecoveryViewProps {
  onNavigateToPlant?: (plantId: string) => void;
  onNavigateToRegister?: () => void;
}

export const TreatmentRecoveryView: React.FC<TreatmentRecoveryViewProps> = ({
  onNavigateToPlant,
  onNavigateToRegister,
}) => {
  const [treatment, setTreatment] = useState<TreatmentPlan | null>(null);
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingAction, setIsUpdatingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Follow-up Observation form state
  const [symptomStatus, setSymptomStatus] = useState<'improved' | 'unchanged' | 'worsened'>('unchanged');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpFile, setFollowUpFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [followUpSuccess, setFollowUpSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (targetPlantId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const plants = await api.getPlants();
      setAllPlants(plants);

      let activePlan: TreatmentPlan | null = null;
      if (targetPlantId) {
        activePlan = await api.getPlantTreatment(targetPlantId);
        setSelectedPlantId(targetPlantId);
      } else {
        activePlan = await api.getLatestTreatment();
        if (activePlan) {
          setSelectedPlantId(activePlan.plant_id);
        } else if (plants.length > 0) {
          setSelectedPlantId(plants[0].id);
          activePlan = await api.getPlantTreatment(plants[0].id);
        }
      }
      setTreatment(activePlan);
    } catch (err: any) {
      console.error('Error loading treatment:', err);
      setError(err.message || 'Failed to load treatment and recovery plan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlantChange = async (plantId: string) => {
    setSelectedPlantId(plantId);
    setIsLoading(true);
    try {
      const plan = await api.getPlantTreatment(plantId);
      setTreatment(plan);
    } catch (err: any) {
      console.error('Error changing plant treatment:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAction = async (action: TreatmentActionItem) => {
    if (!treatment) return;
    setIsUpdatingAction(action.id);
    try {
      const updated = await api.updateTreatmentAction(treatment.id, action.id, !action.is_completed);
      setTreatment((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          actions: prev.actions.map((a) => (a.id === action.id ? updated : a)),
        };
      });
    } catch (err: any) {
      console.error('Failed to toggle action item:', err);
    } finally {
      setIsUpdatingAction(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFollowUpFile(f);
      setFilePreview(URL.createObjectURL(f));
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treatment) return;

    setIsSubmittingFollowUp(true);
    setFollowUpSuccess(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('symptom_status', symptomStatus);
      if (followUpNotes) formData.append('notes', followUpNotes);
      if (followUpFile) formData.append('image', followUpFile);

      const newObs = await api.addRecoveryFollowUp(treatment.id, formData);
      setTreatment((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recovery_observations: [newObs, ...prev.recovery_observations],
          status: symptomStatus === 'improved' ? 'in_progress' : prev.status,
        };
      });

      setFollowUpSuccess('Follow-up observation logged successfully!');
      setFollowUpNotes('');
      setFollowUpFile(null);
      setFilePreview(null);
    } catch (err: any) {
      console.error('Failed to log follow-up:', err);
      setError(err.message || 'Failed to submit follow-up recovery observation.');
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header & Context Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
            <HeartPulse className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Treatment & Recovery Management
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Evidence-based cultural regimens, interactive action checklists, and longitudinal recovery monitoring.
            </p>
          </div>
        </div>

        {/* Plant Selector Dropdown */}
        {allPlants.length > 0 && (
          <div className="w-full sm:w-72">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Select Diagnosed Plant:
            </label>
            <select
              value={selectedPlantId}
              onChange={(e) => handlePlantChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all cursor-pointer"
            >
              {allPlants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.crop_type})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Retrieving active treatment protocol...</p>
        </div>
      ) : !treatment ? (
        /* Empty State */
        <div className="py-20 px-6 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-3xl border border-dashed border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Leaf className="w-8 h-8 stroke-[1.8]" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-slate-900">
              No Analysed Plant Available Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Analyse a plant or submit a growth problem report to generate an evidence-based treatment and recovery regimen.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {onNavigateToRegister && (
              <button
                onClick={onNavigateToRegister}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Register a Plant
              </button>
            )}
            {allPlants.length > 0 && onNavigateToPlant && (
              <button
                onClick={() => onNavigateToPlant(allPlants[0].id)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                View Plant Inventory
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Active Treatment Plan Display */
        <div className="space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Plant & Diagnosis Banner Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
                  Active Clinical Regimen
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  {treatment.plant_name} — {treatment.condition_name}
                </h2>
                <p className="text-xs text-slate-500">
                  Crop: {treatment.crop_type} ({treatment.crop_variety}) • Initiated: {treatment.treatment_start_date || 'Today'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-extrabold ${
                  treatment.severity === 'Severe' || treatment.severity === 'High'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  Severity: {treatment.severity}
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                  Status: {treatment.status}
                </span>
              </div>
            </div>

            {/* Diagnostic Cause & Supporting Evidence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800">Agronomic Etiology & Cause:</span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {treatment.possible_cause}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800">Diagnostic Evidence:</span>
                <p className="text-xs text-slate-600 leading-relaxed font-mono text-[11px]">
                  {treatment.evidence_notes || treatment.problem_summary}
                </p>
              </div>
            </div>

            {/* Timeline & Expected Signs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs">
                <Clock className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-950 block">Follow-up Timeline</span>
                  <span className="text-emerald-800 font-semibold">{treatment.follow_up_timeline}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs">
                <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
                <div>
                  <span className="font-bold text-blue-950 block">Expected Signs of Improvement</span>
                  <span className="text-blue-800 text-[11px] leading-tight block">
                    {treatment.expected_improvement_signs || 'Stabilization of foliar turgor and arrest of chlorotic lesions.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Action Checklist & Cultural Practices */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Action Checklist */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Prescribed Cultural Action Items
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click each action when executed on-farm to update recovery milestones.
                  </p>
                </div>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  {treatment.actions.filter((a) => a.is_completed).length} / {treatment.actions.length} Completed
                </span>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2.5">
                {treatment.actions.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => handleToggleAction(act)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      act.is_completed
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                          act.is_completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {act.is_completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold capitalize ${
                          act.is_completed ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}>
                          {act.action_text}
                        </span>
                        <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${
                          act.action_type === 'immediate'
                            ? 'bg-rose-100 text-rose-800'
                            : act.action_type === 'monitoring'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {act.action_type}
                        </span>
                      </div>
                      {act.is_completed && act.completed_at && (
                        <p className="text-[10px] text-emerald-700 font-medium">
                          Completed on {new Date(act.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* References Footnote */}
              {treatment.references && treatment.references.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <span className="font-bold text-slate-800 text-[11px]">Academic & ICAR / FAO References:</span>
                  <div className="space-y-1">
                    {treatment.references.map((r, i) => (
                      <p key={i} className="text-[11px] text-slate-600">
                        • <span className="font-semibold text-slate-700">{r.source}:</span> {r.citation}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Log Follow-Up Observation & History */}
            <div className="space-y-6">
              {/* Follow-up Submission Form */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <span>Log Follow-Up Inspection</span>
                </h3>

                {followUpSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{followUpSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleFollowUpSubmit} className="space-y-3.5">
                  {/* Status Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Symptom Trajectory *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['improved', 'unchanged', 'worsened'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setSymptomStatus(st)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all capitalize flex flex-col items-center justify-center gap-1 ${
                            symptomStatus === st
                              ? st === 'improved'
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : st === 'worsened'
                                ? 'bg-rose-600 border-rose-600 text-white'
                                : 'bg-amber-600 border-amber-600 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {st === 'improved' && <TrendingUp className="w-3.5 h-3.5" />}
                          {st === 'unchanged' && <Minus className="w-3.5 h-3.5" />}
                          {st === 'worsened' && <TrendingDown className="w-3.5 h-3.5" />}
                          <span>{st}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Observation Notes</label>
                    <textarea
                      rows={2}
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      placeholder="e.g. Yellowing stopped advancing. New apical shoot emerging healthy."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Attach Follow-up Photo</label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 flex items-center justify-center gap-1.5 cursor-pointer bg-slate-50 text-xs font-semibold text-slate-600 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{followUpFile ? followUpFile.name : 'Select Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                      {filePreview && (
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                          <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingFollowUp}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  >
                    {isSubmittingFollowUp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Logging Record...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submit Follow-Up</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Recovery Timeline */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <span>Recovery Timeline ({treatment.recovery_observations.length})</span>
                </h3>

                {treatment.recovery_observations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No follow-up observations logged yet. Submit the form above after inspecting the plant.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {treatment.recovery_observations.map((obs) => (
                      <div
                        key={obs.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                            obs.symptom_status === 'improved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : obs.symptom_status === 'worsened'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {obs.symptom_status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(obs.observation_date).toLocaleDateString()}
                          </span>
                        </div>
                        {obs.notes && <p className="text-slate-700 text-[11px] leading-relaxed">{obs.notes}</p>}
                        {obs.image_path && (
                          <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 mt-1">
                            <img src={obs.image_path} alt="Follow-up" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
