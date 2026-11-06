from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# --- Visual Cues & Botanical Indices ---
class BotanicalVisualCues(BaseModel):
    canopy_coverage_pct: float
    flower_bloom_ratio: float
    fruit_ripening_pigment_ratio: float
    unripe_fruit_ratio: float
    green_leaf_index: float
    excess_green_index: float
    chlorosis_yellow_ratio: float
    necrosis_brown_ratio: float
    texture_complexity: float
    visual_stage_markers: List[str]

# --- Growth Progress & GDD ---
class GrowthProgressData(BaseModel):
    days_since_planting: int
    accumulated_gdd: float
    gdd_base_temperature: float
    expected_stage: str
    target_stage_gdd: float
    percent_towards_next_milestone: float
    estimated_days_to_next_stage: int

# --- Future Development Milestones ---
class MilestoneForecast(BaseModel):
    milestone_name: str
    target_date_range: str
    days_remaining: int
    confidence_window: str
    key_physiological_events: str

class FutureDevelopmentData(BaseModel):
    predicted_milestones: List[MilestoneForecast]
    estimated_harvest_window: str
    total_estimated_cycle_days: int
    thermal_time_forecast_notes: str

# --- Plant Health & Problem Assessment ---
class HealthSymptom(BaseModel):
    symptom_name: str
    severity: str # Normal, Low, Moderate, Severe
    affected_area: str
    visual_evidence: str
    probable_stress_source: str # Physiological, Thermal, Moisture, Nutritional, Pathological

class HealthAssessmentData(BaseModel):
    overall_health_score: int # 0 to 100
    overall_health_status: str # Optimal, Low Stress, Moderate Concern, Severe Risk
    chlorosis_risk: str
    moisture_stress_risk: str
    thermal_stress_risk: str
    wilting_risk: str
    detected_symptoms: List[HealthSymptom]
    botanical_explanation: str

# --- Environmental Telemetry Correlation ---
class EnvironmentalCorrelationData(BaseModel):
    recorded_soil_moisture: Optional[float]
    optimal_soil_moisture_range: str
    soil_moisture_evaluation: str
    recorded_temperature: Optional[float]
    optimal_temperature_range: str
    temperature_evaluation: str
    recorded_sunlight_hours: Optional[float]
    optimal_sunlight_range: str
    sunlight_evaluation: str
    correlation_synthesis: str

# --- Agronomic Precautions & Recommendations ---
class AgronomicRecommendationsData(BaseModel):
    irrigation_schedule_advice: str
    optimal_watering_time: str
    soil_nutrient_management: str
    canopy_and_microclimate_actions: str
    preventive_cultural_practices: List[str]
    non_chemical_precautions: List[str]

# --- Next Best Observation ---
class NextBestObservationData(BaseModel):
    recommended_date_range: str
    recommended_focus_area: str
    priority_developmental_transition: str
    action_guidance: str

# --- Technical & Model Metadata ---
class ModelMetadataData(BaseModel):
    model_name: str
    model_version: str
    inference_time_ms: float
    feature_dimension: int
    crop_specific_model: bool
    crop_target: str
    model_transparency_note: str
    academic_citations: List[Dict[str, str]]

# --- Full Plant Analysis Report (Sections A through I) ---
class PlantAnalysisResponse(BaseModel):
    id: str
    plant_id: str
    observation_id: Optional[str]
    user_id: Optional[str]
    analysis_timestamp: datetime
    image_url: Optional[str]
    
    # Section A: Plant Overview
    plant_overview: Dict[str, Any]
    
    # Section B: Current Stage Classification
    predicted_stage: str
    confidence_score: float
    stage_scores: Dict[str, float]
    botanical_visual_cues: BotanicalVisualCues
    
    # Section C: Growth Progress & Timeline
    growth_progress: GrowthProgressData
    
    # Section D: Future Development & Milestones
    future_development: FutureDevelopmentData
    
    # Section E: Plant Health & Problem Assessment
    health_assessment: HealthAssessmentData
    
    # Section F: Environmental Microclimate Correlation
    environmental_correlation: EnvironmentalCorrelationData
    
    # Section G: Precautions & Recommended Cultural Practices
    recommendations: AgronomicRecommendationsData
    
    # Section H: Next Recommended Actions
    next_recommended_actions: List[str]
    next_best_observation: NextBestObservationData
    
    # Section I: Technical & Model Metadata
    model_metadata: ModelMetadataData
    
    # Feedback
    user_feedback: Optional[str]
    user_notes: Optional[str]

    class Config:
        from_attributes = True


# --- Plant Problem Reporting Schemas ---
class PlantProblemCreate(BaseModel):
    category: str = Field(..., description="Stunted Growth, Leaf Yellowing, Wilting, Fruit Drop, Spotting, Pest Damage, etc.")
    description: str = Field(..., min_length=5, description="Farmer problem description")
    affected_part: Optional[str] = "Whole plant"
    onset_date: Optional[str] = None
    is_spreading: Optional[str] = "unsure"
    irrigation_notes: Optional[str] = None
    fertilizer_notes: Optional[str] = None

class ProbableCauseItem(BaseModel):
    cause: str
    likelihood: str # High, Moderate, Low
    reasoning: str
    supporting_evidence: str

