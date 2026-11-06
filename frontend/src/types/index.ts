export type GrowthStage = "Seedling" | "Vegetative" | "Flowering" | "Fruit Formation" | "Maturity";

export interface Plant {
  id: string;
  name: string;
  crop_type: string;
  crop_variety: string;
  planting_date: string;
  location?: string | null;
  description?: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  latest_stage?: GrowthStage | string;
  observation_count: number;
  latest_observation_date?: string | null;
  has_forecast: boolean;
}

export interface PlantCreateInput {
  name: string;
  crop_type: string;
  crop_variety: string;
  planting_date: string;
  location?: string;
  description?: string;
}

export interface Observation {
  id: string;
  plant_id: string;
  plant_name?: string | null;
  crop_type?: string | null;
  observation_date: string;
  image_path?: string | null;
  temperature?: number | null;
  humidity?: number | null;
  soil_moisture?: number | null;
  sunlight_hours?: number | null;
  rainfall?: number | null;
  manual_growth_stage?: string | null;
  ai_growth_stage?: string | null;
  confidence_score?: number | null;
  model_version?: string | null;
  stage_scores?: Record<string, number> | null;
  effective_stage: GrowthStage | string;
  is_demo: boolean;
  data_source?: string;
  created_at: string;
}

export interface DateRange {
  start?: string | null;
  end?: string | null;
  status?: "COMPLETED" | "CURRENT" | "UPCOMING";
}

export interface AgriculturalRecommendation {
  type: string;
  severity: "info" | "warning" | "alert";
  title: string;
  message: string;
}

export interface EnvironmentalFactors {
  average_temperature_c?: number;
  average_humidity_pct?: number;
  average_soil_moisture_pct?: number;
  average_sunlight_hours?: number;
  estimated_growth_rate_factor?: number;
  accumulated_gdd?: number;
  variety_adjustment_factor?: number;
}

export interface Forecast {
  id: string;
  plant_id: string;
  forecast_date: string;
  current_stage: GrowthStage | string;
  method: string;
  model_version: string;
  observations_used_count: number;
  flowering_window: DateRange;
  fruit_formation_window: DateRange;
  maturity_window: DateRange;
  harvest_window: DateRange;
  environmental_factors: EnvironmentalFactors;
  assumptions: string[];
  limitations: string[];
  recommendations: AgriculturalRecommendation[];
  is_latest: boolean;
  created_at: string;
}

export interface UpcomingMilestone {
  plant_id: string;
  plant_name: string;
  milestone_name: string;
  target_window_start?: string | null;
  target_window_end?: string | null;
  days_remaining?: number | null;
}

export interface StageCount {
  stage: string;
  count: number;
}

export interface EnvironmentalSummary {
  average_temperature?: number | null;
  average_humidity?: number | null;
  average_soil_moisture?: number | null;
  total_rainfall?: number | null;
  average_sunlight_hours?: number | null;
  observation_count: number;
}

export interface PlantAttentionItem {
  plant_id: string;
  plant_name: string;
  issue: string;
  severity: "info" | "warning" | "alert";
  recommendation: string;
}

export interface DashboardData {
  total_plants: number;
  monitored_plants: number;
  stage_distribution: StageCount[];
  upcoming_milestones: UpcomingMilestone[];
  recent_observations: Observation[];
  environmental_overview: EnvironmentalSummary;
  plants_requiring_attention: PlantAttentionItem[];
}

export interface ModelStatus {
  model_name: string;
  is_available: boolean;
  model_version: string;
  target_crop: string;
  supported_stages: string[];
  metrics: Record<string, any>;
  status_message: string;
}

export interface ImageAnalysisResult {
  observation_id: string;
  plant_id: string;
  predicted_stage: GrowthStage | string;
  confidence_score: number;
  model_version: string;
  stage_scores: Record<string, number>;
  model_available: boolean;
  source: string;
  analysis_summary: string;
  known_limitations: string;
}

export interface CropCatalogItem {
  id: string;
  name: string;
  scientific_name: string;
  varieties: string[];
  supported_stages: string[];
  has_ai_vision_model: boolean;
  has_forecasting_model: boolean;
  base_temperature_c: number;
  cutoff_temperature_c: number;
  standard_maturity_days: number;
  optimal_moisture_min: number;
  optimal_moisture_max: number;
  is_active: boolean;
  model_status_note: string;
}

