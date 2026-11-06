import React from 'react';
import { Forecast } from '../types';
import {
  Brain,
  AlertTriangle,
  Info,
  CheckCircle,
  ShieldAlert,
  Flame,
  Droplets,
  Sun,
  Layers,
} from 'lucide-react';

interface ForecastCardProps {
  forecast: Forecast;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ forecast }) => {
  const env = forecast.environmental_factors || {};

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{forecast.method}</h3>
            <p className="text-xs text-slate-500">
              Version {forecast.model_version} • Calibrated using {forecast.observations_used_count} observation(s)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            Active Forecast
          </span>
        </div>
      </div>

      {/* Environmental & Phenological Telemetry Factors */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          Environmental & Thermal Integration Factors
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              Accumulated GDD
            </div>
            <p className="text-lg font-bold text-slate-900 mt-1">
              {env.accumulated_gdd ?? '—'} <span className="text-xs font-normal text-slate-500">°C-days</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Base threshold 10.0°C</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              Mean Soil Moisture
            </div>
            <p className="text-lg font-bold text-slate-900 mt-1">
              {env.average_soil_moisture_pct ?? '—'} <span className="text-xs font-normal text-slate-500">%</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Target: 50% - 65%</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              Daily Sunlight
            </div>
            <p className="text-lg font-bold text-slate-900 mt-1">
              {env.average_sunlight_hours ?? '—'} <span className="text-xs font-normal text-slate-500">hrs</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Photoperiod optimal</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Brain className="w-3.5 h-3.5 text-purple-500" />
              Growth Velocity
            </div>
            <p className="text-lg font-bold text-slate-900 mt-1">
              {env.estimated_growth_rate_factor ? `${env.estimated_growth_rate_factor}x` : '1.0x'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Vs baseline phenology</p>
          </div>
        </div>
      </div>

      {/* Agricultural Recommendations */}
      {forecast.recommendations && forecast.recommendations.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Agricultural Actions & Crop Recommendations
          </h4>
          <div className="space-y-2">
            {forecast.recommendations.map((rec, i) => {
              const isWarn = rec.severity === 'warning';
              const isAlert = rec.severity === 'alert';
              return (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    isAlert
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : isWarn
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="mt-0.5">
                    {isAlert ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Info className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{rec.title}</p>
                    <p className="text-xs mt-0.5 opacity-90">{rec.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Model Transparency: Assumptions & Scientific Limitations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <p className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            Model Assumptions
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            {forecast.assumptions.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <p className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
            Uncertainty & Limitations
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            {forecast.limitations.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
