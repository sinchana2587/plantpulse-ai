from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CropAgronomyProfile(BaseModel):
    id: str
    name: str
    scientific_name: str
    family: str
    overview: str
    varieties: List[str]
    growth_stages: List[Dict[str, Any]]
    soil_requirements: Dict[str, Any]
    temperature_requirements: Dict[str, Any]
    water_requirements: Dict[str, Any]
    humidity_requirements: Dict[str, Any]
    sunlight_requirements: Dict[str, Any]
    flowering_characteristics: str
    fruit_formation_characteristics: str
    maturity_characteristics: str
    harvesting_guide: str
    common_stresses: List[Dict[str, str]]
    academic_references: List[Dict[str, str]]

class TrainingDatasetItem(BaseModel):
    id: str
    name: str
    crop_name: str
    crop_id: str
    source_name: str
    source_url: str
    license: str
    version: str
    verified_image_count: int
    growth_stage_labels: List[str]
    annotations_available: List[str]
    includes_environmental_data: bool
    collection_period: str
    download_access: str
    dataset_status: str  # "Available", "Imported", "Used for Training", "Benchmarked"
    benchmark_accuracy: Optional[str] = None
    description: str

class PlantReportRequest(BaseModel):
    plant_id: str
    date_range: Optional[str] = "all"

class PlantReportSection(BaseModel):
    title: str
    content: Dict[str, Any]

class PlantReportResponse(BaseModel):
    report_id: str
    generated_at: str
    user_name: str
    plant_id: str
    plant_name: str
    crop_type: str
    crop_variety: str
    planting_date: str
    location: Optional[str] = None
    initial_photo_url: Optional[str] = None
    total_observations: int
    current_growth_status: str
    has_sufficient_data: bool
    observation_history: List[Dict[str, Any]]
    environmental_averages: Dict[str, Any]
    temperature_trend: List[Dict[str, Any]]
    soil_moisture_trend: List[Dict[str, Any]]
    milestone_predictions: Optional[Dict[str, Any]] = None
    model_metadata: Dict[str, Any]
    limitations: List[str]
    agronomic_recommendations: List[Dict[str, str]]
