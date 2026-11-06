import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Droplets,
  Thermometer,
  Sun,
  ShieldAlert,
  Info
} from 'lucide-react';
import { api } from '../api/client';
import { DigitalTwinResponse, WhatIfResponse } from '../types';

interface DigitalTwinRadarCardProps {
  plantId: string;
  plantName: string;
  cropType: string;
  onRefresh?: () => void;
}

export const DigitalTwinRadarCard: React.FC<DigitalTwinRadarCardProps> = ({
  plantId,
  plantName,
  cropType,
  onRefresh
}) => {
  const [digitalTwin, setDigitalTwin] = useState<DigitalTwinResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // What-If Simulator state
  const [moistureDelta, setMoistureDelta] = useState<number>(0);
  const [tempDelta, setTempDelta] = useState<number>(0);
  const [sunDelta, setSunDelta] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResponse | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dt = await api.getDigitalTwin(plantId);
      setDigitalTwin(dt);
    } catch (err: any) {
      setError(err.message || 'Failed to load Plant Digital Twin data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [plantId]);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await api.simulateWhatIf(plantId, {
        soil_moisture_delta_pct: moistureDelta,
        temperature_delta_c: tempDelta,
        sunlight_delta_hours: sunDelta,
      });
      setWhatIfResult(res);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Within Expected Range':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
          color: 'text-emerald-700'
        };
      case 'Faster Than Reference':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: TrendingUp,
          color: 'text-blue-700'
        };
      case 'Slower Than Reference':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: Clock,
          color: 'text-amber-700'
        };
      case 'Potential Growth Concern':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: AlertCircle,
          color: 'text-rose-700'
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: Info,
          color: 'text-slate-600'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs animate-pulse">
        <div className="h-6 w-60 bg-slate-200 rounded" />
        <div className="h-28 bg-slate-100 rounded-2xl" />
        <div className="h-40 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error || !digitalTwin) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <span>{error || 'Digital Twin data unavailable.'}</span>
        </div>
      </div>
    );
  }

  const badgeConfig = getStatusBadge(digitalTwin.deviation_status);
  const StatusIcon = badgeConfig.icon;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
      {/* Top Banner & Deviation Radar Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Plant Digital Twin & Growth Deviation Radar
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time biometric trajectory benchmarking against regional thermal degree day (GDD) baselines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${badgeConfig.bg}`}>
            <StatusIcon className={`w-4 h-4 ${badgeConfig.color}`} />
            <span>Radar: {digitalTwin.deviation_status}</span>
          </div>

          <button
            onClick={() => {
              loadData();
              if (onRefresh) onRefresh();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Refresh radar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Radar Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Chronological Age
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {digitalTwin.chronological_age_days}{' '}
            <span className="text-xs font-normal text-slate-500">days</span>
          </div>
          <span className="text-[10px] text-slate-500">Planted {digitalTwin.planting_date}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Accumulated GDD
          </span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {digitalTwin.actual_gdd}
          </div>
          <span className="text-[10px] text-slate-500">Expected: {digitalTwin.expected_gdd}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Thermal Deviation
          </span>
          <div className={`text-xl font-black mt-1 ${
            digitalTwin.deviation_days > 0 ? 'text-blue-700' : (digitalTwin.deviation_days < 0 ? 'text-amber-700' : 'text-emerald-700')
          }`}>
            {digitalTwin.deviation_days > 0 ? `+${digitalTwin.deviation_days}` : digitalTwin.deviation_days}{' '}
            <span className="text-xs font-normal text-slate-500">days</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {digitalTwin.deviation_days >= 0 ? 'Ahead of baseline' : 'Behind baseline'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Morphology Match
          </span>
          <div className="text-base font-bold text-slate-800 mt-1">
            {digitalTwin.actual_stage}
          </div>
          <span className="text-[10px] text-slate-500">Expected: {digitalTwin.expected_stage}</span>
        </div>
      </div>

      {/* Radar Explanation Note */}
      <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {digitalTwin.deviation_explanation}
        </p>
      </div>

      {/* Phenological Timeline: Expected vs Actual Observed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Phenological Timeline: Expected vs Actual Milestones
          </h3>
          <span className="text-[10px] text-slate-400">Regional GDD Calibrated</span>
        </div>

        <div className="space-y-2">
          {digitalTwin.timeline.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                item.status === 'Completed'
                  ? 'bg-emerald-50/30 border-emerald-200'
                  : item.status === 'In Progress'
                  ? 'bg-blue-50/40 border-blue-200'
                  : item.status === 'Delayed'
                  ? 'bg-rose-50/30 border-rose-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  item.status === 'Completed'
                    ? 'bg-emerald-600 text-white'
                    : item.status === 'In Progress'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {idx + 1}
                </span>
                <div>
                  <span className="font-bold text-slate-900 block">{item.stage}</span>
                  <span className="text-[11px] text-slate-500">
                    Expected: Day {item.expected_day} ({item.expected_date})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right sm:text-right">
                {item.observed_date ? (
                  <div className="text-[11px]">
                    <span className="text-slate-400 block">Observed on:</span>
                    <strong className="text-emerald-800">{item.observed_date} (Day {item.observed_day})</strong>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Awaiting observation</span>
                )}

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  item.status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : item.status === 'In Progress'
                    ? 'bg-blue-100 text-blue-800'
                    : item.status === 'Delayed'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INTERACTIVE WHAT-IF GROWTH SIMULATOR */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">What-If Growth Simulator</h3>
              <p className="text-[11px] text-slate-400">
                Simulate harvest shifts under hypothetical microclimate adjustments
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Biophysical GDD Engine
          </span>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Soil Moisture Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                Soil Moisture Shift
              </span>
              <strong className="text-emerald-400">{moistureDelta > 0 ? `+${moistureDelta}%` : `${moistureDelta}%`}</strong>
            </div>
            <input
              type="range"
              min="-15"
              max="15"
              step="1"
              value={moistureDelta}
              onChange={(e) => setMoistureDelta(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>-15% Deficit</span>
              <span>Baseline</span>
              <span>+15% Excess</span>
            </div>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                Temperature Shift
              </span>
              <strong className="text-emerald-400">{tempDelta > 0 ? `+${tempDelta}°C` : `${tempDelta}°C`}</strong>
            </div>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.5"
              value={tempDelta}
              onChange={(e) => setTempDelta(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>-5°C Chilling</span>
              <span>Baseline</span>
              <span>+5°C Heating</span>
            </div>
          </div>

          {/* Sunlight Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Sun className="w-3.5 h-3.5 text-yellow-400" />
                Daily Sunlight Shift
              </span>
              <strong className="text-emerald-400">{sunDelta > 0 ? `+${sunDelta} hrs` : `${sunDelta} hrs`}</strong>
            </div>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.5"
              value={sunDelta}
              onChange={(e) => setSunDelta(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>-3 hrs Shade</span>
              <span>Baseline</span>
              <span>+3 hrs Bright</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              setMoistureDelta(0);
              setTempDelta(0);
              setSunDelta(0);
              setWhatIfResult(null);
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Reset Sliders
          </button>

          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSimulating ? 'Simulating Biophysics...' : 'Simulate Scenario'}</span>
          </button>
        </div>

        {/* Simulation Output Card */}
        {whatIfResult && (
          <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3 text-xs animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-700">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Simulation Outcome
                </span>
                <span className="text-sm font-bold text-white">
                  Estimated Remaining Days: {whatIfResult.simulated_estimated_harvest_days} days{' '}
                  <span className="text-xs font-normal text-slate-400">(vs {whatIfResult.current_estimated_harvest_days} baseline)</span>
                </span>
              </div>

              <div className={`px-3 py-1 rounded-xl text-xs font-bold ${
                whatIfResult.harvest_shift_days < 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : (whatIfResult.harvest_shift_days > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-700 text-slate-300')
              }`}>
                {whatIfResult.harvest_shift_days < 0
                  ? `Advancement: ${Math.abs(whatIfResult.harvest_shift_days)} days earlier`
                  : (whatIfResult.harvest_shift_days > 0 ? `Delay: +${whatIfResult.harvest_shift_days} days` : 'No net change')}
              </div>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              {whatIfResult.impact_summary}
            </p>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Physiological Consequences:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                {whatIfResult.physiological_consequences.map((cons, i) => (
                  <li key={i}>{cons}</li>
                ))}
              </ul>
            </div>

            <p className="text-[10px] text-slate-400 italic pt-1">
              {whatIfResult.disclaimer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
