from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class DateRange(BaseModel):
    start: Optional[date] = None
    end: Optional[date] = None

class ForecastResponse(BaseModel):
    id: str
    plant_id: str
    forecast_date: datetime
    current_stage: str
    method: str
    model_version: str
    observations_used_count: int
    
    flowering_window: DateRange
    fruit_formation_window: DateRange
    maturity_window: DateRange
    harvest_window: DateRange
    
    environmental_factors: Dict[str, Any]
    assumptions: List[str]
    limitations: List[str]
    recommendations: List[Dict[str, str]]
    
    is_latest: bool
    created_at: datetime

    class Config:
        from_attributes = True
