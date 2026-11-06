import { GrowthStage, CropCatalogItem } from '../types';

export interface ScanDiagnosisResult {
  currentStage: string;
  confidenceScore: number;
  daysSincePlanting: number;
  typicalStageDuration: string;
  nextStageName: string;
  estimatedDaysToNextStage: number;
  lifecycleProgressPct: number;
  stagesProgression: { stage: string; status: 'completed' | 'current' | 'upcoming'; days: string }[];
  careChecklist: { title: string; description: string; priority: 'high' | 'medium' }[];
  nutritionGuidance: {
    npkRatio: string;
    focusNutrient: string;
    micronutrients: string[];
    healthStatus: string;
    advice: string;
  };
  wateringSchedule: {
    optimalTime: string;
    frequency: string;
    targetMoistureBand: string;
    irrigationMethod: string;
    urgencyNote: string;
  };
  reportDataAvailable: boolean;
  cropKnowledgeId: string;
}

export function generateScanDiagnosis(params: {
  cropType: string;
  cropVariety: string;
  plantingDate: string;
  observationDate: string;
  detectedStage: string;
  confidence: number;
  soilMoisture?: number | null;
  temperature?: number | null;
}): ScanDiagnosisResult {
  const crop = (params.cropType || 'Tomato').toLowerCase();
  const stage = params.detectedStage || 'Vegetative';

  // Calculate days elapsed since planting
  const pDate = new Date(params.plantingDate);
  const oDate = new Date(params.observationDate);
  const diffTime = Math.max(0, oDate.getTime() - pDate.getTime());
  const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Default stage ordering
  const standardStages = ['Seedling', 'Vegetative', 'Flowering', 'Fruit Formation', 'Maturity'];
  const bananaStages = ['Vegetative', 'Pseudostem Emergence', 'Inflorescence', 'Fruit Development', 'Harvest Maturity'];
  const activeStages = crop === 'banana' ? bananaStages : standardStages;

  const currentIdx = Math.max(0, activeStages.indexOf(stage));
  const nextIdx = Math.min(activeStages.length - 1, currentIdx + 1);
  const nextStageName = currentIdx < activeStages.length - 1 ? activeStages[nextIdx] : 'Harvest Complete';

  // Stage durations dictionary (typical days per stage)
  const durations: Record<string, Record<string, number>> = {
    tomato: { Seedling: 14, Vegetative: 24, Flowering: 22, 'Fruit Formation': 25, Maturity: 25 },
    chilli: { Seedling: 16, Vegetative: 29, Flowering: 30, 'Fruit Formation': 25, Maturity: 20 },
    brinjal: { Seedling: 18, Vegetative: 32, Flowering: 25, 'Fruit Formation': 30, Maturity: 25 },
    okra: { Seedling: 10, Vegetative: 25, Flowering: 15, 'Fruit Formation': 20, Maturity: 20 },
    cucumber: { Seedling: 10, Vegetative: 20, Flowering: 15, 'Fruit Formation': 15, Maturity: 15 },
    banana: { Vegetative: 120, 'Pseudostem Emergence': 60, Inflorescence: 30, 'Fruit Development': 90, 'Harvest Maturity': 30 },
  };

  const cropDurations = durations[crop] || durations['tomato'];
  const currentStageDuration = cropDurations[stage] || 25;

  // Estimate days until next stage transition
  const estimatedDaysToNext = Math.max(3, Math.round(currentStageDuration * 0.45));
  const progressPct = Math.min(100, Math.round(((currentIdx + 0.6) / activeStages.length) * 100));

  const stagesProgression = activeStages.map((s, idx) => ({
    stage: s,
    status: idx < currentIdx ? ('completed' as const) : idx === currentIdx ? ('current' as const) : ('upcoming' as const),
    days: `~${cropDurations[s] || 20}d`,
  }));

  // Crop & stage specific care actions
  let careChecklist = [
    {
      title: 'Maintain Optimal Sunlight Exposure',
      description: 'Ensure 7 to 8.5 hours of unfiltered direct daylight to support photosynthetic vigor.',
      priority: 'high' as const,
    },
    {
      title: 'Pruning & Foliar Airflow',
      description: 'Remove lower senescent leaves and non-productive suckers to prevent fungal spores from spreading.',
      priority: 'medium' as const,
    },
    {
      title: 'Physical Staking & Support',
      description: 'Check support ties and trellising to prevent heavy floral stems from touching soil.',
      priority: 'high' as const,
    },
  ];

  // Nutritional requirements
  let nutritionGuidance = {
    npkRatio: 'N-P-K: 12-15-20 (Potassium & Phosphorus enriched)',
    focusNutrient: 'Potassium (K) & Calcium (Ca)',
    micronutrients: ['Calcium Nitrate (prevents Blossom End Rot)', 'Boron (supports pollen tube fertility)', 'Magnesium'],
    healthStatus: 'Optimal Chlorophyll Pigmentation (No acute chlorosis detected)',
    advice: 'Supplement calcium nitrate via fertigation. Avoid excessive urea nitrogen which causes flower abortion.',
  };

  if (stage === 'Seedling' || stage === 'Vegetative') {
    careChecklist = [
      {
        title: 'Canopy & Leaf Development',
        description: 'Encourage rapid vegetative branch development with consistent moderate root moisture.',
        priority: 'high' as const,
      },
      {
        title: 'Weed Competition Suppression',
        description: 'Keep root zone free of weeds within 30cm radius to prevent nutrient theft.',
        priority: 'medium' as const,
      },
      {
        title: 'Prevent Damping-off',
        description: 'Avoid water stagnation near seedling collar stem; maintain well-aerated porous substrate.',
        priority: 'high' as const,
      },
    ];

    nutritionGuidance = {
      npkRatio: 'N-P-K: 20-10-10 (Nitrogen dominant for vegetative biomass)',
      focusNutrient: 'Nitrogen (N) for strong stems and expanded leaf lamina',
      micronutrients: ['Zinc (promotes internode elongation)', 'Iron (prevents interveinal yellowing)'],
      healthStatus: 'High Vegetative Biomass & Healthy Green Index',
      advice: 'Apply organic compost or balanced nitrogen feed. Do not over-fertilize to prevent soft, leggy growth.',
    };
  } else if (stage === 'Fruit Formation' || stage === 'Maturity') {
    nutritionGuidance = {
      npkRatio: 'N-P-K: 8-12-26 (High Potassium for sugar translocation and fruit density)',
      focusNutrient: 'Potassium (K) & Micronutrient Silica',
      micronutrients: ['Calcium (cell wall strength)', 'Boron', 'Sulphur'],
      healthStatus: 'Fruit Enlargement Phase — Uniform Turgor',
      advice: 'Transition completely away from high nitrogen. Maintain steady moisture to prevent fruit splitting/cracking.',
    };
  }

  // Watering schedule
  const currentMoisture = params.soilMoisture ?? 56;
  const moistureTarget = crop === 'cucumber' || crop === 'banana' ? '60% - 75%' : '50% - 65%';

  const wateringSchedule = {
    optimalTime: 'Early Morning (6:00 AM – 8:30 AM)',
    frequency: '2 to 3 times per week (Drip irrigation: 2.5 - 3.5 Liters per plant)',
    targetMoistureBand: moistureTarget,
    irrigationMethod: 'Root-Zone Drip Line (Avoid wetting foliage directly)',
    urgencyNote:
      currentMoisture < 45
        ? 'Soil moisture is currently below optimal threshold. Irrigation recommended tomorrow morning.'
        : currentMoisture > 70
        ? 'Soil moisture is currently elevated. Delay next watering cycle to avoid root suffocation.'
        : 'Soil moisture is in the optimal target band. Maintain standard scheduled cycle.',
  };

  return {
    currentStage: stage,
    confidenceScore: Math.round(params.confidence * 100),
    daysSincePlanting: daysElapsed,
    typicalStageDuration: `${currentStageDuration} days`,
    nextStageName,
    estimatedDaysToNextStage: estimatedDaysToNext,
    lifecycleProgressPct: progressPct,
    stagesProgression,
    careChecklist,
    nutritionGuidance,
    wateringSchedule,
    reportDataAvailable: true,
    cropKnowledgeId: crop,
  };
}
