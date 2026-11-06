import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sprout,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  HelpCircle,
  UploadCloud,
  Camera,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../api/client';
import { Plant, PlantCreateInput, CropCatalogItem } from '../types';
import { VoiceFieldControl } from '../components/VoiceFieldControl';
import { useLanguage } from '../context/LanguageContext';

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPlant: Plant) => void;
}

const FALLBACK_CROPS: CropCatalogItem[] = [
  {
    id: 'tomato',
    name: 'Tomato',
    scientific_name: 'Solanum lycopersicum',
    varieties: ['Roma', 'Cherry', 'San Marzano', 'Beefsteak', 'Pusa Ruby'],
    supported_stages: ['Seedling', 'Vegetative', 'Flowering', 'Fruit Formation', 'Maturity'],
    has_ai_vision_model: true,
    has_forecasting_model: true,
    base_temperature_c: 10.0,
    cutoff_temperature_c: 34.0,
    standard_maturity_days: 110,
    optimal_moisture_min: 50.0,
    optimal_moisture_max: 65.0,
    is_active: true,
    model_status_note: 'Active production vision model v1.0.0'
  },
  {
    id: 'chilli',
    name: 'Chilli',
    scientific_name: 'Capsicum annuum',
    varieties: ['Pusa Jwala', "Bird's Eye", 'Bell Pepper', 'Bhut Jolokia', 'Kashmiri Mirch'],
    supported_stages: ['Seedling', 'Vegetative', 'Flowering', 'Fruit Formation', 'Maturity'],
    has_ai_vision_model: false,
    has_forecasting_model: true,
    base_temperature_c: 12.0,
    cutoff_temperature_c: 35.0,
    standard_maturity_days: 120,
    optimal_moisture_min: 45.0,
    optimal_moisture_max: 60.0,
    is_active: true,
    model_status_note: 'Manual growth stage tracking with thermal GDD forecasting'
  },
  {
    id: 'brinjal',
    name: 'Brinjal (Eggplant)',
    scientific_name: 'Solanum melongena',
    varieties: ['Pusa Purple Long', 'Black Beauty', 'Round Purple', 'Pusa Kranti'],
    supported_stages: ['Seedling', 'Vegetative', 'Flowering', 'Fruit Formation', 'Maturity'],
    has_ai_vision_model: false,
    has_forecasting_model: true,
    base_temperature_c: 12.0,
    cutoff_temperature_c: 35.0,
    standard_maturity_days: 130,
    optimal_moisture_min: 50.0,
    optimal_moisture_max: 65.0,
    is_active: true,
    model_status_note: 'Manual growth stage tracking with thermal GDD forecasting'
  },
  {
    id: 'okra',
    name: "Okra (Lady's Finger)",
    scientific_name: 'Abelmoschus esculentus',
    varieties: ['Pusa Sawani', 'Arka Anamika', 'Clemson Spineless', 'Parbhani Kranti'],
    supported_stages: ['Seedling', 'Vegetative', 'Flowering', 'Fruit Formation', 'Maturity'],
    has_ai_vision_model: false,
    has_forecasting_model: true,
    base_temperature_c: 15.0,
    cutoff_temperature_c: 38.0,
    standard_maturity_days: 90,
    optimal_moisture_min: 45.0,
    optimal_moisture_max: 60.0,
    is_active: true,
    model_status_note: 'Manual growth stage tracking with thermal GDD forecasting'
  },
  {
    id: 'cucumber',
    name: 'Cucumber',
    scientific_name: 'Cucumis sativus',
    varieties: ['Japanese Long', 'Poona Kheera', 'Poinsett', 'Straight Eight'],
    supported_stages: ['Seedling', 'Vegetative', 'Flowering', 'Fruit Formation', 'Maturity'],
    has_ai_vision_model: false,
    has_forecasting_model: true,
    base_temperature_c: 10.0,
    cutoff_temperature_c: 32.0,
    standard_maturity_days: 70,
    optimal_moisture_min: 55.0,
    optimal_moisture_max: 70.0,
    is_active: true,
    model_status_note: 'Manual growth stage tracking with thermal GDD forecasting'
  },
  {
    id: 'banana',
    name: 'Banana',
    scientific_name: 'Musa spp.',
    varieties: ['Grand Naine', 'Dwarf Cavendish', 'Robusta', 'Red Banana', 'Nendran'],
    supported_stages: ['Vegetative', 'Pseudostem Emergence', 'Inflorescence', 'Fruit Development', 'Harvest Maturity'],
    has_ai_vision_model: false,
    has_forecasting_model: true,
    base_temperature_c: 14.0,
    cutoff_temperature_c: 38.0,
    standard_maturity_days: 330,
    optimal_moisture_min: 60.0,
    optimal_moisture_max: 75.0,
    is_active: true,
    model_status_note: 'Manual growth stage tracking with thermal GDD forecasting (Banana visual classifier in training pipeline)'
  }
];