class ProblemAnalysisResponse(BaseModel):
    id: str
    problem_id: str
    plant_id: str
    summary: str
    severity: str
    probable_causes: List[ProbableCauseItem]
    recommended_actions: List[str]
    precautions: List[str]
    follow_up_schedule: str
    expert_guidance: str
    icar_fao_citations: List[Dict[str, str]]
    created_at: datetime

    class Config:
        from_attributes = True

class PlantProblemResponse(BaseModel):
    id: str
    plant_id: str
    category: str
    description: str
    affected_part: str
    onset_date: Optional[str]
    is_spreading: str
    irrigation_notes: Optional[str]
    fertilizer_notes: Optional[str]
    image_path: Optional[str]
    status: str
    created_at: datetime
    analyses: List[ProblemAnalysisResponse] = []

    class Config:
        from_attributes = True


# --- Digital Twin & Growth Deviation Radar Schemas ---
class TimelineMilestone(BaseModel):
    stage: str
    expected_day: int
    expected_date: str
    observed_day: Optional[int]
    observed_date: Optional[str]
    status: str # Completed, In Progress, Pending, Delayed

class DigitalTwinResponse(BaseModel):
    plant_id: str
    plant_name: str
    crop_type: str
    crop_variety: str
    planting_date: str
    chronological_age_days: int
    expected_gdd: float
    actual_gdd: float
    expected_stage: str
    actual_stage: str
    deviation_days: int # Positive = faster/ahead, Negative = slower/delayed
    deviation_status: str # "Within Expected Range", "Faster Than Reference", "Slower Than Reference", "Potential Growth Concern", "Insufficient Data"
    deviation_explanation: str
    timeline: List[TimelineMilestone]
    radar_factors: Dict[str, Any]
    reference_gdd_curve: List[Dict[str, Any]]

# --- What-If Scenario Schemas ---
class WhatIfRequest(BaseModel):
    soil_moisture_delta_pct: Optional[float] = 0.0 # e.g. +10.0 or -10.0
    temperature_delta_c: Optional[float] = 0.0 # e.g. +2.0 or -2.0
    sunlight_delta_hours: Optional[float] = 0.0 # e.g. +1.5 or -1.5

class WhatIfResponse(BaseModel):
    plant_id: str
    current_estimated_harvest_days: int
    simulated_estimated_harvest_days: int
    harvest_shift_days: int # Negative = earlier harvest, Positive = delayed harvest
    impact_summary: str
    daily_gdd_change: float
    physiological_consequences: List[str]
    agronomic_recommendation: str
    disclaimer: str

# --- Feedback Schema ---
class AnalysisFeedbackRequest(BaseModel):
    feedback: str = Field(..., description="'accurate', 'inaccurate', or 'partial'")
    notes: Optional[str] = None

# --- Treatment & Recovery Schemas ---
class TreatmentActionResponse(BaseModel):
    id: str
    action_text: str
    action_type: str
    is_completed: bool
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RecoveryObservationResponse(BaseModel):
    id: str
    observation_date: datetime
    image_path: Optional[str] = None
    symptom_status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TreatmentPlanResponse(BaseModel):
    id: str
    plant_id: str
    user_id: Optional[str] = None
    problem_id: Optional[str] = None
    plant_name: str
    crop_type: str
    crop_variety: str
    condition_name: str
    severity: str
    problem_summary: str
    possible_cause: str
    evidence_notes: Optional[str] = None
    immediate_precautions: List[str]
    recommended_practices: List[str]
    monitoring_instructions: Optional[str] = None
    follow_up_timeline: str
    expected_improvement_signs: Optional[str] = None
    expert_assistance_guidance: Optional[str] = None
    references: List[Dict[str, str]]
    status: str
    treatment_start_date: Optional[str] = None
    actions: List[TreatmentActionResponse] = []
    recovery_observations: List[RecoveryObservationResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TreatmentActionUpdateRequest(BaseModel):
    is_completed: bool

# --- Geometric Anomaly Inspector Schemas ---
class GeometricAnalysisResponse(BaseModel):
    id: str
    plant_id: str
    observation_id: Optional[str] = None
    original_image_url: str
    processed_overlay_url: str
    mask_image_url: str
    leaf_area_px: float
    perimeter_px: float
    aspect_ratio: float
    circularity: float
    convexity: float
    asymmetry_index: float
    canopy_coverage_pct: float
    relative_area_change_pct: float
    anomaly_flags: List[str]
    anomaly_score: float
    reliability: str
    interpretation: str
    limitations_disclaimer: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Disease Dataset Gallery Schemas ---
class DiseaseDatasetItem(BaseModel):
    id: str
    title: str
    crop: str
    scientific_name: str
    causal_organism: str
    class_label: str
    description: str
    typical_symptoms: List[str]
    dataset_source: str
    source_url: str
    license: str
    image_url: str
    image_count_in_dataset: int
    is_healthy: bool

class DiseaseDatasetInferenceResponse(BaseModel):
    dataset_id: str
    crop: str
    known_dataset_label: str
    model_predicted_condition: str
    model_confidence_score: float
    agreement_status: str
    evaluation_notes: str
    botanical_indicators: Dict[str, Any]

