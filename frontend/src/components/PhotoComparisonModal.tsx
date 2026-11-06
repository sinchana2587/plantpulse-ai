import React, { useState } from 'react';
import { X, ArrowLeftRight, Calendar } from 'lucide-react';
import { Observation } from '../types';
import { StageBadge } from './StageBadge';

interface PhotoComparisonModalProps {
  observations: Observation[];
  isOpen: boolean;
  onClose: () => void;
}

export const PhotoComparisonModal: React.FC<PhotoComparisonModalProps> = ({
  observations,
  isOpen,
  onClose,
}) => {
  const obsWithPhotos = observations.filter((o) => !!o.image_path);

  const [leftIndex, setLeftIndex] = useState<number>(0);
  const [rightIndex, setRightIndex] = useState<number>(
    obsWithPhotos.length > 1 ? obsWithPhotos.length - 1 : 0
  );

  if (!isOpen) return null;

  const leftObs = obsWithPhotos[leftIndex];
  const rightObs = obsWithPhotos[rightIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">Side-by-Side Photographic Growth Comparison</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {obsWithPhotos.length < 2 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-semibold">At least two photographs are required for side-by-side growth comparison.</p>
            <p className="text-xs text-slate-400 mt-1">Submit multiple observations over time to visually track phenological changes.</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Photo Panel */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Earlier Observation</span>
                  <select
                    value={leftIndex}
                    onChange={(e) => setLeftIndex(Number(e.target.value))}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {obsWithPhotos.map((obs, idx) => (
                      <option key={obs.id} value={idx}>
                        {new Date(obs.observation_date).toLocaleDateString()} ({obs.effective_stage})
                      </option>
                    ))}
                  </select>
                </div>

                {leftObs?.image_path && (
                  <div className="h-64 rounded-xl overflow-hidden bg-slate-200 shadow-inner flex items-center justify-center">
                    <img
                      src={leftObs.image_path}
                      alt="Left observation"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                  <StageBadge stage={leftObs.effective_stage} size="sm" />
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(leftObs.observation_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex gap-3">
                  {leftObs.temperature && <span>Temp: {leftObs.temperature}°C</span>}
                  {leftObs.soil_moisture && <span>Moisture: {leftObs.soil_moisture}%</span>}
                </div>
              </div>

              {/* Right Photo Panel */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Later Observation</span>
                  <select
                    value={rightIndex}
                    onChange={(e) => setRightIndex(Number(e.target.value))}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {obsWithPhotos.map((obs, idx) => (
                      <option key={obs.id} value={idx}>
                        {new Date(obs.observation_date).toLocaleDateString()} ({obs.effective_stage})
                      </option>
                    ))}
                  </select>
                </div>

                {rightObs?.image_path && (
                  <div className="h-64 rounded-xl overflow-hidden bg-slate-200 shadow-inner flex items-center justify-center">
                    <img
                      src={rightObs.image_path}
                      alt="Right observation"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                  <StageBadge stage={rightObs.effective_stage} size="sm" />
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(rightObs.observation_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex gap-3">
                  {rightObs.temperature && <span>Temp: {rightObs.temperature}°C</span>}
                  {rightObs.soil_moisture && <span>Moisture: {rightObs.soil_moisture}%</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
