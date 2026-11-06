import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  MapPin,
  Camera,
  Trash2,
  ChevronRight,
  Sprout,
  Sparkles,
} from 'lucide-react';
import { Plant, GrowthStage } from '../types';
import { StageBadge } from '../components/StageBadge';
import { useLanguage } from '../context/LanguageContext';

interface PlantsViewProps {
  plants: Plant[];
  onSelectPlant: (plantId: string) => void;
  onOpenAddPlant: () => void;
  onDeletePlant: (plantId: string) => void;
  onSeedDemo: () => void;
}

const STAGES: (GrowthStage | 'All')[] = [
  'All',
  'Seedling',
  'Vegetative',
  'Flowering',
  'Fruit Formation',
  'Maturity',
];

export const PlantsView: React.FC<PlantsViewProps> = ({
  plants,
  onSelectPlant,
  onOpenAddPlant,
  onDeletePlant,
  onSeedDemo,
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [cropFilter, setCropFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [varietyFilter, setVarietyFilter] = useState<string>('All');

  // Filter logic
  const filteredPlants = plants.filter((plant) => {
    const matchesSearch =
      plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (plant.location && plant.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (plant.description && plant.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCrop =
      cropFilter === 'All' || plant.crop_type.toLowerCase() === cropFilter.toLowerCase();

    const matchesStage =
      stageFilter === 'All' || plant.latest_stage === stageFilter;

    const matchesVariety =
      varietyFilter === 'All' || plant.crop_variety === varietyFilter;

    return matchesSearch && matchesCrop && matchesStage && matchesVariety;
  });

  const uniqueCrops = Array.from(new Set(plants.map((p) => p.crop_type)));
  const uniqueVarieties = Array.from(new Set(plants.map((p) => p.crop_variety)));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('plants.title')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('plants.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {plants.length === 0 && (
            <button
              onClick={onSeedDemo}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('nav.loadDemo')}</span>
            </button>
          )}

          <button
            onClick={onOpenAddPlant}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('nav.registerPlant')}</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search plant name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
          >
            <option value="All">All Crops</option>
            {uniqueCrops.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {uniqueVarieties.length > 0 && (
            <select
              value={varietyFilter}
              onChange={(e) => setVarietyFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Varieties</option>
              {uniqueVarieties.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Plants Grid */}
      {filteredPlants.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <Sprout className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No matching plants found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or register a new plant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlants.map((plant) => (
            <div
              key={plant.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        onClick={() => onSelectPlant(plant.id)}
                        className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors cursor-pointer"
                      >
                        {plant.name}
                      </h3>
                      {plant.is_demo && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          Demo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {plant.crop_type} • <span className="font-semibold text-slate-700">{plant.crop_variety}</span>
                    </p>
                  </div>

                  <StageBadge stage={plant.latest_stage} size="sm" />
                </div>

                <div className="space-y-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Planted: {plant.planting_date}</span>
                  </div>

                  {plant.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{plant.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">
                      {plant.observation_count} observation(s)
                    </span>
                    {plant.latest_observation_date && (
                      <span className="text-[11px] text-slate-400">
                        (Latest: {new Date(plant.latest_observation_date).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onDeletePlant(plant.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete plant record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onSelectPlant(plant.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  <span>Inspect Timeline</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
