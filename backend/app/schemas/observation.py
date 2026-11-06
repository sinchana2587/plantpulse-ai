from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class ObservationBase(BaseModel):
    observation_date: datetime = Field(default_factory=datetime.utcnow)
    temperature: Optional[float] = Field(None, ge=-20.0, le=60.0, description="Temperature in Celsius")
    humidity: Optional[float] = Field(None, ge=0.0, le=100.0, description="Relative humidity %")
    soil_moisture: Optional[float] = Field(None, ge=0.0, le=100.0, description="Soil volumetric water content %")
    sunlight_hours: Optional[float] = Field(None, ge=0.0, le=24.0, description="Sunlight exposure hours")
    rainfall: Optional[float] = Field(None, ge=0.0, le=500.0, description="Rainfall in mm")
    manual_growth_stage: Optional[str] = Field(None, max_length=50)

class ObservationCreate(ObservationBase):
    plant_id: str
    data_source: Optional[str] = Field("MANUAL_ENTRY", description="MANUAL_ENTRY, IOT_SENSOR, EXTERNAL_IMPORT")
    sensor_id: Optional[str] = None

class ObservationStageCorrection(BaseModel):
    manual_growth_stage: str = Field(..., max_length=50)

class ObservationResponse(ObservationBase):
    id: str
    plant_id: str
    plant_name: Optional[str] = None
    crop_type: Optional[str] = None
    image_path: Optional[str] = None
    ai_growth_stage: Optional[str] = None
    confidence_score: Optional[float] = None
    model_version: Optional[str] = None
    stage_scores: Optional[Dict[str, float]] = None
    effective_stage: str
    is_demo: bool
    data_source: Optional[str] = "MANUAL_ENTRY"
    created_at: datetime

    class Config:
        from_attributes = True

class PaginatedObservationResponse(BaseModel):
    items: List[ObservationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class ImageAnalysisResponse(BaseModel):
    observation_id: str
    plant_id: str
    crop_type: str = "Tomato"
    predicted_stage: str
    confidence_score: Optional[float] = None
    model_version: str
    stage_scores: Optional[Dict[str, float]] = None
    model_available: bool
    source: str
    analysis_summary: str
    known_limitations: str
