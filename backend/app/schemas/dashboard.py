from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.schemas.plant import PlantResponse
from app.schemas.observation import ObservationResponse

class StageCount(BaseModel):
    stage: str
    count: int

class UpcomingMilestone(BaseModel):
    plant_id: str
    plant_name: str
    milestone_name: str
    target_window_start: Optional[str] = None
    target_window_end: Optional[str] = None
    days_remaining: Optional[int] = None

class EnvironmentalSummary(BaseModel):
    average_temperature: Optional[float] = None
    average_humidity: Optional[float] = None
    average_soil_moisture: Optional[float] = None
    total_rainfall: Optional[float] = None
    average_sunlight_hours: Optional[float] = None
    observation_count: int = 0

class PlantAttentionItem(BaseModel):
    plant_id: str
    plant_name: str
    issue: str
    severity: str  # info, warning, alert
    recommendation: str

class DashboardResponse(BaseModel):
    total_plants: int
    monitored_plants: int
    stage_distribution: List[StageCount]
    upcoming_milestones: List[UpcomingMilestone]
    recent_observations: List[ObservationResponse]
    environmental_overview: EnvironmentalSummary
    plants_requiring_attention: List[PlantAttentionItem]
