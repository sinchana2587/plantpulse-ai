from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class PlantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, example="Cherry Tomato Plant A")
    crop_type: str = Field(default="Tomato", max_length=50, example="Tomato")
    crop_variety: str = Field(default="Roma", max_length=50, example="Roma")
    planting_date: date = Field(..., example="2026-03-01")
    location: Optional[str] = Field(None, max_length=100, example="Greenhouse Bed 4")
    description: Optional[str] = Field(None, max_length=500, example="Experimental drip-irrigated plot")

class PlantCreate(PlantBase):
    pass

class PlantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    crop_type: Optional[str] = Field(None, max_length=50)
    crop_variety: Optional[str] = Field(None, max_length=50)
    planting_date: Optional[date] = None
    location: Optional[str] = None
    description: Optional[str] = None

class PlantResponse(PlantBase):
    id: str
    is_demo: bool
    created_at: datetime
    updated_at: datetime
    latest_stage: Optional[str] = None
    observation_count: int = 0
    latest_observation_date: Optional[datetime] = None
    has_forecast: bool = False

    class Config:
        from_attributes = True
