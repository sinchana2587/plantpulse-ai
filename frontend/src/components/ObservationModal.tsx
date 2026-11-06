import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Thermometer, Droplets, Sun, CloudRain, Check, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { Observation, GrowthStage } from '../types';

interface ObservationModalProps {
  plantId: string;
  plantName: string;
  cropType?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newObs: Observation) => void;
}

const DEFAULT_STAGES: string[] = ['Seedling', 'Vegetative', 'Flowering', 'Fruit Formation', 'Maturity'];
const BANANA_STAGES: string[] = ['Vegetative', 'Pseudostem Emergence', 'Inflorescence', 'Fruit Development', 'Harvest Maturity'];

export const ObservationModal: React.FC<ObservationModalProps> = ({
  plantId,
  plantName,
  cropType,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const stages = cropType?.toLowerCase() === 'banana' ? BANANA_STAGES : DEFAULT_STAGES;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [obsDate, setObsDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [temperature, setTemperature] = useState<string>('24.0');
  const [humidity, setHumidity] = useState<string>('65.0');
  const [soilMoisture, setSoilMoisture] = useState<string>('58.0');
  const [sunlight, setSunlight] = useState<string>('8.0');
  const [rainfall, setRainfall] = useState<string>('0.0');
  const [manualStage, setManualStage] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('observation_date', new Date(obsDate).toISOString());

      if (temperature) formData.append('temperature', temperature);
      if (humidity) formData.append('humidity', humidity);
      if (soilMoisture) formData.append('soil_moisture', soilMoisture);
      if (sunlight) formData.append('sunlight_hours', sunlight);
      if (rainfall) formData.append('rainfall', rainfall);
      if (manualStage) formData.append('manual_growth_stage', manualStage);

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const created = await api.createObservation(plantId, formData);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save observation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Record Plant Observation</h2>
            <p className="text-xs text-slate-500">For plant: <span className="font-semibold text-emerald-800">{plantName}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Photo Upload Zone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Plant Photograph
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 rounded-xl p-4 text-center cursor-pointer hover:bg-emerald-50/40 transition-colors bg-slate-50/50 relative overflow-hidden group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative flex flex-col items-center">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-44 object-contain rounded-lg shadow-xs"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity text-white text-xs font-semibold gap-1.5">
                    <Camera className="w-4 h-4" /> Change Photograph
                  </div>
                  <p className="text-xs text-emerald-700 font-semibold mt-2">{selectedFile?.name}</p>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Click to browse or drag & drop photo here
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supports JPG, PNG, WEBP (Max 10MB). Image is automatically processed by AI Growth Classifier.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Observation Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observation Date & Time
            </label>
            <input
              type="datetime-local"
              value={obsDate}
              onChange={(e) => setObsDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Environmental Sensor Inputs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Environmental Sensor Readings
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-600 flex items-center gap-1 mb-1 font-medium">
                  <Thermometer className="w-3 h-3 text-rose-500" /> Temperature (°C)
                </span>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="24.0"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-600 flex items-center gap-1 mb-1 font-medium">
                  <Droplets className="w-3 h-3 text-teal-500" /> Rel. Humidity (%)
                </span>
                <input
                  type="number"
                  step="0.5"
                  value={humidity}
                  onChange={(e) => setHumidity(e.target.value)}
                  placeholder="65.0"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-600 flex items-center gap-1 mb-1 font-medium">
                  <Droplets className="w-3 h-3 text-blue-500" /> Soil Moisture (%)
                </span>
                <input
                  type="number"
                  step="0.5"
                  value={soilMoisture}
                  onChange={(e) => setSoilMoisture(e.target.value)}
                  placeholder="58.0"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-600 flex items-center gap-1 mb-1 font-medium">
                  <Sun className="w-3 h-3 text-amber-500" /> Sunlight (hrs)
                </span>
                <input
                  type="number"
                  step="0.5"
                  value={sunlight}
                  onChange={(e) => setSunlight(e.target.value)}
                  placeholder="8.0"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-600 flex items-center gap-1 mb-1 font-medium">
                  <CloudRain className="w-3 h-3 text-sky-500" /> Rainfall (mm)
                </span>
                <input
                  type="number"
                  step="0.1"
                  value={rainfall}
                  onChange={(e) => setRainfall(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-600 flex items-center gap-1 mb-1 font-medium">
                  Manual Stage (Optional)
                </span>
                <select
                  value={manualStage}
                  onChange={(e) => setManualStage(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="">Auto AI Detect</option>
                  {stages.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing AI Analysis...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Observation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