export const AddPlantModal: React.FC<AddPlantModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useLanguage();
  const [crops, setCrops] = useState<CropCatalogItem[]>(FALLBACK_CROPS);
  const [name, setName] = useState('');
  const [cropType, setCropType] = useState('Tomato');
  const [cropVariety, setCropVariety] = useState('Roma');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('Greenhouse Section A');
  const [description, setDescription] = useState('');

  // Initial photograph upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().slice(0, 10));
  const [initialStage, setInitialStage] = useState<string>('Seedling');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.getCrops()
      .then((data) => {
        if (data && data.length > 0) {
          setCrops(data);
          const current = data.find((c) => c.name.toLowerCase() === cropType.toLowerCase()) || data[0];
          if (current && !current.varieties.includes(cropVariety)) {
            setCropVariety(current.varieties[0]);
          }
        }
      })
      .catch((err) => {
        console.warn('Using fallback crop catalog:', err);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCrop = crops.find(
    (c) => c.name.toLowerCase() === cropType.toLowerCase() || c.id.toLowerCase() === cropType.toLowerCase()
  ) || crops[0];

  const handleCropChange = (newCropName: string) => {
    setCropType(newCropName);
    const found = crops.find(
      (c) => c.name.toLowerCase() === newCropName.toLowerCase() || c.id.toLowerCase() === newCropName.toLowerCase()
    );
    if (found && found.varieties && found.varieties.length > 0) {
      setCropVariety(found.varieties[0]);
    }
    // Update default initial stage
    if (newCropName.toLowerCase() === 'banana') {
      setInitialStage('Vegetative');
    } else {
      setInitialStage('Seedling');
    }
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Unsupported file type. Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit. Please choose a smaller image.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let createdPlant: Plant;

      if (photoFile) {
        // Submit multipart form with photograph
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('crop_type', selectedCrop ? selectedCrop.name : cropType);
        formData.append('crop_variety', cropVariety.trim());
        formData.append('planting_date', plantingDate);
        if (location) formData.append('location', location.trim());
        if (description) formData.append('description', description.trim());
        if (initialStage) formData.append('initial_stage', initialStage);
        if (photoDate) formData.append('photo_date', photoDate);
        formData.append('image', photoFile);

        createdPlant = await api.registerPlantWithPhoto(formData);
      } else {
        // Standard JSON plant registration without image
        const payload: PlantCreateInput = {
          name: name.trim(),
          crop_type: selectedCrop ? selectedCrop.name : cropType,
          crop_variety: cropVariety.trim(),
          planting_date: plantingDate,
          location: location || undefined,
          description: description || undefined,
        };
        createdPlant = await api.createPlant(payload);
      }

      onSuccess(createdPlant);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register plant.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Register New Plant</h2>
              <p className="text-[11px] text-slate-500">Register crop subject and optionally link initial growth photo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('addPlant.plantName')} <span className="text-rose-500">*</span>
              </label>
              <VoiceFieldControl
                fieldName="Plant Identifier"
                fieldExplanation={t('addPlant.plantNameHelp')}
                onDictate={(text) => setName(text)}
              />
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. North Plot Banana 02"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Crop Type</label>
              <select
                value={cropType}
                onChange={(e) => handleCropChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium text-slate-800"
              >
                {crops.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.scientific_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Crop Variety</label>
              <select
                value={cropVariety}
                onChange={(e) => setCropVariety(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium text-slate-800"
              >
                {selectedCrop?.varieties.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Crop Intelligence Capabilities Callout */}
          <div className={`p-3 rounded-xl text-xs border ${
            selectedCrop?.has_ai_vision_model 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-1.5 font-semibold text-[11px] mb-1">
              {selectedCrop?.has_ai_vision_model ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Computer Vision AI Classification & Forecasting Supported</span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Manual Stage Entry with Phenology-GDD Milestone Forecasting</span>
                </>
              )}
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {selectedCrop?.has_ai_vision_model
                ? `Trained visual stage classifier calibrated for ${selectedCrop.name}. Thermal baseline: ${selectedCrop.base_temperature_c}°C.`
                : `Phenology development modeling is active for ${selectedCrop?.name} (Base temp ${selectedCrop?.base_temperature_c}°C, ~${selectedCrop?.standard_maturity_days} days maturity). Visual stage is assigned manually.`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Planting / Sowing Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">{t('addPlant.location')}</label>
                <VoiceFieldControl
                  fieldName="Location"
                  fieldExplanation={t('addPlant.locationHelp')}
                  onDictate={(text) => setLocation(text)}
                />
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Greenhouse Plot B, Row 4"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Initial Plant Photograph Upload Section */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                <span>Initial Plant Photograph</span>
                <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center gap-3 p-2.5">
                <img
                  src={photoPreview}
                  alt="Initial plant preview"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                />
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {photoFile?.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {((photoFile?.size || 0) / 1024).toFixed(1)} KB • Validated
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Photo Date</span>
                      <input
                        type="date"
                        value={photoDate}
                        onChange={(e) => setPhotoDate(e.target.value)}
                        className="w-full text-[11px] px-1.5 py-0.5 border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Initial Stage</span>
                      <select
                        value={initialStage}
                        onChange={(e) => setInitialStage(e.target.value)}
                        className="w-full text-[11px] px-1.5 py-0.5 border border-slate-200 rounded bg-white"
                      >
                        {selectedCrop?.supported_stages.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
                  isDragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50'
                }`}
              >
                <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-700">
                  Click to browse or drag and drop plant photo
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  JPG, JPEG, PNG, WEBP (Max 10MB). Mobile camera capture supported.
                </p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('addPlant.description')} <span className="text-slate-400 font-normal">({t('common.optional')})</span>
              </label>
              <VoiceFieldControl
                fieldName="Description"
                fieldExplanation={t('addPlant.descriptionHelp')}
                onDictate={(text) => setDescription(text)}
              />
            </div>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Raised organic bed with vermicompost & drip fertigation line."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Register Plant</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
