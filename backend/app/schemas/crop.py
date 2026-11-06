from typing import List, Optional
from pydantic import BaseModel, Field

class CropCatalogItem(BaseModel):
    id: str = Field(..., example="tomato")
    name: str = Field(..., example="Tomato")
    scientific_name: str = Field(..., example="Solanum lycopersicum")
    varieties: List[str] = Field(..., example=["Roma", "Cherry", "San Marzano", "Beefsteak"])
    supported_stages: List[str] = Field(default=["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"])
    has_ai_vision_model: bool = Field(..., description="Whether trained computer vision model exists")
    has_forecasting_model: bool = Field(default=True, description="Whether phenological milestone forecasting is supported")
    base_temperature_c: float = Field(default=10.0, description="Thermal base temperature in Celsius")
    cutoff_temperature_c: float = Field(default=34.0, description="Thermal upper threshold in Celsius")
    standard_maturity_days: int = Field(default=110, description="Nominal days from planting to harvest")
    optimal_moisture_min: float = Field(default=50.0)
    optimal_moisture_max: float = Field(default=65.0)
    is_active: bool = Field(default=True)
    model_status_note: str = Field(..., example="Active production vision model v1.0.0")

class CropCatalogResponse(BaseModel):
    crops: List[CropCatalogItem]
