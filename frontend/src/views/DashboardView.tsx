import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Activity,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Thermometer,
  Droplets,
  Sun,
  CloudRain,
  Eye,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  X,
  Clock,
  Layers,
  Cpu,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Info,
  Globe,
  Radio
} from 'lucide-react';
import {
  DashboardData,
  Plant,
  Observation,
  TelemetrySummaryResponse,
  TelemetryReading,
  CropCatalogItem,
  WeatherComparisonResponse
} from '../types';
import { StageBadge } from '../components/StageBadge';
import { api } from '../api/client';
import { NavTab } from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';

interface DashboardViewProps {
  data: DashboardData | null;
  isLoading: boolean;
  onSelectPlant: (plantId: string) => void;
  onOpenAddPlant: () => void;
  onSeedDemo: () => void;
  onNavigateTab?: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  isLoading,
  onSelectPlant,
  onOpenAddPlant,
  onSeedDemo,
  onNavigateTab,
}) => {
  const { t } = useLanguage();
  // Demonstration mode toggle (defaults to true for demo seeds, can toggle to live production mode)
  const [demoMode, setDemoMode] = useState<boolean>(true);

  // Telemetry range state
  const [telemetryRange, setTelemetryRange] = useState<string>('7d');
  const [telemetrySource, setTelemetrySource] = useState<string>('ALL');
  const [telemetrySummary, setTelemetrySummary] = useState<TelemetrySummaryResponse | null>(null);
  const [isTelemetryLoading, setIsTelemetryLoading] = useState(false);

  // Selected telemetry parameter drilldown modal
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null);
  const [modalRange, setModalRange] = useState<string>('7d');
  const [modalSource, setModalSource] = useState<string>('ALL');
  const [paramReadings, setParamReadings] = useState<TelemetryReading[]>([]);
  const [isParamLoading, setIsParamLoading] = useState(false);

  // Weather station comparison state
  const [weatherComparison, setWeatherComparison] = useState<WeatherComparisonResponse | null>(null);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  // Observations Stream State
  const [streamCropFilter, setStreamCropFilter] = useState<string>('all');
  const [streamStageFilter, setStreamStageFilter] = useState<string>('all');
  const [streamPage, setStreamPage] = useState<number>(1);
  const [streamData, setStreamData] = useState<{
    items: Observation[];
    total: number;
    total_pages: number;
  }>({
    items: data?.recent_observations || [],
    total: data?.recent_observations?.length || 0,
    total_pages: 1,
  });
  const [isStreamLoading, setIsStreamLoading] = useState(false);

  // Selected observation for inspection modal
  const [inspectObservation, setInspectObservation] = useState<Observation | null>(null);

  // Soil moisture drilldown modal
  const [isMoistureModalOpen, setIsMoistureModalOpen] = useState(false);

  // Alerts drilldown modal
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  // Crops catalog
  const [crops, setCrops] = useState<CropCatalogItem[]>([]);

  // Fetch telemetry summary when range, source, or demo mode changes
  const fetchTelemetrySummary = (rangeKey: string, sourceKey: string) => {
    setIsTelemetryLoading(true);
    api.getTelemetrySummary(rangeKey, undefined, undefined, sourceKey, demoMode)
      .then((res) => {
        setTelemetrySummary(res);
      })
      .catch((err) => {
        console.warn('Telemetry summary fetch failed:', err);
      })
      .finally(() => {
        setIsTelemetryLoading(false);
      });
  };

  useEffect(() => {
    fetchTelemetrySummary(telemetryRange, telemetrySource);
  }, [telemetryRange, telemetrySource, demoMode]);

  // Fetch crops catalog for filter bar
  useEffect(() => {
    api.getCrops().then(setCrops).catch(() => {});
  }, []);

  // Fetch weather comparison on demand
  const handleToggleWeatherComparison = () => {
    if (!isWeatherOpen && !weatherComparison) {
      setIsWeatherLoading(true);
      api.getWeatherComparison(7)
        .then((res) => {
          setWeatherComparison(res);
        })
        .catch((err) => {
          console.warn('Weather comparison fetch failed:', err);
        })
        .finally(() => {
          setIsWeatherLoading(false);
        });
    }
    setIsWeatherOpen(!isWeatherOpen);
  };

  // Fetch paginated observation stream
  const fetchObservationStream = () => {
    setIsStreamLoading(true);
    api.getAllObservations({
      page: streamPage,
      pageSize: 6,
      cropType: streamCropFilter,
      stage: streamStageFilter,
      includeDemo: demoMode
    })
      .then((res) => {
        setStreamData({
          items: res.items,
          total: res.total,
          total_pages: res.total_pages,
        });
      })
      .catch((err) => {
        console.warn('Failed to fetch observation stream:', err);
      })
      .finally(() => {
        setIsStreamLoading(false);
      });
  };

  useEffect(() => {
    fetchObservationStream();
  }, [streamPage, streamCropFilter, streamStageFilter, demoMode]);

  // Open parameter drilldown modal — inherits current telemetryRange
  const handleOpenParameterModal = (paramKey: string) => {
    const canonicalParam = paramKey === 'daily_sunlight' ? 'sunlight_hours' : paramKey;
    setSelectedParameter(canonicalParam);
    setModalRange(telemetryRange);
    setModalSource(telemetrySource);
    fetchParamReadings(canonicalParam, telemetryRange, telemetrySource);
  };

  const fetchParamReadings = (param: string, rangeKey: string, sourceKey: string) => {
    setIsParamLoading(true);
    api.getTelemetryReadings({
      parameter: param,
      range: rangeKey,
      source: sourceKey !== 'ALL' ? sourceKey : undefined,
      limit: 50,
      includeDemo: demoMode
    })
      .then((res) => {
        setParamReadings(res);
      })
      .catch((err) => {
        console.warn('Failed to load telemetry readings:', err);
        setParamReadings([]);
      })
      .finally(() => {
        setIsParamLoading(false);
      });
  };

  // Change range inside modal
  const handleModalRangeChange = (newRange: string) => {
    setModalRange(newRange);
    setTelemetryRange(newRange);
    if (selectedParameter) {
      fetchParamReadings(selectedParameter, newRange, modalSource);
      fetchTelemetrySummary(newRange, modalSource);
    }
  };

  // Change source filter inside modal
  const handleModalSourceChange = (newSource: string) => {
    setModalSource(newSource);
    setTelemetrySource(newSource);
    if (selectedParameter) {
      fetchParamReadings(selectedParameter, modalRange, newSource);
      fetchTelemetrySummary(modalRange, newSource);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // Active environmental metrics (priority: database telemetry summary, fallback: overview)
  const env = {
    average_temperature: telemetrySummary?.average_temperature ?? data.environmental_overview.average_temperature,
    average_soil_moisture: telemetrySummary?.average_soil_moisture ?? data.environmental_overview.average_soil_moisture,
    average_humidity: telemetrySummary?.average_humidity ?? data.environmental_overview.average_humidity,
    average_sunlight_hours: telemetrySummary?.average_sunlight_hours ?? data.environmental_overview.average_sunlight_hours,
    total_rainfall: telemetrySummary?.total_rainfall ?? data.environmental_overview.total_rainfall,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Demonstration Mode Banner / Toggle */}
      {demoMode && (
        <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
              {t('nav.demoMode')}
            </span>
            <p className="text-xs font-medium">
              {t('dashboard.demoNotice')}
            </p>
          </div>
          <button
            onClick={() => setDemoMode(false)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
          >
            {t('dashboard.switchToLive')}
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-700/80 text-emerald-200 border border-emerald-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>{t('dashboard.heroEngineTag')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            {t('dashboard.heroHeadline')}
          </h1>
          <p className="text-sm text-emerald-100/90 leading-relaxed">
            {t('dashboard.heroDescription')}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {!demoMode && (
            <button
              onClick={() => setDemoMode(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 font-bold text-xs border border-emerald-600 transition-colors cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-amber-300" />
              <span>{t('dashboard.enableDemo')}</span>
            </button>
          )}
          <button
            onClick={onOpenAddPlant}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            {t('nav.registerPlant')}
          </button>
        </div>

        {/* Decorative Pattern */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid — Fully Interactive with Click Handlers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Plants */}
        <div
          onClick={() => onNavigateTab ? onNavigateTab('plants') : undefined}
          role="button"
          tabIndex={0}
          title="Click to view full plant inventory"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors">
                {t('dashboard.totalPlants')}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                <Sprout className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{data.total_plants}</p>
            <p className="text-xs text-slate-500 mt-1">
              {data.monitored_plants} {t('dashboard.underActiveObs')}
            </p>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-emerald-700">
            <span>{t('dashboard.viewInventory')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* KPI 2: Upcoming Milestones */}
        <div
          onClick={() => {
            const el = document.getElementById('milestones-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          role="button"
          tabIndex={0}
          title="Click to inspect upcoming milestones"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-700 transition-colors">
                {t('dashboard.upcomingMilestones')}
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{data.upcoming_milestones.length}</p>
            <p className="text-xs text-slate-500 mt-1">{t('dashboard.projectedTransitions')}</p>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-amber-700">
            <span>{t('dashboard.viewPredictions')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* KPI 3: Avg Root Zone Moisture */}
        <div
          onClick={() => setIsMoistureModalOpen(true)}
          role="button"
          tabIndex={0}
          title="Click to view soil moisture analysis"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-700 transition-colors">
                {t('dashboard.avgSoilMoisture')}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Droplets className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {env.average_soil_moisture !== null && env.average_soil_moisture !== undefined
                ? `${env.average_soil_moisture}%`
                : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Target range: 50% - 65%</p>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-blue-700">
            <span>{t('dashboard.soilMoistureAnalysis')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* KPI 4: Attention Alerts */}
        <div
          onClick={() => setIsAlertsModalOpen(true)}
          role="button"
          tabIndex={0}
          title="Click to review attention alerts"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-rose-700 transition-colors">
                {t('dashboard.attentionAlerts')}
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{data.plants_requiring_attention.length}</p>
            <p className="text-xs text-slate-500 mt-1">{t('dashboard.reviewActiveAlerts')}</p>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-rose-700">
            <span>{t('dashboard.reviewActiveAlerts')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Growth Stage Distribution, Predicted Milestones & Recent Observations */}
        <div className="lg:col-span-2 space-y-8">
          {/* Growth Stage Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">{t('dashboard.stageDistribution')}</h2>
                <p className="text-xs text-slate-500">{t('dashboard.stageDistributionSub')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {data.stage_distribution.map((item) => (
                <div key={item.stage} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <div className="mb-1.5 flex justify-center">
                    <StageBadge stage={item.stage} size="sm" />
                  </div>
                  <p className="text-xl font-black text-slate-900">{item.count}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {data.total_plants > 0 ? `${Math.round((item.count / data.total_plants) * 100)}%` : '0%'} of crops
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Developmental Milestones */}
          <div id="milestones-section" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">{t('dashboard.upcomingMilestones')}</h2>
                <p className="text-xs text-slate-500">Estimated developmental transitions generated by Phenology-GDD Forecaster</p>
              </div>
            </div>

            {data.upcoming_milestones.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No upcoming milestones active.</p>
                <p className="text-[11px] text-slate-400 mt-1">Register plants and record observations to track milestone projections.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcoming_milestones.map((milestone, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectPlant(milestone.plant_id)}
                    className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                          {milestone.plant_name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {milestone.milestone_name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Target Window: {milestone.target_window_start} → {milestone.target_window_end}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {milestone.days_remaining !== null && milestone.days_remaining !== undefined && (
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            milestone.days_remaining <= 5
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {milestone.days_remaining > 0
                            ? `~${milestone.days_remaining} days away`
                            : milestone.days_remaining === 0
                            ? 'Window Active Today'
                            : 'In Window'}
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Longitudinal Observations Stream */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Observations Stream</h2>
                <p className="text-xs text-slate-500">Live continuous photographic submissions & developmental stage assessments</p>
              </div>

              {/* Filter Controls Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={streamCropFilter}
                  onChange={(e) => {
                    setStreamCropFilter(e.target.value);
                    setStreamPage(1);
                  }}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Crops</option>
                  {crops.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={streamStageFilter}
                  onChange={(e) => {
                    setStreamStageFilter(e.target.value);
                    setStreamPage(1);
                  }}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Stages</option>
                  <option value="Seedling">Seedling</option>
                  <option value="Vegetative">Vegetative</option>
                  <option value="Flowering">Flowering</option>
                  <option value="Fruit Formation">Fruit Formation</option>
                  <option value="Maturity">Maturity</option>
                </select>
              </div>
            </div>

            {isStreamLoading ? (
              <div className="py-12 flex justify-center items-center">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
              </div>
            ) : streamData.items.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Sprout className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No real observations available yet.</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Register a plant and upload its first photograph to begin tracking growth.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={onOpenAddPlant}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Register Plant with Photo
                  </button>
                  {!demoMode && (
                    <button
                      onClick={() => setDemoMode(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      View Demo Dataset
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {streamData.items.map((obs) => {
                    const isTomato = obs.crop_type?.toLowerCase() === 'tomato';
                    const hasAiScore = obs.confidence_score !== null && obs.confidence_score !== undefined;
                    return (
                      <div
                        key={obs.id}
                        onClick={() => setInspectObservation(obs)}
                        className="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition-all cursor-pointer bg-white group flex flex-col justify-between"
                      >
                        <div>
                          {obs.image_path ? (
                            <div className="relative h-36 w-full rounded-lg overflow-hidden bg-slate-100 mb-2.5">
                              <img
                                src={obs.image_path}
                                alt="Observation"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  // Fallback on image error
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute top-2 right-2">
                                <StageBadge stage={obs.effective_stage} size="sm" />
                              </div>
                            </div>
                          ) : (
                            <div className="h-36 w-full rounded-lg bg-slate-100 flex flex-col items-center justify-center mb-2.5 text-slate-400">
                              <Sprout className="w-8 h-8 mb-1" />
                              <span className="text-[10px] font-medium">No photo uploaded</span>
                              <div className="mt-1">
                                <StageBadge stage={obs.effective_stage} size="sm" />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                              {obs.plant_name || 'Plant'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(obs.observation_date).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mb-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {obs.crop_type || 'Tomato'}
                            </span>

                            {/* Genuine inference score reporting */}
                            {hasAiScore && isTomato ? (
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {Math.round((obs.confidence_score || 0) * 100)}% AI confidence
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                Manual Stage
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-600">
                            {obs.temperature !== null && obs.temperature !== undefined && (
                              <span>{obs.temperature}°C</span>
                            )}
                            {obs.soil_moisture !== null && obs.soil_moisture !== undefined && (
                              <span>• {obs.soil_moisture}% moist</span>
                            )}
                            {obs.humidity !== null && obs.humidity !== undefined && (
                              <span>• {obs.humidity}% RH</span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                          <span>Inspect Observation</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {streamData.total_pages > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Showing {streamData.items.length} of {streamData.total} observations
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStreamPage((p) => Math.max(1, p - 1))}
                        disabled={streamPage === 1}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                      >
                        <ChevronLeft className="w-4 h-4 inline" /> Prev
                      </button>
                      <span className="font-semibold text-slate-700">
                        Page {streamPage} of {streamData.total_pages}
                      </span>
                      <button
                        onClick={() => setStreamPage((p) => Math.min(streamData.total_pages, p + 1))}
                        disabled={streamPage === streamData.total_pages}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                      >
                        Next <ChevronRight className="w-4 h-4 inline" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Telemetry Environment Summary & Action Alerts */}
        <div className="space-y-6">
          {/* Environmental Sensor Summary — Range Filtering & Interactive Cards */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">{t('dashboard.telemetrySummary')}</h2>
                <p className="text-xs text-slate-500">
                  {telemetrySummary?.date_range_label || 'Aggregated microclimate sensors'}
                </p>
              </div>
              {isTelemetryLoading && (
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              )}
            </div>

            {/* Date Range Selector Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {['24h', '7d', '30d', '90d', 'all'].map((rangeOption) => (
                <button
                  key={rangeOption}
                  onClick={() => setTelemetryRange(rangeOption)}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    telemetryRange === rangeOption
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {rangeOption.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Database Readings Count & Source Info */}
            {telemetrySummary && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-emerald-50/50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                <span className="font-semibold text-emerald-900">
                  {telemetrySummary.total_readings_count} {t('dashboard.verifiedReadings')}
                </span>
                <span className="text-slate-500 text-[10px]">
                  Click parameter to drilldown
                </span>
              </div>
            )}

            {/* Clickable Telemetry Parameters */}
            <div className="space-y-3 pt-1">
              {/* Mean Temp */}
              <div
                onClick={() => handleOpenParameterModal('temperature')}
                role="button"
                tabIndex={0}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-rose-300 hover:bg-rose-50/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Thermometer className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-rose-900">
                    Mean Temperature
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {env.average_temperature !== null && env.average_temperature !== undefined
                      ? `${env.average_temperature} °C`
                      : '—'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Mean Soil Moisture */}
              <div
                onClick={() => handleOpenParameterModal('soil_moisture')}
                role="button"
                tabIndex={0}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-900">
                    Mean Soil Moisture
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {env.average_soil_moisture !== null && env.average_soil_moisture !== undefined
                      ? `${env.average_soil_moisture} %`
                      : '—'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Humidity */}
              <div
                onClick={() => handleOpenParameterModal('humidity')}
                role="button"
                tabIndex={0}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Droplets className="w-4 h-4 text-teal-500" />
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-teal-900">
                    Relative Humidity
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {env.average_humidity !== null && env.average_humidity !== undefined
                      ? `${env.average_humidity} %`
                      : '—'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Sunlight */}
              <div
                onClick={() => handleOpenParameterModal('sunlight_hours')}
                role="button"
                tabIndex={0}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-amber-900">
                    Daily Sunlight
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {env.average_sunlight_hours !== null && env.average_sunlight_hours !== undefined
                      ? `${env.average_sunlight_hours} hrs`
                      : '—'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Precipitation */}
              <div
                onClick={() => handleOpenParameterModal('rainfall')}
                role="button"
                tabIndex={0}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-sky-300 hover:bg-sky-50/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <CloudRain className="w-4 h-4 text-sky-500" />
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-sky-900">
                    Recorded Precipitation
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {env.total_rainfall !== null && env.total_rainfall !== undefined
                      ? `${env.total_rainfall} mm`
                      : '0 mm'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>

            {/* External Weather Comparison Card / Toggle */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleToggleWeatherComparison}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50/80 hover:bg-emerald-50/30 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Weather Station Comparison (7D)</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold">
                  {isWeatherOpen ? 'Hide' : 'Inspect'}
                </span>
              </button>

              {isWeatherOpen && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 animate-in fade-in duration-150">
                  {isWeatherLoading ? (
                    <div className="py-4 flex justify-center">
                      <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                    </div>
                  ) : weatherComparison ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] uppercase font-bold text-emerald-800">
                            Canopy Microclimate
                          </span>
                          <p className="text-base font-black text-emerald-950 mt-0.5">
                            {weatherComparison.plantpulse_measured_temperature ?? '—'} °C
                          </p>
                          <span className="text-[9px] text-emerald-700 block">PlantPulse In-situ Node</span>
                        </div>
                        <div className="p-2 rounded-lg bg-sky-50 border border-sky-200">
                          <span className="text-[10px] uppercase font-bold text-sky-800">
                            Regional Ambient Tower
                          </span>
                          <p className="text-base font-black text-sky-950 mt-0.5">
                            {weatherComparison.external_weather_temperature ?? '—'} °C
                          </p>
                          <span className="text-[9px] text-sky-700 block">IMD/Open-Meteo 2m Station</span>
                        </div>
                      </div>

                      {weatherComparison.temperature_delta !== null && (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                          <p className="font-bold">
                            Microclimate Variance: ΔT = {weatherComparison.temperature_delta > 0 ? '+' : ''}{weatherComparison.temperature_delta}°C
                          </p>
                          <p className="text-[10px] text-amber-800 mt-1 leading-relaxed">
                            {weatherComparison.delta_explanation}
                          </p>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Attention Alerts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Agronomic Action Alerts
              </h2>
              {data.plants_requiring_attention.length > 0 && (
                <button
                  onClick={() => setIsAlertsModalOpen(true)}
                  className="text-[11px] font-bold text-amber-700 hover:underline"
                >
                  View All ({data.plants_requiring_attention.length})
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">Autonomous risk detection based on sensor boundaries</p>

            {data.plants_requiring_attention.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All telemetry within normal bounds</span>
                </div>
                <p className="text-[11px] text-emerald-700">No critical thermal or root zone moisture stress detected.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.plants_requiring_attention.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectPlant(item.plant_id)}
                    className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-50 transition-colors cursor-pointer text-xs group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 group-hover:text-amber-900 transition-colors">
                        {item.plant_name}
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-amber-200 text-amber-800">
                        {item.severity}
                      </span>
                    </div>
                    <p className="font-semibold text-amber-900">{item.issue}</p>
                    <p className="text-[11px] text-slate-600 mt-1">{item.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Telemetry Parameter Drilldown Modal — Fully Inherits Range, Has Range Toggles & Trend Graph */}
      {selectedParameter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 capitalize">
                    {selectedParameter.replace('_', ' ')} Telemetry Detail
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Active Range: <span className="font-bold text-slate-700">{modalRange.toUpperCase()}</span> • Provenance Verified
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedParameter(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Range & Source Filter Pills INSIDE Modal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Time Range:</span>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {['24h', '7d', '30d', '90d', 'all'].map((r) => (
                      <button
                        key={r}
                        onClick={() => handleModalRangeChange(r)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                          modalRange === r
                            ? 'bg-white text-emerald-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Data Source:</span>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {['ALL', 'IOT_SENSOR', 'MANUAL_ENTRY', 'EXTERNAL_IMPORT'].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleModalSourceChange(s)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          modalSource === s
                            ? 'bg-white text-emerald-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stat summary cards */}
              {telemetrySummary?.parameters && telemetrySummary.parameters[selectedParameter] && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Mean</span>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      {telemetrySummary.parameters[selectedParameter].mean ?? '—'} {telemetrySummary.parameters[selectedParameter].unit}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Min</span>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      {telemetrySummary.parameters[selectedParameter].min ?? '—'} {telemetrySummary.parameters[selectedParameter].unit}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Max</span>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      {telemetrySummary.parameters[selectedParameter].max ?? '—'} {telemetrySummary.parameters[selectedParameter].unit}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Valid</span>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      {telemetrySummary.parameters[selectedParameter].readings_count}
                    </p>
                  </div>
                </div>
              )}

              {/* Calculation Formula & Transparency Card */}
              {telemetrySummary?.parameters && telemetrySummary.parameters[selectedParameter] && (
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                    <Info className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Calculation Formula:</span>
                  </div>
                  <p className="font-mono text-[11px] text-emerald-900 bg-white/70 px-2 py-1 rounded border border-emerald-200/50">
                    {telemetrySummary.parameters[selectedParameter].formula || `Mean = Sum of valid readings / Total count`}
                  </p>
                  <p className="text-[10px] text-emerald-800">
                    Methodology: Measurement-level arithmetic averaging across {telemetrySummary.parameters[selectedParameter].plants_count || 1} distinct crop subject(s).
                  </p>
                </div>
              )}

              {/* Interactive Trend Graph (SVG Polyline & Data Points) */}
              {paramReadings.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      Chronological Measurement Trend
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {paramReadings.length} data point(s) plotted
                    </span>
                  </div>

                  <div className="h-32 w-full pt-2">
                    {(() => {
                      const vals = paramReadings.map((r) => r.value);
                      const minV = Math.min(...vals);
                      const maxV = Math.max(...vals);
                      const range = maxV === minV ? 1 : maxV - minV;
                      const width = 450;
                      const height = 90;
                      const padding = 15;

                      const points = paramReadings
                        .slice()
                        .reverse()
                        .map((r, i, arr) => {
                          const x = padding + (i / Math.max(1, arr.length - 1)) * (width - 2 * padding);
                          const y = height - padding - ((r.value - minV) / range) * (height - 2 * padding);
                          return { x, y, val: r.value, date: new Date(r.timestamp).toLocaleDateString() };
                        });

                      const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

                      return (
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                          {/* Grid line */}
                          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#cbd5e1" strokeDasharray="3 3" />
                          {/* Polyline */}
                          <polyline fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={polylinePoints} />
                          {/* Circles */}
                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="#059669" strokeWidth="2.5" />
                              <text x={p.x} y={p.y - 8} fontSize="9" textAnchor="middle" fontWeight="bold" fill="#0f172a">
                                {p.val}
                              </text>
                            </g>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Raw Readings Stream */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">Individual Telemetry Records</h4>
                {isParamLoading ? (
                  <div className="py-6 flex justify-center">
                    <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                  </div>
                ) : paramReadings.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">
                      No valid {selectedParameter.replace('_', ' ')} readings found for the selected {modalRange.toUpperCase()} period.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Adjust the time range or data source filter above to inspect earlier historical telemetry.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {paramReadings.map((r) => (
                      <div
                        key={r.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">
                              {r.value} {r.unit}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-slate-200 text-slate-700">
                              {r.data_source}
                            </span>
                            {r.sensor_id && (
                              <span className="text-[9px] font-mono text-slate-500">
                                {r.sensor_id}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {r.plant_name ? `${r.plant_name} • ` : ''}
                            {new Date(r.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (Asia/Kolkata)
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {r.validation_status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Observation Detail Modal */}
      {inspectObservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Observation Record</h3>
                <p className="text-[11px] text-slate-500">
                  {inspectObservation.plant_name || 'Plant'} • {new Date(inspectObservation.observation_date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setInspectObservation(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {inspectObservation.image_path ? (
                <div className="h-48 w-full rounded-xl overflow-hidden bg-slate-100 relative">
                  <img
                    src={inspectObservation.image_path}
                    alt="Observation full"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <StageBadge stage={inspectObservation.effective_stage} />
                  </div>
                </div>
              ) : (
                <div className="h-32 w-full rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Sprout className="w-10 h-10" />
                </div>
              )}

              {/* Crop & AI Analysis Information */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Crop Classification:</span>
                  <span className="font-bold text-slate-900">
                    {inspectObservation.crop_type || 'Tomato'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Assigned Growth Stage:</span>
                  <span className="font-bold text-emerald-800">
                    {inspectObservation.effective_stage}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">AI Computer Vision Status:</span>
                  {inspectObservation.confidence_score ? (
                    <span className="font-bold text-emerald-700">
                      {Math.round(inspectObservation.confidence_score * 100)}% AI Inference Confidence
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium">
                      Not analysed (Manual Stage)
                    </span>
                  )}
                </div>
              </div>

              {/* Environmental Telemetry */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-800">Telemetry Logged with Observation</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-rose-50/50 border border-rose-100">
                    <span className="text-[10px] text-slate-500">Temp</span>
                    <p className="font-bold text-slate-800">
                      {inspectObservation.temperature !== null ? `${inspectObservation.temperature}°C` : '—'}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50/50 border border-blue-100">
                    <span className="text-[10px] text-slate-500">Moisture</span>
                    <p className="font-bold text-slate-800">
                      {inspectObservation.soil_moisture !== null ? `${inspectObservation.soil_moisture}%` : '—'}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-teal-50/50 border border-teal-100">
                    <span className="text-[10px] text-slate-500">Humidity</span>
                    <p className="font-bold text-slate-800">
                      {inspectObservation.humidity !== null ? `${inspectObservation.humidity}%` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    const plantId = inspectObservation.plant_id;
                    setInspectObservation(null);
                    onSelectPlant(plantId);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors"
                >
                  <span>Open Plant Timeline</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Soil Moisture Analysis Drilldown Modal */}
      {isMoistureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Root Zone Moisture Analysis</h3>
                  <p className="text-[11px] text-slate-500">Volumetric Water Content (%) Diagnostics</p>
                </div>
              </div>
              <button
                onClick={() => setIsMoistureModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide">
                  Current Mean Root Zone Moisture
                </span>
                <p className="text-3xl font-black text-blue-950 mt-1">
                  {env.average_soil_moisture !== null && env.average_soil_moisture !== undefined
                    ? `${env.average_soil_moisture}%`
                    : 'No telemetry available'}
                </p>
                <p className="text-[11px] text-blue-700 mt-1">
                  Optimal Target: <span className="font-bold">50% - 65% VWC</span>
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">Agronomic Guidelines</h4>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-slate-600">
                  <p>• <strong>Below 50%:</strong> Moisture deficit may impede nutrient uptake and delay flowering window.</p>
                  <p>• <strong>50% - 65%:</strong> Optimal physiological condition for healthy root respiration.</p>
                  <p>• <strong>Above 65%:</strong> Risk of root waterlogging and fungal collar rot.</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsMoistureModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Close Diagnostics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Agronomic Action Alerts Drilldown Modal */}
      {isAlertsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Agronomic Action Alerts</h3>
                  <p className="text-[11px] text-slate-500">Autonomous risk detection across microclimate thresholds</p>
                </div>
              </div>
              <button
                onClick={() => setIsAlertsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {data.plants_requiring_attention.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No active alerts</p>
                  <p className="text-[11px] mt-0.5">All monitored crop environments are currently operating within safe agronomic parameters.</p>
                </div>
              ) : (
                data.plants_requiring_attention.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{alert.plant_name}</span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-amber-200 text-amber-800">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="font-semibold text-amber-900">{alert.issue}</p>
                    <p className="text-slate-600 text-[11px]">{alert.recommendation}</p>
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => {
                          setIsAlertsModalOpen(false);
                          onSelectPlant(alert.plant_id);
                        }}
                        className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        Inspect Plant Timeline <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
