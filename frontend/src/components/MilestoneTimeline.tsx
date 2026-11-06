import React from 'react';
import { CheckCircle2, Clock, Calendar, ArrowRight, Sprout, Sparkles } from 'lucide-react';
import { Forecast, GrowthStage } from '../types';

interface MilestoneTimelineProps {
  forecast?: Forecast | null;
  plantingDate: string;
  currentStage: GrowthStage | string;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  forecast,
  plantingDate,
  currentStage,
}) => {
  if (!forecast) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
        <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-pulse" />
        <p className="text-sm font-medium text-slate-600">No milestone prediction available yet.</p>
        <p className="text-xs text-slate-400 mt-1">Submit an observation or click 'Generate Forecast' to project future development.</p>
      </div>
    );
  }

  const milestones = [
    {
      name: 'Planting Baseline',
      window: { start: plantingDate, end: plantingDate },
      status: 'COMPLETED',
      description: 'Initial seed sowing or transplant into bed',
    },
    {
      name: 'Flowering Window',
      window: forecast.flowering_window,
      status: forecast.flowering_window?.status || 'UPCOMING',
      description: 'First yellow flower truss blooms opening',
    },
    {
      name: 'Fruit Formation',
      window: forecast.fruit_formation_window,
      status: forecast.fruit_formation_window?.status || 'UPCOMING',
      description: 'Green fruit swelling and cluster setting',
    },
    {
      name: 'Maturity & Ripening',
      window: forecast.maturity_window,
      status: forecast.maturity_window?.status || 'UPCOMING',
      description: 'Breaker stage to full pigment change',
    },
    {
      name: 'Estimated Harvest',
      window: forecast.harvest_window,
      status: forecast.harvest_window?.status || 'UPCOMING',
      description: 'Peak Brix sweetness and firm harvest window',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Phenological Development Trajectory</h3>
          <p className="text-xs text-slate-500">
            Computed by {forecast.method} based on {forecast.observations_used_count} chronological observation(s).
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          Current: {currentStage}
        </span>
      </div>

      <div className="relative pl-6 sm:pl-8 border-l-2 border-emerald-200 space-y-6 my-4">
        {milestones.map((m, idx) => {
          const isCompleted = m.status === 'COMPLETED';
          const isCurrent = m.status === 'CURRENT';
          const isUpcoming = m.status === 'UPCOMING';

          let dotClass = 'bg-slate-300 border-slate-100 text-slate-500';
          let borderClass = 'border-slate-200 bg-white';
          if (isCompleted) {
            dotClass = 'bg-emerald-600 border-emerald-100 text-white';
            borderClass = 'border-emerald-200 bg-emerald-50/40';
          } else if (isCurrent) {
            dotClass = 'bg-amber-500 border-amber-200 text-white ring-4 ring-amber-100 animate-pulse';
            borderClass = 'border-amber-300 bg-amber-50/40 shadow-xs';
          }

          return (
            <div key={idx} className="relative group">
              {/* Dot on timeline */}
              <div
                className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 ${dotClass}`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Card Container */}
              <div className={`p-4 rounded-xl border transition-all ${borderClass}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{m.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCurrent
                            ? 'bg-amber-100 text-amber-800 font-extrabold'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                  </div>

                  {/* Date range display */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {m.window?.start ? (
                      m.window?.start === m.window?.end ? (
                        <span>{m.window?.start}</span>
                      ) : (
                        <span>
                          {m.window?.start} <span className="text-slate-400">→</span> {m.window?.end}
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400 italic">Insufficient telemetry data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