export interface TelemetryReading {
  id: string;
  plant_id: string;
  plant_name?: string | null;
  crop_type?: string | null;
  observation_id?: string | null;
  parameter_name: string;
  value: number;
  unit: string;
  timestamp: string;
  data_source: "MANUAL_ENTRY" | "IOT_SENSOR" | "EXTERNAL_IMPORT" | string;
  sensor_id?: string | null;
  validation_status: string;
}

export interface TelemetryParameterStat {
  parameter_name: string;
  unit: string;
  mean?: number | null;
  min?: number | null;
  max?: number | null;
  readings_count: number;
  plants_count?: number;
  formula?: string;
  per_plant_averages?: Record<string, number>;
  source_breakdown?: Record<string, number>;
  latest_reading?: number | null;
  latest_timestamp?: string | null;
}

export interface TelemetrySummaryResponse {
  date_range_label: string;
  total_readings_count: number;
  source_breakdown: Record<string, number>;
  parameters: Record<string, TelemetryParameterStat>;
  average_temperature?: number | null;
  average_soil_moisture?: number | null;
  average_humidity?: number | null;
  average_sunlight_hours?: number | null;
  total_rainfall?: number | null;
  is_data_available: boolean;
  calculation_timestamp?: string;
  calculation_methodology?: string;
  demonstration_mode?: boolean;
}

export interface WeatherComparisonResponse {
  location: string;
  region_coordinates: string;
  time_period: string;
  plantpulse_measured_temperature: number | null;
  plantpulse_unit: string;
  plantpulse_measurement_type: string;
  plantpulse_readings_used: number;
  external_weather_temperature: number | null;
  external_unit: string;
  external_source: string;
  external_measurement_type: string;
  temperature_delta: number | null;
  delta_explanation: string;
  is_external_available: boolean;
  is_live_external_feed: boolean;
  scientific_investigation_summary: string[];
}

export interface PaginatedObservationResponse {
  items: Observation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// User & Authentication Types
export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string | null;
  preferred_language: 'en' | 'kn' | 'hi';
  voice_assistant_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface SignupResponse {
  message: string;
  email: string;
  requires_verification: boolean;
  email_sent: boolean;
}

// Agricultural Dataset Library Types
export interface StageAgronomyDetail {
  stage_name: string;
  order: number;
  typical_duration_days: number;
  min_gdd_threshold: number;
  visual_characteristics: string[];
  recommended_practices: string[];
  key_risks: string[];
}

export interface CropAgronomyProfile {
  id: string;
  crop_name: string;
  scientific_name: string;
  common_names: Record<string, string>;
  optimal_temperature_c: { min: number; max: number };
  base_temperature_c: number;
  cutoff_temperature_c: number;
  optimal_soil_moisture_pct: { min: number; max: number };
  optimal_soil_ph: { min: number; max: number };
  critical_growth_stages: StageAgronomyDetail[];
  common_stress_factors: string[];
  icar_fao_references: string[];
  dataset_source: string;
}

export interface TrainingDatasetItem {
  id: string;
  dataset_name: string;
  provider: string;
  license: string;
  total_images: number;
  supported_crops: string[];
  annotated_growth_stages: string[];
  benchmark_accuracy: string;
  description: string;
  publication_year: number;
  reference_url: string;
}

export interface PlantReportObservationSummary {
  total_observations: number;
  first_observation_date: string | null;
  latest_observation_date: string | null;
  days_monitored: number;
  stages_observed: string[];
}

export interface PlantReportMicroclimateSummary {
  mean_temperature_c: number | null;
  mean_soil_moisture_pct: number | null;
  mean_humidity_pct: number | null;
  mean_sunlight_hours: number | null;
  total_rainfall_mm: number | null;
  readings_count: number;
}

export interface PlantReportResponse {
  plant_id: string;
  plant_name: string;
  crop_type: string;
  crop_variety: string;
  planting_date: string;
  location: string | null;
  report_generated_at: string;
  current_stage: string;
  agronomic_baseline: CropAgronomyProfile | null;
  observation_summary: PlantReportObservationSummary;
  microclimate_summary: PlantReportMicroclimateSummary;
  forecast_summary: Record<string, any> | null;
  limitations: string[];
  agricultural_recommendations: AgriculturalRecommendation[];
}

// Agricultural Chatbot Types
export interface ChatMessage {
  id: string;
  user_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  related_plant_id?: string | null;
  created_at: string;
}

export interface ChatbotResponse {
  response: string;
  is_agricultural: boolean;
  related_plant_id?: string | null;
  suggested_questions: string[];
}

// ================= Advanced Plant Analysis & Growth Intelligence Engine Types =================

export interface BotanicalVisualCues {
  canopy_coverage_pct: number;
  flower_bloom_ratio: number;
  fruit_ripening_pigment_ratio: number;
  unripe_fruit_ratio: number;
  green_leaf_index: number;
  excess_green_index: number;
  chlorosis_yellow_ratio: number;
  necrosis_brown_ratio: number;
  texture_complexity: number;
  visual_stage_markers: string[];
}

export interface GrowthProgressData {
  days_since_planting: number;
  accumulated_gdd: number;
  gdd_base_temperature: number;
  expected_stage: string;
  target_stage_gdd: number;
  percent_towards_next_milestone: number;
  estimated_days_to_next_stage: number;
}

export interface MilestoneForecast {
  milestone_name: string;
  target_date_range: string;
  days_remaining: number;
  confidence_window: string;
  key_physiological_events: string;
}

export interface FutureDevelopmentData {
  predicted_milestones: MilestoneForecast[];
  estimated_harvest_window: string;
  total_estimated_cycle_days: number;
  thermal_time_forecast_notes: string;
}

export interface HealthSymptom {
  symptom_name: string;
  severity: string;
  affected_area: string;
  visual_evidence: string;
  probable_stress_source: string;
}

export interface HealthAssessmentData {
  overall_health_score: number;
  overall_health_status: string;
  chlorosis_risk: string;
  moisture_stress_risk: string;
  thermal_stress_risk: string;
  wilting_risk: string;
  detected_symptoms: HealthSymptom[];
  botanical_explanation: string;
}

export interface EnvironmentalCorrelationData {
  recorded_soil_moisture: number | null;
  optimal_soil_moisture_range: string;
  soil_moisture_evaluation: string;
  recorded_temperature: number | null;
  optimal_temperature_range: string;
  temperature_evaluation: string;
  recorded_sunlight_hours: number | null;
  optimal_sunlight_range: string;
  sunlight_evaluation: string;
  correlation_synthesis: string;
}

export interface AgronomicRecommendationsData {
  irrigation_schedule_advice: string;
  optimal_watering_time: string;
  soil_nutrient_management: string;
  canopy_and_microclimate_actions: string;
  preventive_cultural_practices: string[];
  non_chemical_precautions: string[];
}

export interface NextBestObservationData {
  recommended_date_range: string;
  recommended_focus_area: string;
  priority_developmental_transition: string;
  action_guidance: string;
}

export interface ModelMetadataData {
  model_name: string;
  model_version: string;
  inference_time_ms: number;
  feature_dimension: number;
  crop_specific_model: boolean;
  crop_target: string;
  model_transparency_note: string;
  academic_citations: Array<{ source: string; citation: string }>;
}

export interface PlantAnalysisResponse {
  id: string;
  plant_id: string;
  observation_id: string | null;
  user_id: string | null;
  analysis_timestamp: string;
  image_url: string | null;
  plant_overview: {
    id: string;
    name: string;
    crop_type: string;
    crop_variety: string;
    location: string;
    planting_date: string;
    days_since_planting: number;
    is_demo: boolean;
    total_observations_recorded: number;
  };
  predicted_stage: string;
  confidence_score: number;
  stage_scores: Record<string, number>;
  botanical_visual_cues: BotanicalVisualCues;
  growth_progress: GrowthProgressData;
  future_development: FutureDevelopmentData;
  health_assessment: HealthAssessmentData;
  environmental_correlation: EnvironmentalCorrelationData;
  recommendations: AgronomicRecommendationsData;
  next_recommended_actions: string[];
  next_best_observation: NextBestObservationData;
  model_metadata: ModelMetadataData;
  user_feedback: string | null;
  user_notes: string | null;
}

export interface ProbableCauseItem {
  cause: string;
  likelihood: string;
  reasoning: string;
  supporting_evidence: string;
}

export interface ProblemAnalysisResponse {
  id: string;
  problem_id: string;
  plant_id: string;
  summary: string;
  severity: string;
  probable_causes: ProbableCauseItem[];
  recommended_actions: string[];
  precautions: string[];
  follow_up_schedule: string;
  expert_guidance: string;
  icar_fao_citations: Array<{ source: string; citation: string }>;
  created_at: string;
}

export interface PlantProblemResponse {
  id: string;
  plant_id: string;
  category: string;
  description: string;
  affected_part: string;
  onset_date: string | null;
  is_spreading: string;
  irrigation_notes: string | null;
  fertilizer_notes: string | null;
  image_path: string | null;
  status: string;
  created_at: string;
  analyses: ProblemAnalysisResponse[];
}

export interface TimelineMilestone {
  stage: string;
  expected_day: number;
  expected_date: string;
  observed_day: number | null;
  observed_date: string | null;
  status: 'Completed' | 'In Progress' | 'Pending' | 'Delayed';
}

export interface DigitalTwinResponse {
  plant_id: string;
  plant_name: string;
  crop_type: string;
  crop_variety: string;
  planting_date: string;
  chronological_age_days: number;
  expected_gdd: number;
  actual_gdd: number;
  expected_stage: string;
  actual_stage: string;
  deviation_days: number;
  deviation_status: 'Within Expected Range' | 'Faster Than Reference' | 'Slower Than Reference' | 'Potential Growth Concern' | 'Insufficient Data';
  deviation_explanation: string;
  timeline: TimelineMilestone[];
  radar_factors: {
    thermal_accumulation_rate: number;
    reference_thermal_rate: number;
    mean_recorded_temperature: number;
    current_stage_match: boolean;
    days_ahead_or_behind: number;
    observations_recorded: number;
  };
  reference_gdd_curve: Array<{ day: number; expected_gdd: number; actual_gdd: number | null }>;
}

export interface WhatIfRequest {
  soil_moisture_delta_pct?: number;
  temperature_delta_c?: number;
  sunlight_delta_hours?: number;
}

export interface WhatIfResponse {
  plant_id: string;
  current_estimated_harvest_days: number;
  simulated_estimated_harvest_days: number;
  harvest_shift_days: number;
  impact_summary: string;
  daily_gdd_change: number;
  physiological_consequences: string[];
  agronomic_recommendation: string;
  disclaimer: string;
}

// Treatment & Recovery Plans
export interface TreatmentActionItem {
  id: string;
  action_text: string;
  action_type: 'immediate' | 'cultural' | 'monitoring' | 'precaution' | string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface RecoveryObservationItem {
  id: string;
  observation_date: string;
  image_path: string | null;
  symptom_status: 'improved' | 'unchanged' | 'worsened' | string;
  notes: string;
  created_at: string;
}

export interface TreatmentPlan {
  id: string;
  plant_id: string;
  user_id: string | null;
  problem_id: string | null;
  plant_name: string;
  crop_type: string;
  crop_variety: string;
  condition_name: string;
  severity: string;
  problem_summary: string;
  possible_cause: string;
  evidence_notes: string | null;
  immediate_precautions: string[];
  recommended_practices: string[];
  monitoring_instructions: string;
  follow_up_timeline: string;
  expected_improvement_signs: string | null;
  expert_assistance_guidance: string | null;
  references: Array<{ source: string; citation: string }>;
  status: 'active' | 'in_progress' | 'resolved' | string;
  treatment_start_date: string | null;
  actions: TreatmentActionItem[];
  recovery_observations: RecoveryObservationItem[];
  created_at: string;
  updated_at: string;
}

// Geometric Anomaly Inspector
export interface GeometricAnalysisResult {
  id: string;
  plant_id: string;
  observation_id: string | null;
  original_image_url: string;
  processed_overlay_url: string;
  mask_image_url: string;
  leaf_area_px: number;
  perimeter_px: number;
  aspect_ratio: number;
  circularity: number;
  convexity: number;
  asymmetry_index: number;
  canopy_coverage_pct: number;
  relative_area_change_pct: number;
  anomaly_flags: string[];
  anomaly_score: number;
  reliability: string;
  interpretation: string;
  limitations_disclaimer: string;
  created_at: string;
}

// Agricultural Disease Dataset Gallery
export interface DiseaseDatasetItem {
  id: string;
  title: string;
  crop: string;
  scientific_name: string;
  causal_organism: string;
  class_label: string;
  description: string;
  typical_symptoms: string[];
  dataset_source: string;
  source_url: string;
  license: string;
  image_url: string;
  image_count_in_dataset: number;
  is_healthy: boolean;
}

export interface DiseaseDatasetInferenceResponse {
  dataset_id: string;
  crop: string;
  known_dataset_label: string;
  model_predicted_condition: string;
  model_confidence_score: number;
  agreement_status: string;
  evaluation_notes: string;
  botanical_indicators: {
    green_canopy_ratio: number;
    chlorosis_ratio: number;
    necrosis_ratio: number;
    inference_time_ms: number;
  };
}



